import { mode, config } from "./config";
const {
  reply,
  replyWhenError,
  sendNotice
} = require(`./notifications/${mode}`);
import { cFetch, addContent } from "./utils/util";

export async function handleScheduled(event) {
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  const uuid = await KV.get("uuid");
  let idToCheck = [];
  // idToCheck = sub.map(item => item.id); only those active
  idToCheck = sub.filter(item => item.active).map(item => item.id);
  console.log("idToCheck: " + idToCheck.length + " " + idToCheck);
  let PHPSESSID = await KV.get("PHPSESSID");
  let retry = 0;
  let u = 2; // 请求次数
  if (PHPSESSID === null || PHPSESSID === undefined) {
    for (retry = 0; retry < 4; retry++) {
      // fetch PHPSESSID
      const PHPSESSIDurl = "https://www.nmbxd1.com/Forum";
      const PHPSESSIDoption = { method: "GET" };
      PHPSESSIDoption.signal = AbortSignal.timeout(1700 * (retry + 1));
      let PHPSESSIDresponse = await fetch(PHPSESSIDurl, PHPSESSIDoption);
      PHPSESSID = PHPSESSIDresponse.headers
        .get("set-cookie")
        .split(";")[0]
        .split("=")[1];
      await KV.put("PHPSESSID", PHPSESSID, { expirationTtl: 7200 });
      u++;
    }
  }

  // 访问 feed 接口，check 是否有新帖子
  let page = 1;
  while (true) {
    const res = await cFetch(
      `https://api.nmb.best/Api/feed?uuid=${uuid}&page=${page}`,
      (PHPSESSID = PHPSESSID)
    );
    u++;
    let feed = await res.json();
    if (feed.length === 0) {
      break;
    }
    for (let i = 0; i < feed.length; i++) {
      let index = sub.findIndex(e => e.id === feed[i].id);
      if (index === -1) { // not found, add to sub
        console.log(
          "未找到" + feed[i].id + "，标题为‘" + feed[i].title ||
            feed[i].content.split("<br />")[0].substring(0, 20) +
              "’，添加到订阅列表"
        );
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
        item.ReplyCountAll = feed[i].reply_count;
        item.unread = 0;
        item.send_message_id = null;
        item.LastRead = feed[i].reply_count;
        sub.push(item);
        let message = `#添加订阅 #id${item.id} <b> ${item.title} </b>\n${
          feed[i].content.split("<br />")[0]
        }\n<a href="https://www.nmbxd1.com/t/${feed[i].id}">点击查看</a>`;
        sendNotice(message);
        console.log("sendNotice with message: " + message);
        KV.put("sub", JSON.stringify(sub));
      } else { // found, check if there is update
        if (
          sub[index].ReplyCount === feed[i].reply_count ||
          sub[index].active === false
        ) { // no update
          idToCheck.splice(idToCheck.indexOf(feed[i].id), 1);
          console.log("id: " + feed[i].id + "title" + feed[i].title + "未更新");
        } else {
          try {
            // 有更新
            console.log(
              "id: " + feed[i].id + "title" + feed[i].title + "有更新"
            );
            let id = feed[i].id;
            // fetch the new replies
            let NewReplyCount = feed[i].reply_count - sub[index].ReplyCount;
            // if greater than 5, set to 5 //todo: 单独请求该api，获取全部的最新回复
            if (NewReplyCount > 5) {
              NewReplyCount = 5;
            }
            // feed[i].recent_replies is the new replies, like [59155555,59155776,59156051,59156065,59156364]
            // we need to get the content of each reply
            let content_all = [];
            let unread = 0;
            let lastUpdateTimeInFeed = feed[i].now;
            for (let j = 0; j < NewReplyCount; j++) {
              // /ref
              console.log(feed[i].recent_replies);
              // and it is in reverse order
              let rep = feed[i].recent_replies
                .toString()
                .split("[")[1]
                .split("]")[0]
                .split(",")
                .map(item => parseInt(item));
              let reverse = rep.reverse();
              console.log(reverse);
              let res = null;
              let data = null;
              res = await cFetch(`https://api.nmb.best/Api/ref?id=${reverse[j]}`, PHPSESSID=PHPSESSID);
              u += 1;
              data = await res.json();
              console.log(data);
              // check if this is sent by po
              // if (data.id in sub[index].recent_replies) { sub[index].recent_replies are string
              try {
                if (sub[index].recent_replies.includes(data.id)) {
                // 跳过
                console.log("跳过");
                // skip to next
                continue;
                }
              }
              catch (err) {
                console.log(err);
                console.log("跳过");
                // send to telegram
                sendNotice(`在处理 #id${id} 时出现错误，错误信息为：${err}`);
              }
              if (
                data.user_hash === sub[index].po ||
                (sub[index].IsSingle === false &&
                  sub[index].writer.includes(data.user_hash))
              ) {
                // if title is not empty or "无标题", we need to add it to the content
                content_all = addContent(id, data, content_all);
                // sub
                // unread
                unread += 1;
                lastUpdateTimeInFeed = data.now;
              }
            }
            let content_join = content_all.join("<br/>");
            console.log("content_join: " + content_join);
            if (content_join !== "") {
              if (sub[index].unread === undefined || sub[index].unread === null) {
                sub[index].unread = unread;
              } else {
                sub[index].unread += unread;
              }
              let item = {
                id: sub[index].id,
                link: `https://www.nmbxd1.com/Forum/po/id/${sub[index].id}/page/${page}.html`,
                title: `${sub[index].title} - ${sub[index].unread}`,
                content: content_join,
                telegraph: sub[index].telegraph,
                active: sub[index].active,
                lastUpdateTime: sub[index].lastUpdateTime,
                writer: sub[index].po,
                page: page,
                SendTo: sub[index].SendTo || config.TG_SENDID,
                lastSendId: sub[index].send_message_id || 0,
                AutoRemove: 1
              };
              sub[index].send_message_id = await reply(sub[index], item);
              sub[index].lastUpdateTime = lastUpdateTimeInFeed; // feed[i].now is the time of the creation of the first reply
              u += sub[index].telegraph ? 3 : 1;
              console.log(`send_message_id: ${sub[index].send_message_id}`);
            }
            sub[index].errorTimes = 0;
            sub[index].ReplyCount = feed[i].reply_count;
            sub[index].recent_replies = feed[i].recent_replies;
            // save the sub to kv
            KV.put("sub", JSON.stringify(sub));
          } catch (err) {
            sub[index].errorTimes += 1;
            console.log(err);
            if (sub[i].errorTimes >= config.maxErrorCount) {
              console.log(
                "error over max start notify for " + sub[i].errorTimes + " times"
              );
              console.log(sub[i]);
              sub[i].active = false;
              KV.put("sub", JSON.stringify(sub));
              await replyWhenError(sub[i], err);
              break;
            } else {
              await KV.put("sub", JSON.stringify(sub));
              await replyWhenError(sub[i], err);
              break;
            }
          }
        }
      }
    }
    page++;
  }
  // 确定
  // for things still in idToCheck, that means they are not in feed, so we need to check if they are deleted
  for (let i = 0; i < idToCheck.length; i++) {
    let index = sub.findIndex(e => e.id === idToCheck[i]);
    if (index !== -1) {
      // check if it is deleted
      let res = await cFetch(
        `https://api.nmb.best/Api/thread?id=${idToCheck[i]}`,
        PHPSESSID=PHPSESSID
      );
      u += 1;
      let data = await res.json();
      console.log(`id=${idToCheck[i]} data=${data}`)
      if (data === "该串不存在") {
        // deleted
        console.log("id: " + idToCheck[i] + "已被站方删除");
        sub[index].active = false;
        KV.put("sub", JSON.stringify(sub));
        u += 1;
        let message = `#悲报 #id${idToCheck[i]} 已删除，名称为 ${sub[index].title}，最后更新时间为 ${sub[index].lastUpdateTime}`;
        sendNotice(message);
        u += 1;
        console.log("sendNotice with message: " + message);
      } else { // 可能由于网络原因，导致请求失败，但是实际上串还在也没有被删除。
        console.log("id: " + idToCheck[i] + "可能已被手退订");
        // 先加error 次数
        sub[index].errorTimes += 1;
        KV.put("sub", JSON.stringify(sub));
        // 如果超过最大错误次数，就退订
        if (sub[index].errorTimes >= config.maxErrorCount - 1) { // -1 以避免是别的原因导致的错误又退订了
          console.log(
            "error over max start notify for " + sub[index].errorTimes + " times"
          );
          console.log(sub[index]);
          sub[index].active = false;
          KV.put("sub", JSON.stringify(sub));
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
