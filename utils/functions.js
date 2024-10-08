import { cFetch } from "./util.js";
import { config } from "../config.js";

export async function GetID(req) {
  const body = await req.json();
  if (body.url === undefined) {
    // 没回传url
    errorResponse("Url not found");
  }
  let url = body.url;
  let id = url;
  let success = true;
  if (/^\d{8}$/.test(url)) {
    // 如果是url，提取id
    id = url.match(/\d{8}/)[0];
  } else {
    // 如果是id，提取id
    id = url.match(/\d{8}/)[0];
  }
  // check if the id is valid 8 digits number
  if (!/^\d{8}$/.test(id)) {
    success = false;
    id = "ID格式错误";
  }
  return { success, id };
}

export async function GetIDctx(ctx) {
  let message = ctx.update.message;
  let success = true;
  let id = message.text.match(/\d{8}/);
  if (id === null) {
    if (message.reply_to_message != undefined) {
      message = message.reply_to_message;
      id = message.text.match(/\d{8}/);
      if (id === null) {
        await ctx.reply("未在 该消息 及 回复 中找到帖子ID", {
          reply_to_message_id: ctx.update.message.message_id
        });
        return { success: false, id: "未在 该消息 及 回复 中找到帖子ID" };
      } else {
        id = id[0];
      }
    } else {
      await ctx.reply("未在该消息中找到帖子ID", {
        reply_to_message_id: ctx.update.message.message_id
      });
      return { success: false, id: "未在该消息中找到帖子ID" };
    }
  }
  return { success, id };
}

export async function GetIndex(id) {
  const SubRaw = (await KV.get("sub")) || "[]";
  let sub = JSON.parse(SubRaw);
  let index = sub.findIndex(e => e.id === id);
  let success = true;
  if (index === -1) {
    success = false;
    index = "未订阅该串";
  }
  return { success, index };
}

export async function Subscribe(id) {
  const SubRaw = (await KV.get("sub")) || "[]";
  let sub = JSON.parse(SubRaw);
  let success = true;
  let msg = "";
  if (id === undefined) {
    success = false;
    msg = "未传入id";
  }
  try {
    const resp = await cFetch(`https://api.nmb.best/Api/po?id=${id}`);
    if (resp.status === 200) {
      let feed = {};
      const data = await resp.json();
      if (data.success === false) {
        success = false;
        msg = data.error;
      }
      feed.id = id.toString();
      feed.url = `https://www.nmbxd1.com/t/${id}`;
      feed.po = data.user_hash;
      feed.writer = [data.user_hash];
      // feed.title is data.title if it is not "无标题", otherwise feed.title is first line of data.content
      if (data.title === "无标题" || data.title === "") {
        let title = "";
        if (title === "无标题" || title === "" || title === undefined ) {
          if (data.content.includes("<br />")) {
            title = data.content.split("<br />")[0].substring(0, 20);
          }
          else {
            title = data.content.substring(0, 20);
          }
        }
        feed.title = title;
      } else {
        feed.title = data.title;
      }
      feed.telegraph = true;
      feed.active = true;
      feed.errorTimes = 0;
      feed.ReplyCount = 0;
      feed.fid = data.fid;
      feed.SendTo = config.TG_SENDID;
      feed.AutoRemove = 1;
      feed.unread = 0;
      feed.LastRead = 0;
      feed.xd = true;
      feed.IsSingle = true;
      feed.ReplyCountAll = 0;
      if (
        sub.findIndex(e => e.url === feed.url) != -1 // 如果已经存在了
      ) {
        success = false;
        msg = "已经订阅过了";
      } else {
        const now = new Date();
        feed.lastUpdateTime = now;
        sub.push(feed);
        console.log(feed);
        await KV.put("sub", JSON.stringify(sub));
        console.log(`ID: ${id} subscribed`);
        msg = `#添加订阅 #id${feed.id} <b> ${feed.title} </b>\n<a href="${config.FRONTEND_URL}/t/${feed.id}">点击查看</a>`;
        // https://api.nmb.best/Api/addFeed?uuid=xxx&tid=xxx
        const uuid = await KV.get("uuid");
        const addFeedres = await fetch(
          `https://api.nmb.best/Api/addFeed?uuid=${uuid}&tid=${id}`
        );
        // decode the response
        // "\u8be5\u4e32\u4e0d\u5b58\u5728" (该串不存在) -> 该串不存在
        const addFeedresText = await addFeedres.json();
        if (addFeedresText === "该串不存在") {
          success = false;
          msg = "该串不存在";
        }
        // "\u8ba2\u9605\u5927\u6210\u529f\u2192_\u2192" (订阅大成功→_→) -> 订阅大成功→_→
        else if (addFeedresText === "订阅大成功→_→") {
          msg = `#新订阅 #id${feed.id} <b> ${feed.title} </b>\n<a href="${config.FRONTEND_URL}/t/${feed.id}">点击查看</a>`;
        } else {
          // error
          // return the error message
          success = false;
          msg = addFeedresText;
        }
      }
    } else {
      success = false;
      msg = "订阅失败，网络错误，请稍后再试";
    }
  } catch (err) {
    success = false;
    msg = err.message + " " + err.stack;
  }
  // return both success and msg
  return { success, msg };
}

