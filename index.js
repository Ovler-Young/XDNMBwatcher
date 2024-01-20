import { Router } from "itty-router";
import {
  getAssetFromKV,
  mapRequestToAsset
} from "@cloudflare/kv-asset-handler";
import { handleScheduled } from "./schedule";
import { config, mode } from "./config";
import { setTgBot } from "./bot";
import { GetID, Subscribe, Unsubscribe, MarkAsRead } from "./utils/functions";
const secret_path = config.SECRET_PATH;
const router = Router();
if (mode === "telegram") {
  setTgBot(router);
}
import { cFetch, errorResponse, successResponse } from "./utils/util";
import { syncToTelegraph } from "./utils/sync";

const refreshUnread = async index => {
  const res = await cFetch(`https://api.nmb.best/Api/thread?id=${id}`);
  sub[index].LastRead = (await res.json()).ReplyCount;
  await KV.put("sub", JSON.stringify(sub));
};

const errorHandler = error =>
  new Response(error.message || "Server Error", {
    status: error.status || 200
  });
router.get("/", async () => {
  return new Response("Only the wise can see this page", { status: 200 });
});
router.get(`/${secret_path}`, async (req, e) => {
  const data = await KV.get("sub");
  if (!data) {
    await KV.put("sub", "[]");
  }
  return await getAssetFromKV(e, {
    mapRequestToAsset: req => {
      let defaultAssetKey = mapRequestToAsset(req);
      let url = new URL(defaultAssetKey.url);
      url.pathname = url.pathname.replace(secret_path, "/");
      return new Request(url.toString(), defaultAssetKey);
    }
  });
});
router.get(`/${secret_path}/feeds`, async () => {
  // 获取订阅列表
  const raw = await KV.get("sub");
  // sort feed by unread if is not undefined or 0, otherwise sort by lastUpdateTime, and then by id
  const sub = JSON.parse(raw).sort((a, b) => {
    let aTime = parseInt(
      a.lastUpdateTime.substring(0, 4) +
        a.lastUpdateTime.substring(5, 7) +
        a.lastUpdateTime.substring(8, 10) +
        a.lastUpdateTime.substring(13, 15) +
        a.lastUpdateTime.substring(16, 18) +
        a.lastUpdateTime.substring(19, 21)
    );
    let bTime = parseInt(
      b.lastUpdateTime.substring(0, 4) +
        b.lastUpdateTime.substring(5, 7) +
        b.lastUpdateTime.substring(8, 10) +
        b.lastUpdateTime.substring(13, 15) +
        b.lastUpdateTime.substring(16, 18) +
        b.lastUpdateTime.substring(19, 21)
    );
    return aTime === bTime ? a.id - b.id : bTime - aTime;
  });
  return new Response(JSON.stringify(sub), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, HEAD",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
});
router.post(`/${secret_path}/subitem`, async req => {
  let { getid, id } = await GetID(req);
  if (getid === false) {return errorResponse(id);}
  let { success, msg } = await Subscribe(id);
  return success ? successResponse(msg) : errorResponse(msg);
});
router.post(`/${secret_path}/deleteitem`, async req => {
  // 删除订阅
  let { getid, id } = await GetID(req);
  if (getid === false) {return errorResponse(id);}
  let { success, msg } = await Unsubscribe(id);
  return success ? successResponse(msg) : errorResponse(msg);
});
router.post(`/${secret_path}/active`, async req => {
  // 激活/禁用订阅
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  const body = await req.json();
  const url = body.url || "";
  const state = body.state;
  const index = sub.findIndex(e => e.url === url);
  if (index === -1 || state === undefined) {
    return errorResponse("Please verify your input!");
  }
  sub[index].active = state;
  sub[index].lastUpdateTime = new Date();
  sub[index].errorTimes = 0;
  await KV.put("sub", JSON.stringify(sub));
  return successResponse(`修改成功，当前状态为 ${state ? "on" : "off"}`);
});
router.post(`/${secret_path}/telegraph`, async req => {
  // 激活/禁用 Telegraph
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  const body = await req.json();
  const url = body.url || "";
  const state = body.state;
  const index = sub.findIndex(e => e.url === url);
  if (index === -1 || state === undefined) {
    return errorResponse("Please verify your input!");
  }
  sub[index].telegraph = state;
  await KV.put("sub", JSON.stringify(sub));
  return successResponse(
    `修改成功，当前 Telegraph 状态为 ${state ? "on" : "off"}`
  );
});
router.post(`/${secret_path}/title`, async req => {
  // 修改订阅标题
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  const body = await req.json();
  const url = body.url || "";
  const title = body.title;
  const index = sub.findIndex(e => e.url === url);
  if (index === -1 || title === undefined) {
    return errorResponse("Please verify your input!");
  }
  sub[index].title = title;
  await KV.put("sub", JSON.stringify(sub));
  return successResponse(`修改成功，当前该订阅源标题为 ${title}`);
});
router.post(`/${secret_path}/unread`, async req => {
  // 修改订阅未读数
  let { getid, id } = await GetID(req);
  if (getid === false) {return errorResponse(id);}
  let { success, msg } = await MarkAsRead(id);
  return success ? successResponse(msg) : errorResponse(msg);
});
router.get(`/${secret_path}/jumpread`, async req => {
  // 通过search里的id跳转到指定帖子
  const id = req.url.split("?id=")[1];
  if (id === undefined) {
    return errorResponse("Please verify your input!");
  }
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  const index = sub.findIndex(e => e.id === id);
  if (index === -1) {
    return errorResponse("id not found. Did you subscribe this thread?");
  }
  sub[index].unread = 0;
  if (sub[index].LastRead === undefined) {
    sub[index].LastRead = sub[index].ReplyCount;
  }
  let lastreadto = sub[index].LastRead;
  console.log(lastreadto);
  sub[index].LastRead = sub[index].ReplyCount;
  sub[index].telegraphUrl = null;
  await KV.put("sub", JSON.stringify(sub));
  // if ua is mobile, jump to app
  if (req.headers.get("user-agent").includes("Mobile")) {
    let page = Math.floor((lastreadto - 1) / 9) + 1;
    console.log(page);
    console.log("mobile");
    return Response.redirect(
      `https://www.nmbxd1.com/m/t/${id}?page=${page}`,
      307
    );
  }
  let page = Math.floor((lastreadto - 1) / 19) + 1;
  console.log(page);
  console.log("pc");
  return Response.redirect(`https://www.nmbxd1.com/t/${id}?page=${page}`, 307);
});
router.get(`/${secret_path}/jumplast`, async req => {
  const id = req.url.split("?id=")[1];
  if (id === undefined) {
    return errorResponse("Please verify your input!");
  }
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  const index = sub.findIndex(e => e.id === id);
  if (index === -1) {
    return errorResponse("Please verify your input!");
  }
  sub[index].unread = 0;
  sub[index].LastRead = sub[index].ReplyCount;
  sub[index].telegraphUrl = null;
  await KV.put("sub", JSON.stringify(sub));
  let lastreadto = sub[index].LastRead;
  // if ua is mobile, jump to app
  if (req.headers.get("user-agent").includes("Mobile")) {
    let page = Math.floor((lastreadto - 1) / 9) + 1;
    console.log(page);
    console.log("mobile");
    return Response.redirect(
      `https://www.nmbxd1.com/m/t/${id}?page=${page}`,
      307
    );
  }
  let page = Math.floor((lastreadto - 1) / 19) + 1;
  console.log(page);
  console.log("pc");
  return Response.redirect(`https://www.nmbxd1.com/t/${id}?page=${page}`, 307);
});
router.get(`/${secret_path}/subscribe`, async req => {
  const uuid = req.url.split("?uuid=")[1];
  if (uuid === undefined) {
    return errorResponse("Please verify your input!");
  }
  await KV.put("uuid", uuid);

  let page = 1;
  let count = 0;
  let SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);

  while (true) {
    // Start of loop for multiple pages
    const res = await fetch(
      `https://api.nmb.best/Api/feed?uuid=${uuid}&page=${page}`
    );
    let feed = await res.json();
    // Break the loop if the feed is empty
    if (feed.length === 0) {
      break;
    }
    for (let i = 0; i < feed.length; i++) {
      if (feed[i].id in sub.map(e => e.id)) {
        continue;
      }
      let item = {};
      item.id = feed[i].id;
      item.url = `https://www.nmbxd1.com/t/${feed[i].id}`;
      item.po = feed[i].user_hash;
      item.title = feed[i].title;
      item.telegraph = true;
      item.active = true;
      item.errorTimes = 0;
      item.ReplyCount = feed[i].reply_count;
      item.fid = feed[i].fid;
      item.SendTo = config.TG_SENDID;
      item.lastUpdateTime = feed[i].now;
      item.xd = true;
      item.IsSingle = true;
      item.unread = 0;
      item.send_message_id = null;
      item.LastRead = feed[i].reply_count;
      sub.push(item);
      count++;
    }
    if (feed.length < 10) {
      break;
    }
    page++; // Increase the page number for the next iteration
  } // End of loop for multiple pages
  await KV.put("sub", JSON.stringify(sub)); // Save the updated sub array
  return successResponse(`${count} new feeds added`);
});
router.get(`/${secret_path}/stg`, async req => {
  const id = req.url.split("?id=")[1];
  if (id === undefined) {
    return errorResponse("Please verify your input!");
  }
  const telegraph = await syncToTelegraph(id);
  return successResponse(telegraph);
});
router.get("/test", async (req, e) => {
  // 测试
  e.waitUntil(handleScheduled(e));
});
router.get("/forcetest", async (req, e) => {
  // 强制测试
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  let indexs = [];
  for (let i = 0; i < sub.length; i++) {
    if (sub[i].active === true) {
      indexs.push(i);
    }
  }
  let index = null;
  for (let i = 0; i < 5; i++) {
    index = indexs[indexs.length - 1 - i];
    sub[index].ReplyCount -= 5;
    sub[index].recent_replies = '[]'
  }
  await KV.put("sub", JSON.stringify(sub));
  return successResponse("已强制测试");
});
router.get("/fixerror", async (req, e) => {
  // 修复错误
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  console.log(sub);
  // 如果active为false，删除
  for (let i = 0; i < sub.length; i++) {
    if (sub[i].active === false) {
      sub.splice(i, 1);
      i--;
    }
  }
  // 重复id只保留一个，保留该项目子元素最多的那个
  let id = [];
  for (let i = 0; i < sub.length; i++) {
    if (id.indexOf(sub[i].id) === -1) {
      id.push(sub[i].id);
    }
  }
  console.log(id);
  let newsub = [];
  for (let i = 0; i < id.length; i++) {
    let max = 0;
    let index = 0;
    for (let j = 0; j < sub.length; j++) {
      if (sub[j].id === id[i]) {
        if (sub[j].ReplyCount > max) {
          max = sub[j].ReplyCount;
          index = j;
        }
      }
    }
    newsub.push(sub[index]);
  }
  console.log(newsub);
  sub = newsub;
  for (let i = 0; i < sub.length; i++) {
    // 临时
    if (typeof sub[i].id === "number") {
      sub[i].id = sub[i].id.toString();
    }
    // deal with url
    if (sub[i].url === undefined) {
      sub[i].url = `https://www.nmbxd1.com/t/${sub[i].id}`;
    }
  }
  console.log(sub);
  // 尝试获取 await KV.get(`telegraph-${item.id}`); 再将值放入telegraphUrl
  for (let i = 0; i < sub.length; i++) {
    let telegraphUrl = await KV.get(`telegraph-${sub[i].id}`);
    if (telegraphUrl !== null) {
      sub[i].telegraphUrl = telegraphUrl;
      await KV.delete(`telegraph-${sub[i].id}`);
    }
  }
  console.log(sub);
  await KV.put("sub", JSON.stringify(sub));
  return new Response(
    JSON.stringify({
      status: 200,
      message: sub
    }),
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, HEAD",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    }
  );
});
router.get("/sync", async (req, e) => {
  // 同步
  const SubRaw = await KV.get("sub");
  const uuid = await KV.get("uuid");
  let r = 0;
  let page = 1;
  let got = 0;
  let push = 0;
  let feedid = [];
  let sub = JSON.parse(SubRaw);
  while (true) {
    const res = await cFetch(
      `https://api.nmb.best/Api/feed?uuid=${uuid}&page=${page}`
    );
    r++;
    let feed = await res.json();
    if (feed.length === 0) {
      break;
    }
    for (let i = 0; i < feed.length; i++) {
      feedid.push(feed[i].id);
      // find the index of the feed in sub
      let index = sub.findIndex(e => e.id === feed[i].id);
      if (index === -1) {
        // not found
        console.log("未找到" + feed[i].id);
        let item = {};
        item.id = feed[i].id;
        item.url = `https://www.nmbxd1.com/t/${feed[i].id}`;
        item.po = feed[i].user_hash;
        item.title =
          feed[i].title || feed[i].content.split("<br />")[0].substring(0, 20);
        item.telegraph = true;
        item.active = true;
        item.errorTimes = 0;
        item.ReplyCount = feed[i].reply_count;
        item.fid = feed[i].fid;
        item.SendTo = config.TG_SENDID;
        item.lastUpdateTime = feed[i].now;
        item.xd = true;
        item.IsSingle = true;
        item.unread = 0;
        item.send_message_id = null;
        item.LastRead = feed[i].reply_count;
        sub.push(item);
        got++;
      } else if (sub[index].title == "") {
        sub[index].title = feed[i].content.split("<br />")[0].substring(0, 20);
        got++;
      } else if (sub[index].recent_replies === undefined) {
        sub[index].recent_replies = feed[i].recent_replies;
      }
    }
    if (r >= 48) {
      return errorResponse(
        "同步失败，是不是订阅太多了？上限是48页哦，不用的记得清~~"
      );
      break;
    }
    page++;
  }
  // log the feedid and its length
  console.log("length of feedid: " + feedid.length + "\n" + feedid);
  // log the sub and its length
  console.log("length of sub: " + sub.length + "\n" + sub.map(e => e.id));
  await KV.put("sub", JSON.stringify(sub));
  for (let i = 0; i < sub.length; i++) {
    if (r >= 48) {
      return successResponse(
        `同步成功，共获取到${got}个新串，推送${push}个新串`
      );
    }
    if (feedid.indexOf(sub[i].id) === -1) {
      // add to feed
      const res = await fetch(
        `https://api.nmb.best/Api/addFeed?uuid=${uuid}&tid=${sub[i].id}`
      );
      const addFeedresText = await res.json();
      if (addFeedresText === "该串不存在") {
        console.log("该串不存在");
        // remove the feed from sub
        sub.splice(i, 1);
        i--;
        KV.put("sub", JSON.stringify(sub));
        r++;
      } else if (addFeedresText === "订阅大成功→_→") {
        push++;
      } else {
        // error
        // return the error message
        console.log(addFeedresText);
      }
      r++;
    }
  }
  return successResponse(`同步成功，共获取到${got}个新串，推送${push}个新串`);
});
router.get("/removelongunupdaye", async (req, e) => {
  // 删除长时间未更新的订阅
  const { sendNotice } = require(`./notifications/${mode}`);
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  // 重复id只保留一个，保留该项目子元素最多的那个
  let id = [];
  for (let i = 0; i < sub.length; i++) {
    if (id.indexOf(sub[i].id) === -1) {
      id.push(sub[i].id);
    }
  }
  let newsub = [];
  for (let i = 0; i < id.length; i++) {
    let max = 0;
    let index = 0;
    for (let j = 0; j < sub.length; j++) {
      if (sub[j].id === id[i]) {
        if (sub[j].ReplyCount > max) {
          max = sub[j].ReplyCount;
          index = j;
        }
      }
    }
    newsub.push(sub[index]);
  }
  sub = newsub;
  let removed = 0;
  let recent_replies = [];
  let last_reply = 99999999;
  const uuid = await KV.get("uuid");
  let reqcount = 0;
  for (let i = 0; i < sub.length; i++) {
    // get recent_replies
    if (sub[i].recent_replies === undefined) {
      console.log("id: " + sub[i].id + " recent_replies undefined");
      continue;
    }
    recent_replies = sub[i].recent_replies
      .toString()
      .split("[")[1]
      .split("]")[0]
      .split(",")
      .map(item => parseInt(item))
      .reverse();
    last_reply = recent_replies[0] || 99999999;
    if (last_reply <= 56515865) {
      // 2023-03-30 00:00:00
      // too old, remove
      console.log("remove " + sub[i].id);
      const delFeedres = await fetch(
        `https://api.nmb.best/Api/delFeed?uuid=${uuid}&tid=${sub[i].id}`
      );
      // decode the response
      const delFeedresText = await delFeedres.json();
      reqcount++;
      console.log(
        "串" +
          sub[i].id +
          "，标题" +
          sub[i].title +
          "，最新id" +
          last_reply +
          "，删除结果" +
          delFeedresText
      );
      // send notice
      sendNotice(
        "#自动删除 #id" +
          sub[i].id +
          " " +
          sub[i].title +
          "\n该串长时间未更新，已自动取消订阅，最新id为" +
          last_reply +
          "\nhttps://www.nmbxd1.com/t/" +
          sub[i].id
      );
      reqcount++;
      sub.splice(i, 1);
      await KV.put("sub", JSON.stringify(sub));
      reqcount++;
      i--;
      removed++;
    }
    if (reqcount >= 40) {
      break;
    }
  }
  console.log(sub);
  await KV.put("sub", JSON.stringify(sub));
  reqcount++;
  return new Response(
    JSON.stringify({
      status: 200,
      message: `成功删除${removed}个订阅`
    }),
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, HEAD",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    }
  );
});
router.get("*", async (req, e) => {
  try {
    return await getAssetFromKV(e);
  } catch (err) {
    return new Response(
      err.message,
      { status: 200 },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
});
addEventListener("fetch", e => {
  e.respondWith(router.handle(e.request, e).catch(errorHandler));
});
addEventListener("scheduled", async event => {
  event.waitUntil(handleScheduled(event));
});
