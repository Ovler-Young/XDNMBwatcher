import { config, mode } from "../config";
const { sendNotice } = require(`../notifications/${mode}`);
import { cFetch, addContent } from "./util";
import { telegraph, editTelegraph } from "./telegraph";
import { Subscribe, Unsubscribe, MarkAsRead } from "./functions";

export async function syncToTelegraph(id, force = false) {
  console.log("syncToTelegraph id: " + id);
  // req times
  let r = 0;
  let firstMessage = true;

  let PHPSESSID = await KV.get("PHPSESSID");
  console.log("PHPSESSID: " + PHPSESSID);
  // try if it is in the sub list
  let sub = JSON.parse(await KV.get("sub"));
  let index = sub.findIndex(e => e.id === id);
  console.log(`index: ${index}, item: ${JSON.stringify(sub[index])}`);
  if (index === -1) {
    // not found
    console.log("未找到" + id + "，正在订阅");
    let sendStatus = sendNotice(`id: ${id} 未找到, 正在订阅`);
    console.log(`sendStatus: ${sendStatus}`);
    let success,
      msg = await Subscribe(id);
    sendNotice(msg);
    if (success) {
      sub = JSON.parse(await KV.get("sub"));
      // find new index
      index = sub.findIndex(e => e.id === id);
      KV.put("sub", JSON.stringify(sub));
    }
    r += 2;
  }
  r += 1;

  let res = await cFetch(
    `https://api.nmb.best/Api/po?id=${id}`, // 只看po即可，第一次确认总回复数
    (PHPSESSID = PHPSESSID)
  );
  r++;
  let po = await res.json();
  let PoReplyCount = po.ReplyCount;
  console.log("ReplyCount: " + PoReplyCount);

  if (force === true) {
    sub[index].SyncedReplyCount = 0;
    sub[index].SyncTelegraphUrl = "";
  }

  if (sub[index].SyncedReplyCount === undefined) {
    sub[index].SyncedReplyCount = 0;
  }
  let SyncedReplyCount = sub[index].SyncedReplyCount;
  if (sub[index].SyncTelegraphUrl === undefined) {
    sub[index].SyncTelegraphUrl = "";
  }
  console.log(JSON.stringify(sub));
  let SyncTelegraphUrl = sub[index].SyncTelegraphUrl || "";
  console.log("SyncTelegraphUrl: " + SyncTelegraphUrl);
  KV.put("sub", JSON.stringify(sub));

  let FromPage = Math.ceil(SyncedReplyCount / 19) + 1;
  let ToPage = Math.ceil(PoReplyCount / 19) + 1;
  console.log(`FromPage: ${FromPage}, ToPage: ${ToPage}`);
  let replies = [];
  let reply_ids = [];
  let TotalLength = 0;
  let SyncedReplyCount_new = SyncedReplyCount;
  if (SyncedReplyCount === 0) {
    // need to add content of first page.
    replies.push(po);
    reply_ids.push(po.id);
    TotalLength += byteLength(po.content);
  }
  for (let i = FromPage; i <= ToPage; i++) {
    // console.log(`i: ${i}`);
    let res = await cFetch(
      `https://api.nmb.best/Api/po?id=${id}&page=${i}`,
      (PHPSESSID = PHPSESSID)
    );
    // console.log(`res_size: ${res.length}`)
    r++;
    let thread = await res.json();
    // 文本长度限制
    // console.log(`type: ${typeof thread.Replies}, length: ${thread.Replies.length}`)
    console.log(`thread.Replies.length: ${thread.Replies.length} with ids: ${thread.Replies.map(e => e.id)}`);
    thread.Replies = thread.Replies.filter(e => e.id !== 9999999).sort(
      (a, b) => a.id - b.id
    );
    console.log(`thread.Replies.length: ${thread.Replies.length} with ids: ${thread.Replies.map(e => e.id)}`);
    if (i === FromPage) {
      thread.Replies = thread.Replies.slice(SyncedReplyCount % 19);
    }
    for (let j = 0; j < thread.Replies.length; j++) {
      TotalLength += byteLength(thread.Replies[j].content);
      if (TotalLength < 32000 && r < 40) {
        replies.push(thread.Replies[j]);
        SyncedReplyCount_new += 1;
        reply_ids.push(thread.Replies[j].id);
      } else {
        console.log(`SyncedReplyCount_new: ${SyncedReplyCount_new}`);
        sub[index].SyncedReplyCount = SyncedReplyCount_new;
        console.log(
          `TotalLength: ${TotalLength -
            byteLength(
              thread.Replies[j].content
            )} at page ${i} reply ${j} and saved to kv. \nSyncedReplyCount_new: ${SyncedReplyCount_new}. \nIncluded reply_ids: ${reply_ids}`
        );
        sub = await sendPassage(
          replies,
          id,
          i,
          j,
          SyncTelegraphUrl,
          sub,
          index
        );
        console.log(`sub[index]: ${JSON.stringify(sub[index])}`);
        console.log(JSON.stringify(sub));
        KV.put("sub", JSON.stringify(sub));
        SyncTelegraphUrl = sub[index].SyncTelegraphUrl;
        if (firstMessage === true) {
          let message = `<b>${sub[index].title} Page：${i} Rep ${j}</b>\n #${sub[index].po} | #${sub[index].id} | 自<a href="${sub[index].url}">NMB</a> 同步至 ${SyncTelegraphUrl}`;
          let sendStatus = sendNotice(message);
          console.log(`sendStatus: ${sendStatus}`);
          firstMessage = false;
        }
        replies = [];
        reply_ids = [];
        TotalLength = 0;
        r += 8;
        console.log(
          `SyncTelegraphUrl: ${SyncTelegraphUrl}\nSyncedReplyCount_new: ${SyncedReplyCount_new}\nTotalLength: ${TotalLength}\nr: ${r}`
        );
      }
      if (r > 40) {
        break;
      }
    }
    console.log(`TotalLength: ${TotalLength} at page ${i}`);
    if (r > 40) {
      break;
    }
  }
  console.log(`replies_size: ${TotalLength}`);
  console.log(SyncedReplyCount_new);
  sub[index].SyncedReplyCount = SyncedReplyCount_new;
  sub[index].SyncTelegraphUrl = SyncTelegraphUrl;
  console.log(
    `TotalLength: ${TotalLength -
      byteLength(
        thread.Replies[j].content
      )} at page ${i} reply ${j} and saved to kv. \n SyncedReplyCount_new: ${SyncedReplyCount_new}`
  );
  sub = await sendPassage(replies, id, i, j, SyncTelegraphUrl, sub, index);
  console.log(`sub[index]: ${JSON.stringify(sub[index])}`);
  console.log(JSON.stringify(sub));
  KV.put("sub", JSON.stringify(sub));
  SyncTelegraphUrl = sub[index].SyncTelegraphUrl;
  replies = [];
  TotalLength = 0;
  r += 3;
  let message = `id: ${id} 同步完成, ${SyncTelegraphUrl}, ${SyncedReplyCount_new}条回复`;
  let sendStatus = sendNotice(message);
  if (r > 40) {
    let next_sync = cFetch(
      `${config.BASE_URL}/${config.SECRET_PATH}/stg?id=${id}&force=false`,
      (PHPSESSID = PHPSESSID)
    );
    console.log(`next_sync: ${next_sync}`);
  }
  return sendStatus;
}

