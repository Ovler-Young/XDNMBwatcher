import { config } from "../config";
import { sendNotice } from "../notifications/telegram";
export async function telegraph(item) {
  const writer = item.writer || "ink-rss";
  const title = item.title;
  const url = item.url;
  const getnode = await fetch(`${config.PARSE_URL}/api/html2node`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({ content: item.content })
  });
  const node = await getnode.text();
  const gettelegraph = await fetch("https://api.telegra.ph/createPage", {
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
  const telegraph = await gettelegraph.json();
  if (telegraph.ok === false) {
    return telegraph.error;
  } else {
    console.log(telegraph)
    try {
      let telegraphurl = await KV.get(`telegraph-${item.id}`);
      if (telegraphurl === null && telegraph.result.url !== undefined) {
        await KV.put(`telegraph-${item.id}`, telegraph.result.url);
      }
    }
    catch (err) {
      console.log(err);
      return `<a href="${telegraph.result.url}">Tg</a> | Error ${err.message}`;
    }
    return `<a href="${telegraph.result.url}">Tg</a>`;
  }
}

export async function edittelegraph(item) {
  // get telegraph url if exists
  let telegraphurl = await KV.get(`telegraph-${item.id}`);
  console.log(telegraphurl);
  if (telegraphurl === null) {
    console.log("telegraphurl is null");
    return await telegraph(item);
  } else {
    let path = telegraphurl.split("://")[1].split("/")[1];
    const getnode = await fetch(`https://api.telegra.ph/getPage/${path}?return_content=true`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    const nodesjson = await getnode.json();
    const oldnode = nodesjson.result.content;
    const getnode2 = await fetch(`${config.PARSE_URL}/api/html2node`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ content: item.content })
    });
    const newnode = await getnode2.json();
    // node 和 newnode 结构是一样的，但要合并起来
    const node = oldnode.concat(newnode);
    console.log(node);
    // edit 
    const writer = item.writer || "ink-rss";
    const title = item.title;
    const url = item.url;
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
    const editstatus = await edit.json();
    if (editstatus.ok === false) {
      if (editstatus.error === "CONTENT_TOO_BIG") {
        await KV.delete(`telegraph-${item.id}`);
        let newtelegraph = await telegraph(item);
        return `<a href="${newtelegraph}">NewTg</a> | <a href="${telegraphurl}">OldTg</a>`;
      }
      return editstatus.error;
    } else {
      return `<a href="${telegraphurl}">Tg</a>`;
    }
  }
}