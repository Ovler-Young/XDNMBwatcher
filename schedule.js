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
        if (sub[i].xd === undefined) {sub[i].xd = true}
        if (sub[i].xd === true) {
          if (sub[i].po === undefined) {sub[i].po = true}
          if (sub[i].po = true) {
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
            if (ReplyCount != sub[i].ReplyCount) {
              // 页码数 为 ReplyCount 对 19 取模
              const page = parseInt((ReplyCount - 1) / 19) + 1;
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
              let length = data.Replies.length;
              // const reply_id = data.Replies[length - 1].id;
              let reply_title = data.Replies[length - 1].title;
              if (reply_title === "无标题" || reply_title === "") {
                reply_title = data.Replies[length - 1].id;
              }
              sub[i].errorTimes = 0;
              sub[i].lastUpdateTime = data.Replies[length - 1].now;
              sub[i].ReplyCount = ReplyCount;
              if (sub[i].unread === undefined) {
                sub[i].unread = 0;
              } else {
                sub[i].unread += 1;
              }
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
              // parseInt((ReplyCount - 1) / 19) + 1
              sub[i].ReplyCountAll = (await res_2.json()).ReplyCount;
              console.log(sub[i].ReplyCountAll);
              const item = {
                id: sub[i].id,
                link: `https://www.nmbxd1.com/Forum/po/id/${sub[i].id}/page/${page}.html`,
                title: reply_title,
                content: data.Replies[length - 1].content.replace(/<[^>]+>/g, ""),
                telegraph: sub[i].telegraph,
                active: sub[i].active,
                lastUpdateTime: sub[i].lastUpdateTime,
                writer: data.Replies[length - 1].user_hash,
                page: page,
                sendto: sub[i].sendto || config.TG_SENDID,
              };
              await reply(sub[i], item);
              u += sub[i].telegraph ? 3 : 1;
              kvupdate = true;
            }
          } else {
            // for writers other than po
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
      }
      break;
    }
  }
}
