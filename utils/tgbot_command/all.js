import { html } from "../html";
export async function botListAll(ctx) {
  let subraw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(subraw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", { reply_to_message_id: ctx.update.message.message_id });
  } else {
    let msg = "";
    let n = 0;
    for (let i = 0; i < sub.length; i++) {
      n += 1;
      msg += `${n}.\t<a href="${sub[i].url}">${html(sub[i].title)}</a>\n <code>#id${sub[i].id}</code> <code> Upd:${sub[i].lastUpdateTime.toLocaleString().substr(5,13)}</code><code> Unread: </code>${sub[i].unread}\n`;
    }
    while (msg.split("\n").length > 20) {
      let msg1 = msg.split("\n");
      let msg2 = msg1.slice(0, 20);
      msg1 = msg1.slice(20);
      msg = msg1.join("\n");
      await ctx.reply(msg2.join("\n"), { reply_to_message_id: ctx.update.message.message_id, parse_mode: "HTML" });
    }
    await ctx.reply(msg, { parse_mode: "HTML" , reply_to_message_id: ctx.update.message.message_id });
  }
}
