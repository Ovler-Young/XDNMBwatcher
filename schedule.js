import { mode, config } from "./config";
const {
  reply,
  replyWhenError,
  sendNotice
} = require(`./notifications/${mode}`);
import { cFetch, addContent, getKVsub } from "./utils/util";
import { Subscribe, Unsubscribe, MarkAsRead,timeDifference } from "./utils/functions";
import { byteLength } from "./utils/sync";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const retry = async (fn) => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error("Max retries reached");
};

export async function handleScheduled(event) {
  let sub = await getKVsub();
  const uuid = await KV.get("uuid");
  let idToCheck = [];
  // idToCheck = sub.map(item => item.id); only those active
  if (sub !== null && sub !== undefined && sub !== "" && sub.length > 0) {
    idToCheck = sub.filter(item => item.active).map(item => item.id);
  }
  console.log("idToCheck: " + idToCheck.length + " " + idToCheck);
  let PHPSESSID = await KV.get("PHPSESSID");
  let retryphp = 0;
  let u = 2; // 请求次数
  if (PHPSESSID === null || PHPSESSID === undefined) {
    for (retryphp = 0; retryphp < 4; retryphp++) {
      // fetch PHPSESSID
      const PHPSESSIDurl = "https://www.nmbxd1.com/Forum";
      const PHPSESSIDoption = { method: "GET" };
      PHPSESSIDoption.signal = AbortSignal.timeout(1700 * (retryphp + 1));
      let PHPSESSIDresponse = await fetch(PHPSESSIDurl, PHPSESSIDoption);
      PHPSESSID = PHPSESSIDresponse.headers
        .get("set-cookie")
        .split(";")[0]
        .split("=")[1];
      await KV.put("PHPSESSID", PHPSESSID, { expirationTtl: 360000 });
      u++;
    }
  }

  // 访问 feed 接口，check 是否有新帖子
  let feedpage = 1;
  while (true) {
    const res = await cFetch(
      `https://api.nmb.best/Api/feed?uuid=${uuid}&page=${feedpage}`,
      (PHPSESSID = PHPSESSID)
    );
    u++;
    let feed = await res.json();
    if (feed.length === 0) {
      break;
    }
    for (let i = 0; i < feed.length; i++) {
      let index = sub.findIndex(e => e.id === feed[i].id);
      if (index === -1) {
        // not found, add to sub
        let title = "";
        try {
          title = feed[i].content.split("<br />")[0].substring(0, 20);
        } catch (e) {
          title = feed[i].content;
        }
        console.log(
          "未找到" + feed[i].id + "，标题为:" + title
        );
        let { success, msg } = await Subscribe(feed[i].id);
        if (success) {
          sendNotice(msg);
          sub = JSON.parse(await KV.get("sub"));
          // find new index
          index = sub.findIndex(e => e.id === feed[i].id);
          sub[index].errorTimes = 0;
          sub[index].ReplyCount = feed[i].reply_count;
          sub[index].recent_replies = feed[i].recent_replies;
          // save the sub to kv
          await KV.put("sub", JSON.stringify(sub));
        } else {
          sendNotice(msg);
        }
        console.log("sendNotice with message: " + msg);
      } else if (sub[index].active === false) {
        sub[index].active = true;
        sub[index].errorTimes = 0;
        await KV.put("sub", JSON.stringify(sub));
        let title = feed[i].title ;
        if (title === "无标题" || title === "" || title === undefined ) { try{
          title = feed[i].content.split("<br />")[0].substring(0, 20);
        } catch (e) {
          title = feed[i].content;
        }}
        console.log(
          "找到" + feed[i].id + "，标题为‘" + title
        );
        let message = `#重新订阅 #id${feed[i].id} <b> ${feed[i].title} </b>\n${title}\n<a href="${config.FRONTEND_URL}/t/${feed[i].id}">点击查看</a>`;
        sendNotice(message);
        console.log("sendNotice with message: " + message);
      } else {
        // found, check if there is update
        idToCheck.splice(idToCheck.indexOf(feed[i].id), 1);
        if (sub[index].ReplyCount === undefined) {
          console.log(`#id${feed[i].id} 的回复数为undefined`);
          sub[index].ReplyCount = feed[i].reply_count;
          sub[index].recent_replies = feed[i].recent_replies;
          try {
            await KV.put("sub", JSON.stringify(sub));
          } catch (err) {
            console.log(err);
          }
        } else if (
          sub[index].ReplyCount === feed[i].reply_count ||
          sub[index].active === false
        ) {
          // no update
          console.log("id: " + feed[i].id + "title" + feed[i].title + "未更新" + sub[index].ReplyCount + " " + feed[i].reply_count);
        } else if (sub[index].ReplyCount < feed[i].reply_count) {
          try {
            let page = 0;
            // 有更新
            console.log(
              "id: " + feed[i].id + "title" + feed[i].title + "有更新，之前回复数为" + sub[index].ReplyCount + "现在回复数为" + feed[i].reply_count + "增加了" + (feed[i].reply_count - sub[index].ReplyCount) + "条回复"
            );
            let id = feed[i].id;
            let NewReplyCount = feed[i].reply_count - sub[index].ReplyCount;
            let from = Math.floor((sub[index].ReplyCount - 1) / 19) + 1;
            if (from === 0) {
              from = 1;
            }
            let to = Math.min(10 + from, Math.floor((feed[i].reply_count - 1) / 19) + 1);
            let replies = [];
            let data = "";
            for (let j = from; j <= to; j++) {
              try {
                const res = await retry(() =>
                  cFetch(
                `https://api.nmb.best/Api/thread?id=${id}&page=${j}`,
                (PHPSESSID = PHPSESSID)
                  )
              );
              u += 1;
              data = await res.json();
              replies = replies.concat(data.Replies);
              } catch (error) {
                console.error(`Failed to fetch page ${j} after ${MAX_RETRIES} retries:`, error);
                break;
              }
            }
            // sort replies by id and only keep the biggest NewReplyCount replies
            replies = replies.filter(reply => reply.id !== 9999999);
            replies = replies.sort((a, b) => a.id - b.id).slice(-NewReplyCount);
            let content_all = [];
            if (sub[index].ReplyCount === 0) {
              page = 1;
              content_all = addContent(id, data, content_all, page);
            }

            let unread = 0;
            let content_all_length = 0;
            let added = 0;
            let lastUpdateTimeInFeed = feed[i].now;
            for (let j = 0; j < replies.length; j++) {
              let data = replies[j];
              added += 1;
              if (
                data.user_hash === sub[index].po ||
                (sub[index].IsSingle === false &&
                  sub[index].writer.includes(data.user_hash))
              ) {
                content_all_length += byteLength(data.content);
                if (content_all_length > 87 * 1024) {
                  added -= 1;
                  break;
                }
                page = Math.floor((j + sub[index].ReplyCount) / 19) + 1;
                content_all = addContent(id, data, content_all, page);
                unread += 1;
                lastUpdateTimeInFeed = data.now;
              } else if (
                byteLength(data.content) > 300 &&
                timeDifference(data.now, sub[index].lastUpdateTime) <
                  14 * 24 * 60 * 60 &&
                !(
                  data.content.includes("催更") ||
                    data.content.includes("F5") ||
                    data.content.includes("gkdgkd") ||
                    data.content.includes("把po给我挖出来") ||
                    data.content.includes("魂兮归来") ||
                    data.content.includes("求你了再写")
                )
              ) {
                let message = `怀疑是po的回复 #id${id} #reply${data.id} ${
                  data.ext
                    ? `<a href="https://image.nmb.best/image/${data.img}${data.ext}1">img</a>`
                    : ""
                } #po${data.user_hash} \n${data.content
                  .replace(/<[^>]+>/g, "")
                  .replace(
                    /&gt;&gt;No\.(\d+)/g,
                    `<a href="${config.FRONTEND_URL}/Home/Forum/ref?id=$1">>>No.$1</a>`
                  )} \n\n如的确是，请回复 <code>/po ${id} ${
                  data.user_hash
                } </code> 以添加订阅`;
                sendNotice(message);
              }
            }
            let content_join = content_all.join("<br/>");
            if (content_join !== "") {
              sub = addUnreadCount(sub, index, unread);
              let item = {
                id: sub[index].id,
                title: `${sub[index].title} - ${sub[index].unread}`,
                content: content_join,
                telegraph: sub[index].telegraph,
                active: sub[index].active,
                lastUpdateTime: sub[index].lastUpdateTime,
                writer: sub[index].po,
                SendTo: sub[index].SendTo || config.TG_SENDID,
                lastSendId: sub[index].send_message_id || 0,
                AutoRemove: 1,
                telegraphUrl: sub[index].telegraphUrl,
                sub: sub[index]
              };
              sub[index] = await reply(sub[index], item);
              sub[index].lastUpdateTime = lastUpdateTimeInFeed; // feed[i].now is the time of the creation of the first reply
              u += sub[index].telegraph ? 3 : 1;
              console.log(`send_message_id: ${sub[index].send_message_id}`);
            }
            sub[index].errorTimes = 0;
            sub[index].ReplyCount = parseInt(sub[index].ReplyCount) + added;
            console.log("added: " + added);
            sub[index].recent_replies = feed[i].recent_replies;
            console.log("sub[index].ReplyCount: " + sub[index].ReplyCount);
            console.log(sub[index]);
            // save the sub to kv
            await KV.put("sub", JSON.stringify(sub));
          } catch (err) {
            if (err.message === "KV put() limit exceeded for the day.") {
              console.log("KV put() limit exceeded for the day.");
              break;
            }
            sub[index].errorTimes += 1;
            console.log(err);
            let message = `在处理 #id${feed[i].id} 时出现错误，错误信息为：${err.message} \n技术细节为：${err.stack}`;
            sendNotice(message);
            if (sub[i].errorTimes >= config.maxErrorCount) {
              console.log(
                "error over max start notify for " +
                  sub[i].errorTimes +
                  " times"
              );
              console.log(sub[i]);
              sub[i].active = false;
              await KV.put("sub", JSON.stringify(sub));
              await replyWhenError(sub[i], err);
              break;
            } else {
              await KV.put("sub", JSON.stringify(sub));
              // await replyWhenError(sub[i], err);
              break;
            }
          }
        } else if (sub[index].ReplyCount > feed[i].reply_count) {
          console.log(`#id${feed[i].id} 的回复数减少了，之前回复数为 ${sub[index].ReplyCount} 现在回复数为 ${feed[i].reply_count}`);
          sub[index].ReplyCount = feed[i].reply_count;
          sub[index].recent_replies = feed[i].recent_replies;
          await KV.put("sub", JSON.stringify(sub));
        }
      }
    }
    feedpage++;
  }
  // 确定
  // for things still in idToCheck, that means they are not in feed, so we need to check if they are deleted
  for (let i = 0; i < idToCheck.length; i++) {
    let index = sub.findIndex(e => e.id === idToCheck[i]);
    if (index !== -1) {
      // check if it is deleted
      let res = await cFetch(
        `https://api.nmb.best/Api/thread?id=${idToCheck[i]}`,
        (PHPSESSID = PHPSESSID)
      );
      u += 1;
      let data = await res.json();
      if (data === "该串不存在") {
        // deleted
        console.log("id: " + idToCheck[i] + "已被站方删除");
        sub[index].active = false;
        await KV.put("sub", JSON.stringify(sub));
        u += 1;
        let message = `#悲报 #id${idToCheck[i]} 已删除，名称为 ${sub[index].title}，最后更新时间为 ${sub[index].lastUpdateTime}`;
        sendNotice(message);
        u += 1;
        console.log("sendNotice with message: " + message);
      } else {
        // 可能由于网络原因，导致请求失败，但是实际上串还在也没有被删除。
        console.log("id: " + idToCheck[i] + "可能已被手退订");
        // 先加error 次数
        sub[index].errorTimes += 1;
        await KV.put("sub", JSON.stringify(sub));
        // 如果超过最大错误次数，就退订
        if (sub[index].errorTimes >= config.maxErrorCount - 1) {
          // -1 以避免是别的原因导致的错误又退订了
          console.log(
            "error over max start notify for " +
              sub[index].errorTimes +
              " times"
          );
          console.log(sub[index]);
          sub[index].active = false;
          await KV.put("sub", JSON.stringify(sub));
          let message = `#删除订阅 #id${idToCheck[i]} 已手动退订，名称为 "${sub[index].title}"，最后更新时间为 ${sub[index].lastUpdateTime}`;
          await sendNotice(message);
          u += 1;
          console.log("sendNotice with message: " + message);
          break;
        }
      }
    }
    if (u > 35) {
      break;
    }
  }
  return true;
}

function addUnreadCount(sub, index, unread) {
  if (sub[index].unread === undefined || sub[index].unread === null) {
    sub[index].unread = unread;
  } else {
    sub[index].unread += unread;
  }
  return sub;
}