async function sendPassage(replies, id, page, reply, telegraphUrl, sub, index) {
  let content = "";
  let content_all = [];
  if (telegraphUrl !== "") {
    content_all.push(`| 同步至Page：${page} 的第${reply}条回复\n\n`);
  }
  for (let i = 0; i < replies.length; i++) {
    let data = replies[i];
    let rep_id = data.id;
    content_all = addContent(rep_id, data, content_all);
  }
  console.log(`content_all:`);
  console.log(content_all);
  content = content_all.join("<br/>").replace(/<[^>]+>/g, "");
  let item = {};
  item.id = id;
  item.writer = replies[0].user_hash;
  item.title = sub[index].title;
  item.url = `https://www.nmbxd1.com/t/${id}`;
  item.telegraphUrl = telegraphUrl || "";
  item.content = content;
  console.log("item: ");
  console.log(item);
  let telegram_html = await editTelegraph(item);
  console.log("telegram_html: ");
  console.log(telegram_html);
  sub[index].SyncTelegraphUrl = telegram_html.split(`"`)[1].split(`"`)[0];
  sub[index].SyncedReplyCount = (page - 1) * 19 + replies.length;
  console.log(`sub[index]: ${JSON.stringify(sub[index])}`);
  console.log(JSON.stringify(sub));
  return sub;
}

function byteLength(str) {
  // returns the byte length of an utf8 string
  var s = str.length;
  for (var i = str.length - 1; i >= 0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s += 2;
    if (code >= 0xdc00 && code <= 0xdfff) i--; //trail surrogate
  }
  return s;
}
