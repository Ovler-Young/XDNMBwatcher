export async function botMute(ctx) {
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
      await ctx.reply("没有找到相关到订阅", { reply_to_message_id: ctx.update.message.message_id });
    } else {
      const title = sub[find].title;
      // Autoremove1
      sub[find].Autoremove = 1;
      await KV.put("sub", JSON.stringify(sub));
      await ctx.reply(`已将 ${title} 的推送设置为仅推送最后一次`, { reply_to_message_id: ctx.update.message.message_id });
    }
  }
}
