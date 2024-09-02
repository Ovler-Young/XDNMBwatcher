import { config } from "../config";
import { sendNotice } from "../notifications/telegram";
import { byteLength } from "./sync.js";

export async function editTelegraph(item) {
  const writer = item.writer || "ink-rss";
  const title = item.title;
  const url = item.url;
  let telegraphUrl = item.telegraphUrl;

  let oldContent = [];
  if (telegraphUrl && telegraphUrl.indexOf("https") !== -1) {
    const path = telegraphUrl.split("://")[1].split("/")[1].split(`"`)[0];
    const getPage = await fetch(
      `https://api.telegra.ph/getPage/${path}?return_content=true`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    const pageJson = await getPage.json();
    oldContent = pageJson.result.content || [];
  }

  const getNode = await fetch(`${config.PARSE_URL}/api/html2node`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({ content: item.content })
  });
  let newContent = await getNode.json();

  // 直接合并旧内容和新内容，不添加额外链接
  let fullContent = oldContent.concat(newContent);

  // 处理内容分割和页面创建/更新
  const result = await handleContentPagination(fullContent, title, writer, url);

  // 更新item的telegraphUrl
  await setTelegraphUrl(item, result.firstPageUrl);

  return result.lastPageUrl;
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
  if (telegraph.ok === false) {
    // if flood wait, wait the required seconds
    if (telegraph.error.code === 429) {
      await new Promise(r => setTimeout(r, telegraph.error.parameters.retry_after * 1000));
      return await sendTelegraph(node, title, writer);
    }
    return telegraph.error;
  } else {
    return telegraph.result.url;
  }
}

async function handleContentPagination(content, title, writer, url) {
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

  let previousUrl = null;
  let firstPageUrl = null;

  for (let i = 0; i < pages.length; i++) {
    let pageContent = pages[i];

    // 添加页面导航链接
    if (previousUrl) {
      pageContent.unshift({
        tag: "p",
        children: [
          "上一页：",
          {
            tag: "a",
            attrs: { href: previousUrl },
            children: [previousUrl]
          }
        ]
      });
    }

    const pageUrl = await sendTelegraph(pageContent, `${title} (${i + 1}/${pages.length})`, writer);

    if (!firstPageUrl) {
      firstPageUrl = pageUrl;
    }

    // 更新上一页的"下一页"链接
    if (previousUrl) {
      const prevPath = previousUrl.split("://")[1].split("/")[1];
      await updateTelegraphPage(prevPath, pages[i - 1], `${title} (${i}/${pages.length})`, writer, url, pageUrl);
    }

    previousUrl = pageUrl;
  }

  return { firstPageUrl, lastPageUrl: previousUrl };
}

async function updateTelegraphPage(path, content, title, author_name, author_url, nextPageUrl) {
  if (nextPageUrl) {
    content.push({
      tag: "p",
      children: [
        "下一页：",
        {
          tag: "a",
          attrs: { href: nextPageUrl },
          children: [nextPageUrl]
        }
      ]
    });
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
      content: content,
      author_name: author_name,
      author_url: author_url
    })
  });

  // if flood wait, wait the required seconds
  if (edit.status === 429) {
    await new Promise(r => setTimeout(r, edit.error.parameters.retry_after * 1000));
    return await updateTelegraphPage(path, content, title, author_name, author_url, nextPage
    );
  }
  return await edit.json();
}