// 删除订阅
export async function Unsubscribe(id) {
  const SubRaw = (await KV.get("sub")) || "[]";
  let sub = JSON.parse(SubRaw);
  let success = true;
  let msg = "";
  const index = sub.findIndex(e => e.id === id);
  if (index === -1) {
    success = false;
    msg = "未订阅该串";
  } else {
    // https://api.nmb.best/Api/delFeed?uuid=xxx&tid=xxx
    const uuid = await KV.get("uuid");
    const delFeedres = await fetch(
      `https://api.nmb.best/Api/delFeed?uuid=${uuid}&tid=${id}`
    );
    // decode the response
    const delFeedresText = await delFeedres.json();
    if (delFeedresText === "取消订阅成功!") {
      msg = `成功取消订阅${id}-${sub[index].title}`;
      sub.splice(index, 1);
      await KV.put("sub", JSON.stringify(sub));
      console.log(`ID: ${id} unsubscribed`);
    } else {
      success = false;
      msg = delFeedresText;
    }
  }
  return { success, msg };
}

// mark as read
export async function MarkAsRead(id) {
  const SubRaw = (await KV.get("sub")) || "[]";
  let sub = JSON.parse(SubRaw);
  let success = true;
  let msg = "";
  const index = sub.findIndex(e => e.id === id);
  if (index === -1) {
    success = false;
    msg = "未订阅该串";
  } else {
    sub[index].unread = 0;
    sub[index].LastRead = sub[index].ReplyCount;
    await KV.put("sub", JSON.stringify(sub));
    msg = "修改成功，已清空该订阅源未读并删除缓存";
  }
  return { success, msg };
}

function parseGivenTime(givenTime) {
  // Remove the part in parentheses
  givenTime = givenTime.replace(/\(.*?\)/g, ' ');

  // Split the string into an array
  let dateTime = givenTime.split(/[- :]/);
  let hour = parseInt(dateTime[3]) - 8;
  if (hour < 0) {
    hour += 24;
  }
  
  // Create a new Date object
  let date = new Date(
    Date.UTC(
      parseInt(dateTime[0]), // year
      parseInt(dateTime[1]) - 1, // month, subtract 1 because months are 0-indexed in JavaScript
      parseInt(dateTime[2]), // day
      hour, // hour
      parseInt(dateTime[4]), // minute
      parseInt(dateTime[5]) // second
    )
  );

  // If the hour subtraction resulted in a negative number, adjust the date
  if (date.getUTCDate() < parseInt(dateTime[2])) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

export function timeDifference(givenTime1, givenTime2) {
  let dataDate = parseGivenTime(givenTime1);
  let timeDiff = 0;
  if (!givenTime2) {
    let now = new Date(); 
    timeDiff = now.getTime() - dataDate.getTime();
  } else {
    let dataDate2 = parseGivenTime(givenTime2);
    timeDiff = dataDate2.getTime() - dataDate.getTime();
  }
  if (timeDiff < 0) {
    timeDiff = -timeDiff;
  }
  return timeDiff;
}
