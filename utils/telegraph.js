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
    let telegraphUrl = item.telegraphUrl;

    let oldContent = [];
    let previousPageUrl = null;
    let totalPages = 0;

    if (telegraphUrl && telegraphUrl.indexOf("https") !== -1) {
      const path = telegraphUrl.split("://")[1].split("/")[1].split(`"`)[0];
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
        const lastNode = oldContent[oldContent.length - 1];
        if (lastNode && lastNode.tag === "p" && lastNode.children) {
          previousPageUrl = lastNode.children[0].attrs.href;
          oldContent.pop(); // Remove the last navigation link
        }
        const titleMatch = pageJson.result.title.match(/\((\d+)\/(\d+)\)/);
        if (titleMatch) {
          totalPages = parseInt(titleMatch[2], 10);
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

    const result = await handleContentPagination(fullContent, title, writer, url, totalPages, previousPageUrl);

    await setTelegraphUrl(item, result.firstPageUrl);

    return result.lastPageUrl;
  } catch (error) {
    console.error("Error in editTelegraph:", error);
    await sendNotice(`Error in editTelegraph: ${error.message}`);
    throw error;
  }
}

export async function setTelegraphUrl(item, url) {
  let sub = JSON.parse(await KV.get("sub"));
  let index = sub.findIndex(e => e.id === item.id);
  sub[index].telegraphUrl = url;
  await KV.put("sub", JSON.stringify(sub));
}

export async function sendTelegraph(node, title, writer) {
  const getTelegraph = await fetch("https://api.telegra.ph/createPage", {
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
  if (edit.ok === false ) {
    if (typeof edit.error === 'object' && "FLOOD_WAIT" in edit.error) {
      await new Promise(r => setTimeout(r, parseInt(edit.error.FLOOD_WAIT) * 1000));
      return await updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl);
    } else if (typeof edit.error === 'number') {
      await new Promise(r => setTimeout(r, edit.error * 1000));
      return await updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl);
    } else {
      // 处理其他类型的 edit.error 或抛出错误
      console.error("Unexpected error:", edit.error);
    }
  } else {
    return telegraph.result.url;
  }
}

async function handleContentPagination(content, title, writer, url, totalPages = 0, previousPageUrl = null) {
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

  let firstPageUrl = null;
  let pageUrls = [];

  // 首先创建所有页面，并存储它们的 URL
  for (let i = 0; i < pages.length; i++) {
    const pageTitle = `${title} (${totalPages + i + 1}/${totalPages + pages.length})`;
    const pageUrl = await sendTelegraph(pages[i], pageTitle, writer);
    pageUrls.push(pageUrl);
    if (!firstPageUrl) {
      firstPageUrl = pageUrl;
    }
  }

  // 然后更新所有页面，添加正确的导航链接
  for (let i = 0; i < pageUrls.length; i++) {
    const prevUrl = i > 0 ? pageUrls[i - 1] : previousPageUrl;
    const nextUrl = i < pageUrls.length - 1 ? pageUrls[i + 1] : null;
    const path = pageUrls[i].split("://")[1].split("/")[1];

    await updateTelegraphPage(
      path,
      pages[i],
      `${title} (${totalPages + i + 1}/${totalPages + pages.length})`,
      writer,
      url,
      prevUrl,
      nextUrl
    );
  }

  return { firstPageUrl, lastPageUrl: pageUrls[pageUrls.length - 1] };
}

function createNavigationLinks(prevUrl, nextUrl) {
  let links = [];
  if (prevUrl) {
    links.push({
      tag: "a",
      attrs: { href: prevUrl },
      children: ["上一页 "]
    });
  }
  if (nextUrl) {
    links.push({
      tag: "a",
      attrs: { href: nextUrl },
      children: ["下一页 "]
    });
  }
  return links.length > 0 ? { tag: "p", children: links } : null;
}

async function updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl) {
  const navigationLinks = createNavigationLinks(prevUrl, nextUrl);
  let updatedContent = [];

  if (navigationLinks) {
    updatedContent.push(navigationLinks); // 顶部导航链接
  }

  updatedContent = updatedContent.concat(content);

  if (navigationLinks) {
    updatedContent.push(navigationLinks); // 底部导航链接
  }

  const edit = await fetch(`https://api.telegra.ph/editPage/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      access_token: config.TELEGRAPH_TOKEN,
      path: path,
      title: title,
      content: updatedContent,
      author_name: author_name,
      author_url: author_url
    })
  });

  // if flood wait, wait the required seconds
  // {"ok":false,"error":"FLOOD_WAIT_3"}
  if (edit.ok === false ) {
    if (typeof edit.error === 'object' && "FLOOD_WAIT" in edit.error) {
      await new Promise(r => setTimeout(r, parseInt(edit.error.FLOOD_WAIT) * 1000));
      return await updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl);
    } else if (typeof edit.error === 'number') {
      await new Promise(r => setTimeout(r, edit.error * 1000));
      return await updateTelegraphPage(path, content, title, author_name, author_url, prevUrl, nextUrl);
    } else {
      // 处理其他类型的 edit.error 或抛出错误
      console.error("Unexpected error:", edit.error);
    }
  }
  return await edit.json();
}
