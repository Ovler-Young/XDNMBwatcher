import { mode, config } from "./config";
const { reply, replyWhenError } = require(`./notifications/${mode}`);
export async function handleScheduled(event) {
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  //kv has write limit (1000)
  sub.sort(() => Math.random() - 0.5); //random sort
  let k = 0;
  let kvupdate = false;
  let u = 0;
  for (let i = 0; i < sub.length; i++) {
    if (sub[i].active === true) {
      try {
        if (sub[i].sendto === undefined) {sub[i].sendto = config.TG_CHATID}
        if (sub[i].xd === undefined) {sub[i].xd = true}
        if (sub[i].xd === true) {
          if (sub[i].po === undefined) {sub[i].po = true}
          if (sub[i].po === true) {
            const resp = await fetch(
              `https://api.nmb.best/Api/po?id=${sub[i].id}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  cookie: `userhash=${config.COOKIES}`
                }
              }
            );
            u += 1;
            const text = await resp.json();
            if (text.success === false) {
              sub[i].errorTimes += 1;
              kvupdate = true;
              continue;
            }
            const ReplyCount = text.ReplyCount;
            if (sub[i].ReplyCount === undefined) {sub[i].ReplyCount = ReplyCount}
            // while ReplyCount is more than what we have sent, we need to fetch more to avoid missing any replies, so code above is commented out
            if (ReplyCount > sub[i].ReplyCount) {
              // 页码数 为 ReplyCount 对 19 取模
              // Get the total reply count first
              const res_2 = await fetch(
                `https://api.nmb.best/Api/thread?id=${sub[i].id}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    cookie: `userhash=${config.COOKIES}`
                  }
                }
              );
              u += 1;
              sub[i].ReplyCountAll = (await res_2.json()).ReplyCount;
              console.log(sub[i].ReplyCountAll);
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
                if (u >= 25) {
                  break;
                }
                const res = await fetch(
                  `https://api.nmb.best/Api/po?id=${sub[i].id}&page=${page}`,
                  {
                    method: "GET",
                    headers: {
                      "Content-Type": "application/json; charset=utf-8",
                      cookie: `userhash=${config.COOKIES}`
                    }
                  }
                );
                u += 1;
                const data = await res.json();
                let length = 19
                if (page === pageend) {
                  length = ReplyCount % 19;
                }
                for (let j = 0; j < length; j++) {
                  // first check if we can send more
                  if (u >= 25) {
                    break;
                  }
                  // next check if this is an ad
                  if (data.Replies[j].user_hash === "Tips") {
                    continue;
                  }
                  // next, check if this reply is already sent
                  if (sub[i].ReplyCount > 19 * (page - 1) + j + 1) {
                    let reply_title = data.Replies[j].title;
                    if (reply_title === "无标题" || reply_title === "") {
                      reply_title = data.Replies[j].id;
                    }
                    sub[i].errorTimes = 0;
                    sub[i].lastUpdateTime = data.Replies[j].now;
                    // sub[i].ReplyCount = ReplyCount;
                    // we'll not update ReplyCount to the real value, but to the value we have sent
                    // so that we can avoid missing any replies
                    sub[i].ReplyCount = 19 * (page - 1) + j + 1;
                    if (sub[i].unread === undefined) {
                      sub[i].unread = 1;
                    } else {
                      sub[i].unread += 1;
                    }
                    const item = {
                      id: data.Replies[j].id,
                      link: `https://www.nmbxd1.com/Forum/po/id/${sub[i].id}/page/${page}.html`,
                      title: reply_title,
                      content: data.Replies[j].content.replace(/<[^>]+>/g, ""),
                      telegraph: sub[i].telegraph,
                      active: sub[i].active,
                      lastUpdateTime: sub[i].lastUpdateTime,
                      writer: data.Replies[j].user_hash,
                      page: page,
                      sendto: sub[i].sendto || config.TG_SENDID,
                    };
                    await reply(sub[i], item);
                    u += sub[i].telegraph ? 3 : 1;
                    kvupdate = true;
                  }
                }
              }
            }
          } else {
            // for writers other than po
            const resp = await fetch(
              `https://api.nmb.best/Api/thread?id=${sub[i].id}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  cookie: `userhash=${config.COOKIES}`
                }
              }
            );
            u += 1;
            const text = await resp.json();
            if (text.success === false) {
              sub[i].errorTimes += 1;
              kvupdate = true;
              continue;
            }
            const ReplyCount = text.ReplyCount;
            if (ReplyCount != sub[i].ReplyCount) {
              if (u >= 26) {
                console.log("Sent 26 requests, break.")
                break; // will goto next sub
              }
              // 页码数 为 ReplyCount 对 19 取模，截取最后一页
              const page = parseInt((ReplyCount - 1) / 19) + 1;
              const res = await fetch(
                `https://api.nmb.best/Api/thread?id=${sub[i].id}&page=${page}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    cookie: `userhash=${config.COOKIES}`
                  }
                }
              );
              u += 1;
              const data = await res.json();
              let length = data.Replies.length;
              // find the last reply by specified writer(s). The writer(s) is/are specified in the sub[i].writer, which is an array, like ["user1","user2"].
              // if sub[i].writer is not an array, it will be converted to an array with only one element.
              // if sub[i].writer is undefined, it will be converted to an array with only one element, which is the writer of the po.
              if (sub[i].writer === undefined) {
                sub[i].writer = [data.user_hash];
              } else if (typeof sub[i].writer === "string") {
                sub[i].writer = [sub[i].writer];
              }
              let j = length - 1;
              while (j >= 0) {
                if (sub[i].writer.includes(data.Replies[j].user_hash)) {
                  break;
                }
                j -= 1;
              }
              if (j < 0) {
                continue;
              }
              let reply_title = data.Replies[j].title;
              if (reply_title === "无标题" || reply_title === "") {
                reply_title = data.Replies[j].id;
              }
              sub[i].errorTimes = 0;
              sub[i].lastUpdateTime = data.Replies[j].now;
              sub[i].ReplyCount = ReplyCount;
              if (sub[i].unread === undefined) {
                sub[i].unread = 1;
              } else {
                sub[i].unread += 1;
              }
              // no need to get ReplyCountAll again
              const item = {
                id: sub[i].id,
                link: `https://www.nmbxd1.com/Forum/po/id/${sub[i].id}/page/${page}.html`,
                title: reply_title,
                content: data.Replies[j].content.replace(/<[^>]+>/g, ""),
                telegraph: sub[i].telegraph,
                active: sub[i].active,
                lastUpdateTime: sub[i].lastUpdateTime,
                writer: data.Replies[j].user_hash,
                page: page,
                sendto: sub[i].sendto || config.TG_SENDID,
              };
              await reply(sub[i], item);
              u += sub[i].telegraph ? 3 : 1;
              kvupdate = true;
            }
          }
        } else {
          // for XD
        }
      } catch (err) {
        sub[i].errorTimes += 1;
        console.log(err);
        if (sub[i].errorTimes >= config.maxErrorCount) {
          console.log("error over max start notify");
          sub[i].active = false;
          await replyWhenError(sub[i],err);
          await KV.put("sub", JSON.stringify(sub));
          break;
        } else {
          await replyWhenError(sub[i],err);
          await KV.put("sub", JSON.stringify(sub));
        }
      }
      k += 1;
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
        await KV.put("sub", JSON.stringify(sub));
        console.log("kv update");
      }
      break;
    }
    if (u >= 24) {
      if (kvupdate === true) {
        sub.sort((a, b) => {
          if (a.unread === b.unread) {
            return a.id - b.id;
          } else {
            return b.unread - a.unread;
          }
        });
        await fetch (`https://rssandmore.gcy.workers.dev/test`);
        await KV.put("sub", JSON.stringify(sub));
        console.log("kv update");
        console.log("u over 24");
        console.log(sub);
      }
      break;
    }
  }
}
