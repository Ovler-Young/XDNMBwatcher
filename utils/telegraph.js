import { config } from "../config";
import { sendNotice } from "../notifications/telegram";
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
    try {
      // get index in sub
      let sub = JSON.parse(await KV.get("sub"));
      let index = sub.findIndex(e => e.id === item.id);
      sub[index].telegraphUrl = telegraph.result.url;
      await KV.put("sub", JSON.stringify(sub));
    } catch (err) {
      console.log(err);
      return `<a href="${telegraph.result.url}">Tg</a> | Error ${err.message} \n ${err.stack}`;
    }
    return `<a href="${telegraph.result.url}">Tg</a>`;
  }
}

export async function editTelegraph(item) {
  // get telegraph url if exists
  let telegraphUrl = item.telegraphUrl;
  console.log(telegraphUrl);
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
    const getNode2 = await fetch(`${config.PARSE_URL}/api/html2node`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ content: item.content })
    });
    const newNode = await getNode2.json();
    // node 和 newNode 结构是一样的，但要合并起来
    let node = oldNode.concat(newNode);
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
    const editStatus = await edit.json();
    if (editStatus.ok === false) {
      if (editStatus.error === "CONTENT_TOO_BIG") {
        let editOld = item;
        await setTelegraphUrl(item, null);
        console.log("CONTENT_TOO_BIG. set telegraphUrl to null");
        //let sendStatus = sendNotice(`#${item.id} ${item.title} 的内容太大，旧url为${telegraphUrl}`);
        //console.log(`sendNotice with message: #${item.id} ${item.title} 的内容太大，旧url为${telegraphUrl}, status: ${sendStatus}`);
        console.log(`telegraphUrl: ${telegraphUrl}`);
        let TextToAdd = `上一次同步：<a href="${telegraphUrl}">${telegraphUrl}</a>`;
        item.content = TextToAdd + item.content;
        let newTelegraph = await telegraph(item);
        telegraphUrl = newTelegraph.split(`"`)[1].split(`"`)[0];
        editOld.content = `\n\n本次未结束同步。下一页：<a href="${telegraphUrl}">${telegraphUrl}</a>`;
        await editTelegraph(editOld);
        return `${newTelegraph}`;
      }
      return editStatus.error;
    } else {
      return `<a href="${telegraphUrl}">Tg</a>`;
    }
  }
}

export async function setTelegraphUrl(item, url) {
  let sub = JSON.parse(await KV.get("sub"));
  let index = sub.findIndex(e => e.id === item.id);
  sub[index].telegraphUrl = url;
  await KV.put("sub", JSON.stringify(sub));
}
