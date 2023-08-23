import { mode, config } from "./config";
const {
  reply,
  replyWhenError,
  sendNotice
} = require(`./notifications/${mode}`);
import { cfetch } from "./utils/util";
export async function handleScheduled(event) {
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const uuid = await KV.get("uuid");
  let idtocheck = [];
  idtocheck = sub.map(item => item.id);
  console.log("idtocheck: " + idtocheck.length + " " + idtocheck);
  let phpssid = await KV.get("phpssid");
  let retry = 0;
  let u = 2; // 请求次数
  if (phpssid === null || phpssid === undefined) {
    for (retry = 0; retry < 4; retry++) {
      // fetch phpssid
      const phpssidurl = "https://www.nmbxd1.com/Forum";
      const phpssidoption = { method: "GET" };
      phpssidoption.signal = AbortSignal.timeout(1700 * (retry + 1));
      let phpssidresponse = await fetch(phpssidurl, phpssidoption);
      phpssid = phpssidresponse.headers
        .get("set-cookie")
        .split(";")[0]
        .split("=")[1];
      await KV.put("phpssid", phpssid, { expirationTtl: 7200 });
      u++;
    }
  }
  let allid = idtocheck;

  // 访问 feed 接口，check 是否有新帖子
  let page = 1;
  while (true) {
    const res = await cfetch(
      `https://api.nmb.best/Api/feed?uuid=${uuid}&page=${page}`,
      (phpssid = phpssid)
    );
    u++;
    let feed = await res.json();
    if (feed.length === 0) {
      break;
    }
    for (let i = 0; i < feed.length; i++) {
      let index = sub.findIndex(e => e.id === feed[i].id);
      if (index === -1) {
        // not found
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
        item.sendto = config.TG_SENDID;
        item.lastUpdateTime = feed[i].now;
        item.xd = true;
        item.issingle = true;
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
      } else {
        allid.splice(allid.indexOf(feed[i].id), 1);
        if (
          sub[index].ReplyCount === feed[i].reply_count ||
          sub[index].active === false
        ) {
          idtocheck.splice(idtocheck.indexOf(feed[i].id), 1);
          // console.log("id: " + feed[i].id + "title" + feed[i].title + "未更新");
        } else {
          try {
            // 有更新
            console.log(
              "id: " + feed[i].id + "title" + feed[i].title + "有更新"
            );
            // featch the new replies
            let newreplycount = feed[i].reply_count - sub[index].LastRead;
            // if greater than 5, set to 5
            if (newreplycount > 5) {
              newreplycount = 5;
            }
            // feed[i].recent_replies is the new replies, like [59155555,59155776,59156051,59156065,59156364]
            // we need to get the content of each reply
            let content_all = [];
            let unread = 0;
            let lastUpdateTimeinFeed = feed[i].now;
            for (let j = 0; j < newreplycount; j++) {
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
              res = await cfetch(`https://api.nmb.best/Api/ref?id=${reverse[j]}`, phpssid=phpssid);
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
              }
              if (
                data.user_hash === sub[index].po ||
                (sub[index].issingle === false &&
                  sub[index].writer.includes(data.user_hash))
              ) {
                // if title is not empty or "无标题", we need to add it to the content
                if (data.title !== "" && data.title !== "无标题") {
                  content_all.push(
                    `<a href="https://www.nmbxd1.com/t/${feed[i].id}?r=${data.id}">${data.title}</a><br/>`
                  );
                } else {
                  content_all.push(
                    `<a href="https://www.nmbxd1.com/t/${feed[i].id}?r=${data.id}">#${data.id}</a>`
                  );
                }
                // <br/>
                content_all.push("<br/>");
                // if so, we need to get the content
                content_all.push(
                  data.content
                    .replace(/<[^>]+>/g, "")
                    .replace(
                      /&gt;&gt;No\.(\d+)/g,
                      `<a href="https://www.nmbxd1.com/Home/Forum/ref?id=$1">>>No.$1</a>`
                    )
                ); //https://www.nmbxd1.com/Home/Forum/ref?id=57858642
                // if there is an image, we need to add it to the content
                if (data.ext !== "") {
                  content_all.push(
                    `<img src="https://image.nmb.best/image/${data.img}${data.ext}">`
                  );
                }
                // sub
                // unread
                unread += 1;
                lastUpdateTimeinFeed = data.now;
              }
            }
            let content_join = content_all.join("<br/>");
            console.log("content_join: " + content_join);
            if (content_join !== "") {
              let item = {
                id: sub[index].id,
                link: `https://www.nmbxd1.com/Forum/po/id/${sub[index].id}/page/${page}.html`,
                title: `${sub[index].title} - ${newreplycount}条新回复`,
                content: content_join,
                telegraph: sub[index].telegraph,
                active: sub[index].active,
                lastUpdateTime: sub[index].lastUpdateTime,
                writer: sub[index].po,
                page: page,
                sendto: sub[index].sendto || config.TG_SENDID,
                lastSendId: sub[index].send_message_id || 0,
                Autoremove: sub[index].Autoremove || 0
              };
              sub[index].send_message_id = await reply(sub[index], item);
              sub[index].lastUpdateTime = lastUpdateTimeinFeed; // feed[i].now is the time of the creation of the first reply
              u += sub[index].telegraph ? 3 : 1;
              console.log(`send_message_id: ${sub[index].send_message_id}`);
            }
            sub[index].errorTimes = 0;
            sub[index].ReplyCount = feed[i].reply_count;
            sub[index].recent_replies = feed[i].recent_replies;
            if (sub[index].unread === undefined || sub[index].unread === null) {
              sub[index].unread = unread;
            } else {
              sub[index].unread += unread;
            }
            // save the sub to kv
            KV.put("sub", JSON.stringify(sub));
          } catch (err) {
            sub[index].errorTimes += 1;
            console.log(err);
            if (sub[i].errorTimes >= config.maxErrorCount) {
              console.log(
                "error over max start notifyfor " + sub[i].errorTimes + " times"
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
  console.log("allid: " + allid.length + " " + allid);
  // 确定
  return idtocheck;
}
