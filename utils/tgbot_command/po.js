import { html } from "../html";
export async function botPO(ctx) {
  let message = ctx.update.message;
  let id = message.text.match(/\d{8}/);
  if (id === null) {
    if (message.reply_to_message != undefined) {
      message = message.reply_to_message;
      id = message.text.match(/\d{8}/);
      if (id === null) {
        await ctx.reply("未在 该消息 及 回复 中找到帖子ID", { reply_to_message_id: ctx.update.message.message_id });
        return;
      } else {
        id = id[0];
      }
    } else {
      await ctx.reply("未在该消息中找到帖子ID", { reply_to_message_id: ctx.update.message.message_id });
      return;
    }
  }
  const subraw = await KV.get("sub");
  let sub = JSON.parse(subraw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", { reply_to_message_id: ctx.update.message.message_id });
  } else {
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    if (find === -1) {
      await ctx.reply("没有找到相关到订阅源", { reply_to_message_id: ctx.update.message.message_id });
    } else {
      // po is the last word
      let po = ctx.update.message.text.split(" ").pop();
      if (po === undefined || po === id) {
        await ctx.reply("获取错误", { reply_to_message_id: ctx.update.message.message_id });
      } else {
        sub[find].issingle = false;
        if (sub[i].writer === undefined) {
            sub[i].writer = [data.user_hash];
        } else if (typeof sub[i].writer === "string") {
            sub[i].writer = [sub[i].writer];
        }
        if (po in sub[i].writer) {
            await ctx.reply("已经是po", { reply_to_message_id: ctx.update.message.message_id });
        } else {
            sub[i].writer.push(po);
            await KV.put("sub", JSON.stringify(sub));
            await ctx.reply(`成功添加 ${po} 至 ${id}\n`, { reply_to_message_id: ctx.update.message.message_id });
        }
      }
    }
  }
}
