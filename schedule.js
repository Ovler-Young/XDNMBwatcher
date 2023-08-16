import { mode, config } from "./config";
const { reply, replyWhenError, sendNotice } = require(`./notifications/${mode}`);
import { cfetch } from "./utils/util";
export async function handleScheduled(event) {
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  const uuid = await KV.get("uuid");
  let idtocheck = [];
  idtocheck = sub.map((item) => item.id);
  console.log("idtocheck: " + idtocheck.length + " " + idtocheck);
  let u = 2; // 请求次数

 
  // 访问 feed 接口，check 是否有新帖子
  let page = 1;  while (true) {
    const res = await fetch(`https://api.nmb.best/Api/feed?uuid=${uuid}&page=${page}`);
    u ++;
    let feed = await res.json();
    if (feed.length === 0) {
      break;
    }
    for (let i = 0; i < feed.length; i++) {
      let index = sub.findIndex(e => e.id === feed[i].id);
      if (index === -1) {
        // not found
        console.log("未找到" + feed[i].id + "，标题为‘" + feed[i].title||feed[i].content.split("<br />")[0].substring(0, 20) + "’，添加到订阅列表");
        let item = {};
        item.id = feed[i].id;
        item.url = `https://www.nmbxd1.com/t/${feed[i].id}`;
        item.po = feed[i].user_hash;
        item.title = feed[i].title || feed[i].content.split("<br />")[0].substring(0, 20);
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
        let message = `#添加订阅 #id${item.id} <b> ${item.title} </b> \n\n <a href="https://www.nmbxd1.com/t/${feed[i].id}">点击查看</a><a href="https://api.nmb.best/Api/delFeed?tid=${item.id}&uuid=${uuid}">点击删除</a>`
        sendNotice(message);
        console.log("sendNotice with message: " + message);
      } else {
        if (sub[index].ReplyCountAll === feed[i].reply_count) {
          idtocheck.splice(idtocheck.indexOf(feed[i].id), 1);
          console.log("id: " + feed[i].id + "title" + feed[i].title + "未更新");
        }
      }
    }
    page ++;
  }

  //kv has write limit (1000)
  // sub.sort(() => Math.random() - 0.5); //random sort
  // No Random sort. If last try didn't finish, we should try to finish it first.
  // first, if there unfinished is true, we should try to finish it first
  // otherwise we will randomly sort the sub list
  let notinclude = sub.filter((item) => !idtocheck.includes(item.id));
  sub = sub.filter((item) => idtocheck.includes(item.id));
  console.log("sub: " + sub.length + " " + sub.map((item) => item.id));
  if (sub.length > 0) {
    if (sub[sub.length - 1].unfinished === true) {
      // move the unfinished to the front
      sub.push(sub.pop());
    } else {
      sub.sort(() => Math.random() - 0.5); //random sort
    }
  } else {
    console.log("无有新回复的订阅");
    return;
  }
  let k = 0;
  let kvupdate = false;
  for (let i = 0; i < sub.length; i++) {
    if (sub[i].active === true && sub[i].errorTimes < config.maxErrorCount) {
      try {
        if (sub[i].sendto === undefined) {sub[i].sendto = config.TG_CHATID}
        if (sub[i].xd === undefined) {sub[i].xd = true}
        if (sub[i].xd === true) {
          if (sub[i].issingle === undefined) {sub[i].issingle = true}
          if (sub[i].issingle === true) {
            const resp = await cfetch(`https://api.nmb.best/Api/po?id=${sub[i].id}`);
            u += 1;
            const text = await resp.json();
            if (text.success === false) {
              sub[i].errorTimes += 1;
              kvupdate = true;
              console.log(`sub ${sub[i].id} errorTimes: ${sub[i].errorTimes} network error`);
              continue;
            }
            const ReplyCount = text.ReplyCount;
            if (sub[i].po === true || sub[i].po === undefined || sub[i].po === false) { sub[i].po = text.user_hash ; kvupdate = true; console.log("po"); console.log(sub[i].po); console.log(sub[i].id); }
            if (sub[i].ReplyCount === undefined) {sub[i].ReplyCount = ReplyCount}
            // while ReplyCount is more than what we have sent, we need to fetch more to avoid missing any replies, so code above is commented out
            if (ReplyCount > sub[i].ReplyCount) {
              // 页码数 为 ReplyCount 对 19 取模
              // Get the total reply count first
              const res_2 = await cfetch(`https://api.nmb.best/Api/thread?id=${sub[i].id}`);
              u += 1;
              sub[i].ReplyCountAll = (await res_2.json()).ReplyCount;
              console.log(`ReplyCountAll: ${sub[i].ReplyCountAll}`);
              console.log(`Replycount in sub: ${sub[i].ReplyCount}`);
              console.log(`Replycount in api: ${ReplyCount}`);
              // calculate the start page and end page and how many replies can be sent.
              // the web request is limited to 30 per time, so we need to split the request into several times
              const pagestart = parseInt((sub[i].ReplyCount - 1) / 19) + 1;
              const pageend = parseInt((ReplyCount - 1) / 19) + 1;
              // if telegraph is enabled, we need to send 3 requests for each reply, or 1 requests for each reply
              // and, for each page, we need another 1 request to get the reply content
              // so, we need to calculate how many requests can be sent in total
              // the limit is checked in the for loop below and each time we send a request.
              for (let page = pagestart; page <= pageend; page++) {
                // first check if we can send more
                console.log(`page: ${page}`);
                if (u >= 46) {
                  break;
                }
                // let content_all = "";
                let content_all = [];
                const res = await cfetch(`https://api.nmb.best/Api/po?id=${sub[i].id}&page=${page}`);
                u += 1;
                const data = await res.json();
                console.log(`get page ${page} of ${sub[i].id}`);
                let length = data.Replies.length;
                console.log(`there are ${length} replies in this page`);
                for (let j = 0; j < length; j++) {
                  // next check if this is an ad
                  if (data.Replies[j].user_hash === "Tips") {
                    continue;
                  }
                  // next, check if this reply is already sent
                  if (sub[i].ReplyCount < 19 * (page - 1) + j + 1) {
                    let reply_title = data.Replies[j].title;
                    sub[i].errorTimes = 0;
                    sub[i].lastUpdateTime = data.Replies[j].now;
                    sub[i].ReplyCountNow = 19 * (page - 1) + j + 1;
                    if (sub[i].unread === undefined) {
                      sub[i].unread = 1;
                    } else {
                      sub[i].unread += 1;
                    }
                    content_all.push(`<br/><a href="https://www.nmbxd1.com/t/${sub[i].id}?r=${data.Replies[j].id}">${reply_title}</a>`);
                    if (data.Replies[j].ext !== "") {
                      content_all.push(`<img src="https://image.nmb.best/image/${data.Replies[j].img}${data.Replies[j].ext}">`);
                    }
                    // content_all += data.Replies[j].content.replace(/<[^>]+>/g, "");
                    content_all.push(data.Replies[j].content.replace(/<[^>]+>/g, "").replace(/&gt;&gt;No\.(\d+)/g, `<a href="https://www.nmbxd1.com/t/${sub[i].id}?r=$1">>>No.$1</a>`));
                  } else {
                  }
                  // check if we can send more
                  if (u >= 47) {
                    sub[i].unfinished = true;
                    kvupdate = true;
                    break;
                  } 
                }
                let content_join = content_all.join("<br/>");
                if (content_join !== "") {
                  let item = {
                    id: sub[i].id,
                    link: `https://www.nmbxd1.com/Forum/po/id/${sub[i].id}/page/${page}.html`,
                    title: `【${sub[i].title}】page${page}`,
                    content: content_join,
                    telegraph: sub[i].telegraph,
                    active: sub[i].active,
                    lastUpdateTime: sub[i].lastUpdateTime,
                    writer: sub[i].po,
                    page: page,
                    sendto: sub[i].sendto || config.TG_SENDID,
                    lastSendId: sub[i].send_message_id || 0,
                    Autoremove: sub[i].Autoremove || 0,
                  };
                  sub[i].ReplyCount = sub[i].ReplyCountNow;
                  sub[i].send_message_id = await reply(sub[i], item);
                  console.log(`send_message_id: ${sub[i].send_message_id}`);
                  u += sub[i].telegraph ? 3 : 1;
                  kvupdate = true;
                  console.log(`kvupdate after sent ${sub[i].title} page ${page}`);
                }
              }
            }
          } else {
            // for writers other than po
            const resp = await cfetch(`https://api.nmb.best/Api/thread?id=${sub[i].id}`);
            u += 1;
            const text = await resp.json();
            if (text.success === false) {
              sub[i].errorTimes += 1;
              kvupdate = true;
              console.log("error");
              continue;
            }
            const ReplyCount = text.ReplyCount;
            sub[i].ReplyCountAll = ReplyCount;
            if (sub[i].po === true || sub[i].po === undefined || sub[i].po === false) {
              if (sub[i].writer === undefined) {
                sub[i].writer = [data.user_hash];
                sub[i].po = data.user_hash;
                kvupdate = true;
                console.log(`1po changed to ${sub[i].po}`);
              } else if (typeof sub[i].writer === "string") {
                sub[i].po = sub[i].writer;
                sub[i].writer = [sub[i].writer];
                kvupdate = true;
                console.log(`2po changed to ${sub[i].po}`);
              } else if (typeof sub[i].po === "object" && sub[i].writer.length > 0) {
                // convert all writers to string
                let poinstr = sub[i].writer.map((item) => item.toString());
                if (poinstr !== sub[i].po) {
                  sub[i].po = poinstr;
                  kvupdate = true;
                  console.log(`3po changed to ${sub[i].po}`);
                }
              } else {
                sub[i].po = sub[i].writer[0];
                kvupdate = true;
                console.log(`4po changed to ${sub[i].po}`);
              }
            }
            if (ReplyCount != sub[i].ReplyCount) {
              if (u >= 46) {
                console.log("Sent 26 requests, break.")
                sub[i].unfinished = true;
                break; // will goto next sub
              }
              console.log(`Replycount in sub: ${sub[i].ReplyCount}`);
              console.log(`Replycount in api: ${sub[i].ReplyCountAll}`);
              const pagestart = parseInt((sub[i].ReplyCount - 1) / 19) + 1;
              const pageend = parseInt((sub[i].ReplyCountAll - 1) / 19) + 1;
              console.log(`pagestart: ${pagestart}`);
              console.log(`pageend: ${pageend}`);
              for (let page = pagestart; page <= pageend; page++) {
                console.log(`page: ${page}`);
                const res = await cfetch(`https://api.nmb.best/Api/thread?id=${sub[i].id}&page=${page}`);
                u += 1;
                // let content_all = "";
                let content_all = [];
                const data = await res.json();
                let length = data.Replies.length;
                console.log(`length: ${length}`);
                for (let j = 0; j < length; j++) {
                  if (j + 1 + (page - 1) * 19 <= sub[i].ReplyCount) {
                    continue;
                  }
                  if (sub[i].writer.includes(data.Replies[j].user_hash)) {
                    let reply_title = data.Replies[j].title;
                    if (reply_title === "无标题" || reply_title === "") {
                      let reply_title = data.Replies[j].id;
                    }
                    console.log(`reply_title: ${reply_title}`);
                    sub[i].errorTimes = 0;
                    sub[i].lastUpdateTime = data.Replies[j].now;
                    sub[i].ReplyCount = ReplyCount;
                    if (sub[i].unread === undefined) {
                      sub[i].unread = 1;
                    } else {
                      sub[i].unread += 1;
                    }
                    // 图片
                    // 图片地址为 https://image.nmb.best/ + data.Replies[j].img + data.Replies[j].ext
                    // 如果 data.Replies[j].ext 为空，则没有图片
                    // no need to get ReplyCountAll again
                    // not send to telegram every time, but combine them
                    if (data.Replies[j].ext !== "") {
                      content_all.push(`<img src="https://image.nmb.best/image/${data.Replies[j].img}${data.Replies[j].ext}">`);
                    }
                    // content_all += data.Replies[j].content.replace(/<[^>]+>/g, "");
                    content_all.push(data.Replies[j].content.replace(/<[^>]+>/g, "").replace(/&gt;&gt;No\.(\d+)/g, `<br/><a href="https://www.nmbxd1.com/Home/Forum/ref?id=$1">>>No.$1</a>`));
                  }
                }
                let content_join = content_all.join("<br/>");
                if (content_join !== "") {
                  const item = {
                    id: sub[i].id,
                    link: `https://www.nmbxd1.com/Forum/po/id/${sub[i].id}/page/${page}.html`,
                    title: `${sub[i].title} - ${sub[i].ReplyCount - sub[i].ReplyCountAll + 1}条新回复`,
                    content: content_join,
                    telegraph: sub[i].telegraph,
                    active: sub[i].active,
                    lastUpdateTime: sub[i].lastUpdateTime,
                    writer: sub[i].po,
                    page: page,
                    sendto: sub[i].sendto || config.TG_SENDID,
                  };
                  await reply(sub[i], item);
                  u += sub[i].telegraph ? 3 : 1;
                  kvupdate = true;
                  console.log("send to telegram for non-po reply");
                }
              }
            }
          }
        } else {
          // for XD
        }
      } catch (err) {
        sub[i].errorTimes += 1;
        console.log(err);
        if (sub[i].errorTimes >= config.maxErrorCount) {
          console.log("error over max start notifyfor " + sub[i].errorTimes + " times");
          console.log(sub[i]);
          sub[i].active = false;
          kvupdate = true;
          // merge sub and notinclude
          sub = sub.concat(notinclude);
          await replyWhenError(sub[i],err);
          await KV.put("sub", JSON.stringify(sub));
          break;
        } else {
          await replyWhenError(sub[i],err);
          sub = sub.concat(notinclude);
          await KV.put("sub", JSON.stringify(sub));
          break;
        }
      }
      k += 1;
    } else if (sub[i].errorTimes >= config.maxErrorCount) {
      console.log("error over max start notify");
      console.log(sub[i]);
      sub[i].active = false;
      kvupdate = true;
      // remove the sub from the list
      sub.splice(i, 1);
      i -= 1;
      await replyWhenError(sub[i],"error over max start notify for " + sub[i].errorTimes + " times");
      sub = sub.concat(notinclude);
      await KV.put("sub", JSON.stringify(sub));
      break;
    }
    if (k === sub.length) {
      if (kvupdate === true) {
        sub.sort((a, b) => {
          if (a.unread === b.unread) {
            return a.id - b.id;
          } else {
            return b.unread - a.unread;
          }
        });
        sub = sub.concat(notinclude);
        await KV.put("sub", JSON.stringify(sub));
        console.log("kv update");
      }
      break;
    }
    if (u >= 44) {
      if (kvupdate === true) {
        sub.sort((a, b) => {
          if (a.unread === b.unread) {
            return a.id - b.id;
          } else {
            return b.unread - a.unread;
          }
        });
        sub = sub.concat(notinclude);
        await KV.put("sub", JSON.stringify(sub));
        console.log("kv update");
        console.log("u over 24");
        console.log(sub);
      }
      break;
    }
  }
}
