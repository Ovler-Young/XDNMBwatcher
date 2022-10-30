export async function botReadAll(ctx) {
  let subraw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(subraw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", { reply_to_message_id: ctx.update.message.message_id });
  } else {
    let msg = "";
    let n = 0;
    for (let i = 0; i < sub.length; i++) {
      if (sub[i].unread > 0) {
        n += 1;
        sub[i].unread = 0;
        sub[i].LastRead = sub[i].ReplyCountAll;
      }
    }
    msg += `已将 ${n} 个订阅标记为已读`;
    await KV.put("sub", JSON.stringify(sub));
    while (msg.split("\n").length > 31) {
      let msg1 = msg.split("\n");
      let msg2 = msg1.slice(0, 31);
      msg1 = msg1.slice(31);
      msg = msg1.join("\n");
      await ctx.reply(msg2.join("\n"), { reply_to_message_id: ctx.update.message.message_id, parse_mode: "HTML" });
    }
    await ctx.reply(msg, { parse_mode: "HTML" , reply_to_message_id: ctx.update.message.message_id });
  }
}
