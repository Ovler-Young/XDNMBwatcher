import { config } from "../../config.js";
import { cfetch } from "../util.js";
export async function botShare(ctx) {
  console.log("GET BOTSHARE");
  const subraw = (await KV.get("sub")) || "[]";
  let message = ctx.update.message;
  let id = message.text.match(/\d{8}/);
  let sub = JSON.parse(subraw);
  if (id == null) {
    await ctx.reply("未能在消息中找到帖子ID", { reply_to_message_id: ctx.update.message.message_id });
    return;
  } else {
    id = id[0];
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    let msg = "";
    if (find != -1) {
      // get chat id
      const chatid = ctx.update.message.chat.id;
      let kvchange = false;
      if (sub[find].sendto === undefined || sub[find].sendto !== chatid) {
        sub[find].sendto = chatid;
        kvchange = true;
        msg += `已将帖子${sub[find].title}的更新推送至本群\n`;
      }
      if (sub[find].unread !== 0) {
        sub[find].unread = 0;
        //await ctx.reply("已将该帖子标记为已读", { reply_to_message_id: ctx.update.message.message_id });
        msg += `已将帖子${sub[find].title}标记为已读\n`;
        const res_2 = await cfetch(`https://api.nmb.best/Api/thread?id=${id}`);
        sub[find].LastRead = (await res_2.json()).ReplyCount;
        kvchange = true;
      }
      if (kvchange) {
        await KV.put("sub", JSON.stringify(sub));
        msg += "已更新订阅列表";
      }
      if (msg === ""){
        msg = "处理完成";
      }
      await ctx.reply(msg, { reply_to_message_id: ctx.update.message.message_id });
      return;
    } else {
      const resp = await cfetch(`https://api.nmb.best/Api/po?id=${id}`);
      if (resp.status === 200) {
        let feed = {};
        const data = await resp.json();
        if (data.success === false) {
          await ctx.reply(data.error, { reply_to_message_id: ctx.update.message.message_id });
        } else {
          feed.id = id;
          feed.url = `https://www.nmbxd1.com/t/${id}`;
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
          feed.sendto = ctx.update.message.chat.id;
          const now = new Date();
          feed.lastUpdateTime = now;
          sub.push(feed);
          await KV.put("sub", JSON.stringify(sub));
          await ctx.reply(`成功订阅${feed.title}`, { reply_to_message_id: ctx.update.message.message_id });
        }
      } else {
        await ctx.reply("订阅失败，网络错误，请稍后再试", { reply_to_message_id: ctx.update.message.message_id });
      }
    }
  }
}
