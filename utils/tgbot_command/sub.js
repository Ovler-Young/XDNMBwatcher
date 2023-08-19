import { config } from "../../config.js";
import { cfetch } from "../util.js";
export async function botSub(ctx) {
  let message = ctx.update.message;
  let id = message.text.match(/\d{8}/);
  if (id === null) {
    if (message.reply_to_message != undefined) {
      message = message.reply_to_message;
      id = message.text.match(/\d{8}/);
      if (id === null) {
        await ctx.reply("未在 该消息 及 回复 中找到帖子ID", {
          reply_to_message_id: ctx.update.message.message_id
        });
        return;
      } else {
        id = id[0];
      }
    } else {
      await ctx.reply("未在该消息中找到帖子ID", {
        reply_to_message_id: ctx.update.message.message_id
      });
      return;
    }
  }
  const resp = await cfetch(`https://api.nmb.best/Api/po?id=${id}`);
  if (resp.status === 200) {
    let feed = {};
    const data = await resp.json();
    if (data.success === false) {
      await ctx.reply(data.error, {
        reply_to_message_id: ctx.update.message.message_id
      });
    } else {
      const subraw = (await KV.get("sub")) || "[]";
      let sub = JSON.parse(subraw);
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
      if (sub.findIndex(e => e.url === feed.url) != -1) {
        await ctx.reply("已经订阅过此信息源", {
          reply_to_message_id: ctx.update.message.message_id
        });
      } else {
        const now = new Date();
        feed.lastUpdateTime = now;
        sub.push(feed);
        await KV.put("sub", JSON.stringify(sub));
        await ctx.reply(`成功订阅 ${feed.title}`, {
          reply_to_message_id: ctx.update.message.message_id
        });
      }
    }
  } else {
    await ctx.reply("订阅失败", {
      reply_to_message_id: ctx.update.message.message_id
    });
  }
}
