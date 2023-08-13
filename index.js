import { Router } from "itty-router";
import {
  getAssetFromKV,
  mapRequestToAsset
} from "@cloudflare/kv-asset-handler";
import { handleScheduled } from "./schedule";
import { config, mode } from "./config";
import { setTgBot } from "./bot";
const secret_path = config.SECRET_PATH;
const router = Router();
if (mode === "telegram") {
  setTgBot(router);
}
const refreshunread = async (index) => {
  const res = await fetch(
    `https://api.nmb.best/Api/thread?id=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        cookie: `userhash=${config.COOKIES}`
      }
    }
  );
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
    let aTime = parseInt(a.lastUpdateTime.substring(0, 4)+a.lastUpdateTime.substring(5, 7)+a.lastUpdateTime.substring(8, 10)+a.lastUpdateTime.substring(13, 15)+a.lastUpdateTime.substring(16, 18)+a.lastUpdateTime.substring(19, 21));
    let bTime = parseInt(b.lastUpdateTime.substring(0, 4)+b.lastUpdateTime.substring(5, 7)+b.lastUpdateTime.substring(8, 10)+b.lastUpdateTime.substring(13, 15)+b.lastUpdateTime.substring(16, 18)+b.lastUpdateTime.substring(19, 21));
    return aTime === bTime ? a.id - b.id : bTime - aTime
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
  // 添加订阅
  const subraw = (await KV.get("sub")) || "[]";
  let sub = JSON.parse(subraw);
  const body = await req.json();
  if (body.url === undefined) {
    // 没回传url
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Url not found"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  const msg = body.url; // 回传的url
  const resp = await fetch(`https://api.nmb.best/Api/po?id=${msg}`, {
    //改成adnmb的只看po的接口
    method: "GET",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      cookie: `userhash=${config.COOKIES}`
    }
  });
  if (resp.status === 200) {
    let feed = {};
    const data = await resp.json();
    if (data.success === false) {
      return new Response(
        JSON.stringify({
          status: 400,
          message: data.error
        }),
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, HEAD",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        }
      );
    }
    feed.id = msg.toString();
    feed.url = `https://www.nmbxd1.com/t/${msg}`;
    feed.po = data.user_hash;
    // feed.title is data.title if it is not "无标题", otherwise feed.title is first line of data.content
    if (data.title === "无标题" || data.title === "") {
      feed.title = data.content.split("<br />")[0];
    } else {
      feed.title = data.title;
    }
    feed.telegraph = true;
    feed.active = true;
    feed.errorTimes = 0;
    feed.ReplyCount = data.ReplyCount;
    feed.fid = data.fid;
    feed.sendto = config.TG_SENDID;
    if (
      sub.findIndex(e => e.url === feed.url) != -1 // 如果已经存在了
    ) {
      return new Response(
        JSON.stringify({
          status: 400,
          message: "Already subscribed"
        }),
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, HEAD",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        }
      );
    } else {
      const now = new Date();
      feed.lastUpdateTime = now;
      sub.push(feed);
      await KV.put("sub", JSON.stringify(sub));
      return new Response(
        JSON.stringify({
          status: 0,
          message: `${feed.title} add succeed`
        }),
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, HEAD",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        }
      );
    }
  } else {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Network error",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      })
    );
  }
});
router.post(`/${secret_path}/deleteitem`, async req => {
  // 删除订阅
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const body = await req.json();
  const url = body.url;
  const index = sub.findIndex(e => e.url === url);
  if (index === -1) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "未找到该订阅"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  } else {
    sub.splice(index, 1);
    await KV.put("sub", JSON.stringify(sub));
    return new Response(
      JSON.stringify({
        status: 0,
        message: "Delete succeed!"
      }),
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
router.post(`/${secret_path}/active`, async req => {
  // 激活/禁用订阅
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const body = await req.json();
  const url = body.url || "";
  const state = body.state;
  const index = sub.findIndex(e => e.url === url);
  if (index === -1 || state === undefined) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  sub[index].active = state;
  sub[index].lastUpdateTime = new Date();
  sub[index].errorTimes = 0;
  await KV.put("sub", JSON.stringify(sub));
  return new Response(
    JSON.stringify({
      status: 0,
      message: `修改成功，当前状态为 ${state ? "on" : "off"}`
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
router.post(`/${secret_path}/telegraph`, async req => {
  // 激活/禁用 Telegraph
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const body = await req.json();
  const url = body.url || "";
  const state = body.state;
  const index = sub.findIndex(e => e.url === url);
  if (index === -1 || state === undefined) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  sub[index].telegraph = state;
  await KV.put("sub", JSON.stringify(sub));
  return new Response(
    JSON.stringify({
      status: 0,
      message: `修改成功，当前 Telegraph 状态为 ${state ? "on" : "off"}`
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
router.post(`/${secret_path}/title`, async req => {
  // 修改订阅标题
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const body = await req.json();
  const url = body.url || "";
  const title = body.title;
  const index = sub.findIndex(e => e.url === url);
  if (index === -1 || title === undefined) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  sub[index].title = title;
  await KV.put("sub", JSON.stringify(sub));
  return new Response(
    JSON.stringify({
      status: 0,
      message: `修改成功，当前该订阅源标题为 ${title}`
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
router.post(`/${secret_path}/unread`, async req => {
  // 修改订阅未读数
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const body = await req.json();
  const url = body.url || "";
  const index = sub.findIndex(e => e.url === url);
  if (index === -1) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  let id = sub[index].id;
  sub[index].unread = 0; 
  const res = await fetch(
    `https://api.nmb.best/Api/thread?id=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        cookie: `userhash=${config.COOKIES}`
      }
    }
  );
  sub[index].LastRead = (await res.json()).ReplyCount;
  await KV.put("sub", JSON.stringify(sub));
  return new Response(
    JSON.stringify({
      status: 0,
      message: `修改成功，已清空该订阅源未读`
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
router.get(`/${secret_path}/jumpread`, async req => {
  // 通过search里的id跳转到指定帖子
  const id = req.url.split("?id=")[1];
  if (id === undefined) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const index = sub.findIndex(e => e.id === id);
  if (index === -1) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "id not found. Did you subscribe this thread?"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  sub[index].unread = 0;
  if (sub[index].LastRead === undefined) {
    const res = await fetch(
      `https://api.nmb.best/Api/thread?id=${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          cookie: `userhash=${config.COOKIES}`
        }
      }
    );
    sub[index].LastRead = (await res.json()).ReplyCount;
  }
  let lastreadto = sub[index].LastRead;
  console.log(lastreadto);
  const res = await fetch(
    `https://api.nmb.best/Api/thread?id=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        cookie: `userhash=${config.COOKIES}`
      }
    }
  );
  sub[index].LastRead = (await res.json()).ReplyCount;
  await KV.put("sub", JSON.stringify(sub));
  // if ua is mobile, jump to app
  if (req.headers.get("user-agent").includes("Mobile")) {
    let page = Math.floor((lastreadto - 1)/9) + 1;
    console.log(page);
    console.log("mobile");
    return Response.redirect(`https://www.nmbxd1.com/m/t/${id}?page=${page}`, 307);
  }
  let page = Math.floor((lastreadto - 1)/19) + 1;
  console.log(page);
  console.log("pc");
  return Response.redirect(`https://www.nmbxd1.com/t/${id}?page=${page}`, 307);
});
router.get(`/${secret_path}/jumplast`, async req => {
  const id = req.url.split("?id=")[1];
  if (id === undefined) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const index = sub.findIndex(e => e.id === id);
  if (index === -1) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  sub[index].unread = 0;
  const res = await fetch(
    `https://api.nmb.best/Api/thread?id=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        cookie: `userhash=${config.COOKIES}`
      }
    }
  );
  sub[index].LastRead = (await res.json()).ReplyCount;
  await KV.put("sub", JSON.stringify(sub));
  let lastreadto = sub[index].LastRead;
  // if ua is mobile, jump to app
  if (req.headers.get("user-agent").includes("Mobile")) {
    let page = Math.floor((lastreadto - 1)/9) + 1;
    console.log(page);
    console.log("mobile");
    return Response.redirect(`https://www.nmbxd1.com/m/t/${id}?page=${page}`, 307);
  }
  let page = Math.floor((lastreadto - 1)/19) + 1;
  console.log(page);
  console.log("pc");
  return Response.redirect(`https://www.nmbxd1.com/t/${id}?page=${page}`, 307);
});
router.get(`/${secret_path}/subscribe`, async req => {
  const uuid = req.url.split("?uuid=")[1];
  if (uuid === undefined) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Please verify your input!"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  await KV.put("uuid", uuid);
  // https://api.nmb.best/Api/feed?uuid=xxx test
  const res = await fetch(
    `https://api.nmb.best/Api/feed?uuid=${uuid}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        cookie: `userhash=${config.COOKIES}`
      }
    }
  );
  // if uuid is invalid, the request will return "[]"
  if ((await res.json()).length === 0) {
    return new Response(
      JSON.stringify({
        status: 400,
        message: "This uuid have no feed yet"
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, HEAD",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  }
  const feed = await res.json();
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  let count = 0;
  for (let i = 0; i < feed.length; i++) {
    if (feed[i].id in sub.map(e => e.id)) {
      continue;
    }
    let item = {};
    // [{"id":"56154624","url":"https://www.nmbxd1.com/t/56154624","po":"WJO99y2","title":"烂俗转生故事","telegraph":true,"active":true,"errorTimes":0,"ReplyCount":596,"fid":19,"sendto":1326561094,"lastUpdateTime":"2023-08-13(日)14:53:45","xd":true,"issingle":true,"ReplyCountAll":1816,"ReplyCountNow":596,"unread":79,"send_message_id":7305,"LastRead":1639}]
    item.id = feed[i].id;
    item.url = `https://www.nmbxd1.com/t/${feed[i].id}`;
    item.po = feed[i].user_hash;
    item.title = feed[i].title;
    item.telegraph = true;
    item.active = true;
    item.errorTimes = 0;
    item.ReplyCount = feed[i].reply_count;
    item.fid = feed[i].fid;
    item.sendto = config.TG_SENDID;
    item.lastUpdateTime = feed[i].now;
    item.xd = true;
    item.issingle = true;
    item.ReplyCountAll = feed[i].reply_count;
    item.ReplyCountNow = feed[i].reply_count;
    item.unread = 0;
    item.send_message_id = null;
    item.LastRead = feed[i].reply_count;
    sub.push(item);
    count++;
  }
  return new Response(
    JSON.stringify({
      status: 0,
      message: "Subscribe succeed! " + count + " new feeds added"
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
router.get("/test", async (req, e) => {
  // 测试
  e.waitUntil(handleScheduled(e));
});
router.get("/fixerror", async (req, e) => {
  // 修复错误
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  console.log(sub);
  for (let i = 0; i < sub.length; i++) {
    // 临时
    if (typeof(sub[i].id) === "number") {
      sub[i].id = sub[i].id.toString();
    }
  }
  console.log(sub);
  await KV.put("sub", JSON.stringify(sub));
  return new Response(
    JSON.stringify({
      status: 200,
      message: sub.toString()
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
