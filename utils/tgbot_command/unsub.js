export async function botUnSub(ctx) {
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
      sub.splice(find, 1);
      await KV.put("sub", JSON.stringify(sub));
      const uuid = await KV.get("uuid");
      console.log(uuid);
      const addFeedres = await fetch(
        `https://api.nmb.best/Api/delFeed?uuid=${uuid}&tid=${sub[index].id}`
      );
      // decode the response
      // ""\u53d6\u6d88\u8ba2\u9605\u6210\u529f!"" （取消订阅成功！） -> 取消订阅成功！
      const addFeedresText = await addFeedres.text();
      console.log(addFeedresText);
      if (addFeedresText === '"\u53d6\u6d88\u8ba2\u9605\u6210\u529f!"') {
        await ctx.reply(`成功取消订阅 ${title}`, { reply_to_message_id: ctx.update.message.message_id });
      } else {
        // error
        // return the error message
        await ctx.reply(`取消订阅 ${title} 在feed失败`, { reply_to_message_id: ctx.update.message.message_id });
      }
    }
  }
}
