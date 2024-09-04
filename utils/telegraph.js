import { config } from "../config";
import { sendNotice } from "../notifications/telegram";
import { byteLength } from "./sync.js";

async function fetchWithRetry(url, options, maxRetries = 3, timeout = 10000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 指数退避
    }
  }
  throw lastError;
}

export async function editTelegraph(item) {
  try {
    const writer = item.writer || "ink-rss";
    const title = item.title;
    const url = item.url;
    let nMinus1PageUrl = item.telegraphUrl;

    let oldContent = [];
    let nMinus2PageUrl = null;
    let currentMaxPage = 1;

    if (nMinus1PageUrl && nMinus1PageUrl.indexOf("https") !== -1) {
      const path = nMinus1PageUrl.split("://")[1].split("/")[1].split(`"`)[0];
      const getPage = await fetchWithRetry(
        `https://api.telegra.ph/getPage/${path}?return_content=true`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
      const pageText = await getPage.text();
      try {
        const pageJson = JSON.parse(pageText);
        oldContent = pageJson.result.content || [];
        // 获取上一页链接
        const firstNode = oldContent[0];
        if (firstNode && firstNode.tag === "p" && firstNode.children) {
          nMinus2PageUrl = firstNode.children[0].attrs.href;
          if ("上一页 " === firstNode.children[0].children[0]) {
            oldContent.shift();
            console.log("Removed top navigation link:", nMinus2PageUrl);
          }

          // search for the last navigation link
          const lastNode = oldContent[oldContent.length - 1];
          if (lastNode && lastNode.tag === "p" && lastNode.children) {
            const lastLink = lastNode.children[lastNode.children.length - 1];
            if (lastLink.tag === "a" && lastLink.children && "下一页 " === lastLink.children[0]) {
              oldContent.pop();
              console.log("Removed bottom navigation link:", lastLink.attrs.href);
            }
          }
        }
        const titleMatch = pageJson.result.title.match(/\((\d+)\/(\d+)\)/);
        if (titleMatch) {
          currentMaxPage = parseInt(titleMatch[2], 10);
        }
      } catch (error) {
        console.error("Failed to parse Telegraph API response:", pageText);
        throw new Error("Invalid JSON response from Telegraph API");
      }
    }

    const getNode = await fetchWithRetry(`${config.PARSE_URL}/api/html2node`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ content: item.content })
    });
    const nodeText = await getNode.text();
    let newContent;
    try {
      newContent = JSON.parse(nodeText);
    } catch (error) {
      console.error("Failed to parse html2node API response:", nodeText);
      throw new Error("Invalid JSON response from html2node API");
    }

    let fullContent = oldContent.concat(newContent);

    /////以上没问题

    const result = await handleContentPagination(fullContent, title, writer, url, currentMaxPage, nMinus1PageUrl, nMinus2PageUrl);

    // 更新原有最后一页的内容和导航链接
    if (nMinus1PageUrl && nMinus1PageUrl.indexOf("https") !== -1) {
      console.log("Updating last page:", nMinus1PageUrl);
      const oldPath = nMinus1PageUrl.split("://")[1].split("/")[1].split(`"`)[0];
      await updateTelegraphPage(
        oldPath,
        result.pages[0],
        `${title} (${currentMaxPage}/${result.newcurrentMaxPage})`,
        writer,
        url,
        nMinus2PageUrl,
        result.firstPageUrl,
        currentMaxPage === 1,
        false
      );
    }

    await setnMinus1PageUrl(item, result.lastPageUrl);

    return result.lastPageUrl;
  } catch (error) {
    console.error("Error in editTelegraph:", error);
    await sendNotice(`Error in editTelegraph: ${error.message}`);
    throw error;
  }
}

export async function setnMinus1PageUrl(item, url) {
  let sub = JSON.parse(await KV.get("sub"));
  let index = sub.findIndex(e => e.id === item.id);
  sub[index].nMinus1PageUrl = url;
  await KV.put("sub", JSON.stringify(sub));
}

export async function sendTelegraph(node, title, writer) {
  const getTelegraph = await fetch("https://api.telegra.ph/createPage?return_content=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      author_name: writer,
      content: node,
      title: title,
      access_token: config.TELEGRAPH_TOKEN
    })
  });
  const telegraph = await getTelegraph.json();
  if (telegraph.ok === false ) {
    if (typeof telegraph.error === 'object' && "FLOOD_WAIT" in telegraph.error) {
      await new Promise(r => setTimeout(r, parseInt(telegraph.error.FLOOD_WAIT) * 1000));
      return await updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl);
    } else if (typeof telegraph.error === 'number') {
      await new Promise(r => setTimeout(r, telegraph.error * 1000));
      return await updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl);
    } else {
      // 处理其他类型的 telegraph.error 或抛出错误
      console.error("Unexpected error:", telegraph.error);
    }
  } else {
    return telegraph.result.url;
  }
}

