import { html } from "../html";
export async function botUnread(ctx) {
  let subraw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(subraw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", { reply_to_message_id: ctx.update.message.message_id });
  } else {
    let msg = "";
    let kvchange = false
    sub.sort((a, b) => {
      if (a.unread === b.unread) {
        return a.id - b.id;
      } else {
        return b.unread - a.unread;
      }
    });
    for (let i = 0; i < sub.length; i++) {
      if (sub[i].unread === undefined) {
        sub[i].unread = 0;
        kvchange = true;
      } else if (sub[i].unread > 0) {
        msg += `${i}.\t<a href="${sub[i].url}">${html(sub[i].title)}</a>\n #id${sub[i].id}<code>Upd:${sub[i].lastUpdateTime.toLocaleString().substr(5,13)}</code><code> Unread: </code>${sub[i].unread}\n`;
      }
    }
    if (kvchange) {
      await KV.put("sub", JSON.stringify(sub));
      msg += "已更新订阅列表";
    }
    if (msg === "") {
      await ctx.reply("没有未读消息", { reply_to_message_id: ctx.update.message.message_id });
    } else {
      while (msg.split("\n").length > 31) {
        let msg1 = msg.split("\n");
        let msg2 = msg1.slice(0, 31);
        msg1 = msg1.slice(31);
        msg = msg1.join("\n");
        await ctx.reply(msg2.join("\n"), { reply_to_message_id: ctx.update.message.message_id, parse_mode: "HTML" });
      }
      await ctx.reply(msg, { parse_mode: "HTML" , reply_to_message_id: ctx.update.message.message_id });
    }
    //await ctx.reply(msg, { parse_mode: "HTML" });
  }
}
