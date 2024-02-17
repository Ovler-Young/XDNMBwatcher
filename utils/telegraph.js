import { config } from "../config";
import { sendNotice } from "../notifications/telegram";
import { byteLength } from "./sync.js";
export async function telegraph(item) {
  const writer = item.writer || "ink-rss";
  const title = item.title;
  const url = item.url;
  const getNode = await fetch(`${config.PARSE_URL}/api/html2node`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({ content: item.content })
  });
  const node = await getNode.text();
  const getTelegraph = await fetch("https://api.telegra.ph/createPage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      author_name: writer,
      author_url: url,
      content: node,
      title: title,
      access_token: config.TELEGRAPH_TOKEN
    })
  });
  const telegraph = await getTelegraph.json();
  if (telegraph.ok === false) {
    return telegraph.error;
  } else {
    console.log(telegraph);
    return telegraph.result.url;
  }
}

export async function editTelegraph(item) {
  // get telegraph url if exists
  let telegraphUrl = item.telegraphUrl;
  if (
    telegraphUrl === null ||
    telegraphUrl === undefined ||
    telegraphUrl === ""
  ) {
    console.log("telegraphUrl is null");
    return await telegraph(item);
  } else {
    let path = telegraphUrl
      .split("://")[1]
      .split("/")[1]
      .split(`"`)[0];
    const getNode = await fetch(
      `https://api.telegra.ph/getPage/${path}?return_content=true`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    const nodesJson = await getNode.json();
    const oldNode = nodesJson.result.content;
    let nodeSize = byteLength(JSON.stringify(oldNode));
    console.log(`oldNode size: ${nodeSize} = ${nodeSize / 1024}KB`);
    const getNode2 = await fetch(`${config.PARSE_URL}/api/html2node`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ content: item.content })
    });
    let newNode = await getNode2.json();
    let newNodeSize = byteLength(JSON.stringify(newNode));
    console.log(`newNode size: ${newNodeSize} = ${newNodeSize / 1024}KB`);
    console.log(`total size: ${nodeSize + newNodeSize} = ${(nodeSize + newNodeSize) / 1024}KB`);
    // edit
    const writer = item.writer || "ink-rss";
    const title = item.title;
    const url = item.url;
    if (nodeSize + newNodeSize < 31 * 1024) {
      // node 和 newNode 结构是一样的，但要合并起来
      let node = oldNode.concat(newNode);
      const edit = await fetch(`https://api.telegra.ph/editPage/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          access_token: config.TELEGRAPH_TOKEN,
          path: path,
          title: title,
          content: node,
          author_name: writer,
          author_url: url
        })
      });
      const editStatus = await edit.json();
      if (editStatus.ok === false) {
        return editStatus.error;
      } else {
        return telegraphUrl
      }
    } else if (newNodeSize < 31 * 1024) {
      // get the Node of text "上一次同步 <a href=telegraphUrl>telegraphUrl</a> "
      const TextToAddNode = [
        "上一次同步：",
        {
            "tag": "a",
            "attrs": {
                "href": `${telegraphUrl}`
            },
            "children": [
                `${telegraphUrl}`
            ]
        }
      ]
      console.log(`TextToAddNode: ${TextToAddNode}`);
      let node = TextToAddNode.concat(newNode);
      let url = await sendTelegraph(node, title, writer);
      return url;
    } else {
      // split the newNode into two parts or more
      let nodes = [];
      let node = [];
      let nodeSize = 0;
      let i = 0;
      for (let n of newNode) {
        node.push(n);
        nodeSize += byteLength(JSON.stringify(n));
        if (nodeSize > 30 * 1024) {
          // remove the last element
          node.pop();
          nodeSize -= byteLength(JSON.stringify(n));
          nodes.push(node);
          console.log(`node ${i} size: ${nodeSize} = ${nodeSize / 1024}KB`);
          node = [n];
          nodeSize = byteLength(JSON.stringify(n));
          i++;
        }
      }
      nodes.push(node);
      console.log(`node ${i} size: ${nodeSize} = ${nodeSize / 1024}KB`);
      // send a new telegraph
      let message2send = `上一次同步：<a href="${telegraphUrl}">${telegraphUrl}</a>`;
      for (let n of nodes) {
        let url = await sendTelegraph(n, title, writer);
        return url;
      }
      return url
    }
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
  if (telegraph.ok === false) {
    return telegraph.error;
  } else {
    return telegraph.result.url;
  }
}