async function handleContentPagination(content, title, writer, url, currentMaxPage = 1, nMinus1PageUrl = null, nMinus2PageUrl = null) {
  const maxSize = 30 * 1024; // 30KB
  let pages = [];
  let currentPage = [];
  let currentSize = 0;

  for (let node of content) {
    const nodeSize = byteLength(JSON.stringify(node));
    if (currentSize + nodeSize > maxSize) {
      pages.push(currentPage);
      currentPage = [node];
      currentSize = nodeSize;
    } else {
      currentPage.push(node);
      currentSize += nodeSize;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  const newcurrentMaxPage = currentMaxPage + pages.length - 1;

  let firstPageUrl = nMinus1PageUrl;
  let pageUrls = [];

  // 从currentMaxPage开始编号新页面
  for (let i = 0; i < pages.length; i++) { // 从n-1，n，n+1...开始编号
    if (i === 0 && nMinus1PageUrl) {
      pageUrls.push(nMinus1PageUrl);
      continue;
    }
    const pageNumber = currentMaxPage + i;
    const pageTitle = `${title} (${pageNumber}/${newcurrentMaxPage})`;
    const pageUrl = await sendTelegraph(pages[i], pageTitle, writer);
    pageUrls.push(pageUrl);
    if (!firstPageUrl) {
      firstPageUrl = pageUrl;
    }
  }

  for (let i = 0; i < pageUrls.length; i++) {
    const prevUrl = i > 0 ? pageUrls[i - 1] : nMinus2PageUrl;
    const nextUrl = i < pageUrls.length - 1 ? pageUrls[i + 1] : null;
    const path = pageUrls[i].split("://")[1].split("/")[1];

    await updateTelegraphPage(
      path,
      pages[i],
      `${title} (${currentMaxPage + i}/${newcurrentMaxPage})`,
      writer,
      url,
      prevUrl,
      nextUrl,
      i === 0 && currentMaxPage === 0,
      i === pageUrls.length - 1
    );
  }

  return { firstPageUrl, lastPageUrl: pageUrls[pageUrls.length - 1], newcurrentMaxPage, pages };
}

function createNavigationLinks(prevUrl, nextUrl, isFirstPage, isLastPage) {
  let links = [];
  if (prevUrl && !isFirstPage) {
    links.push({
      tag: "a",
      attrs: { href: prevUrl },
      children: ["上一页 "]
    });
  }
  if (nextUrl && !isLastPage) {
    links.push({
      tag: "a",
      attrs: { href: nextUrl },
      children: ["下一页 "]
    });
  }
  return links.length > 0 ? { tag: "p", children: links } : null;
}

async function updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl, isFirstPage, isLastPage) {
  const navigationLinks = createNavigationLinks(prevUrl, nextUrl, isFirstPage, isLastPage);
  let updatedContent = [];

  if (navigationLinks) {
    updatedContent.push(navigationLinks); // 顶部导航链接
  }

  updatedContent = updatedContent.concat(content);

  if (navigationLinks) {
    updatedContent.push(navigationLinks); // 底部导航链接
  }

  return await editTelegraphPageRaw(path, updatedContent, title, author_name, author_url);
}

async function editTelegraphPageRaw(path, content, title, author_name, author_url) {
  const edit = await fetch(`https://api.telegra.ph/editPage/${path}?return_content=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      access_token: config.TELEGRAPH_TOKEN,
      path: path,
      title: title,
      content: content,
      author_name: author_name,
      author_url: author_url
    })
  });

  if (edit.ok === false ) {
    if (typeof edit.error === 'object' && "FLOOD_WAIT" in edit.error) {
      await new Promise(r => setTimeout(r, parseInt(edit.error.FLOOD_WAIT) * 1000));
      return await editTelegraphPageRaw(path, content, title, author_name, author_url);
    } else if (typeof edit.error === 'number') {
      await new Promise(r => setTimeout(r, edit.error * 1000));
      return await editTelegraphPageRaw(path, content, title, author_name, author_url);
    } else {
      // 处理其他类型的 edit.error 或抛出错误
      console.error("Unexpected error:", edit.error);
    }
  }
  return await edit.json();
}