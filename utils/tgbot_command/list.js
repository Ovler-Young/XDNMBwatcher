import { html } from "../html";
export async function botList(ctx) {
  let subraw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(subraw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", { reply_to_message_id: ctx.update.message.message_id });
  } else {
    let msg = "";
    let chat_id = ctx.update.message.chat.id;
    let chat_name = ctx.update.message.chat.title;
    let n = 0;
    if (chat_name === undefined) {
      msg += `默认地点订阅：\n`;
      for (let i = 0; i < sub.length; i++) {
        n += 1;
        if (sub[i].sendto === chat_id || sub[i].sendto === undefined) {
          msg += `${n}.\t<a href="${sub[i].url}">${html(sub[i].title)}</a>\n #id${sub[i].id}<code>Upd:${sub[i].lastUpdateTime.toLocaleString().substr(5,13)}</code><code> Unread: </code>${sub[i].unread}\n`;
        }
      }
    } else {
      msg += `在 ${chat_name} 中的订阅：\n`;
      for (let i = 0; i < sub.length; i++) {
        n += 1;
        if (sub[i].sendto === chat_id) {
          msg += `${n}.\t<a href="${sub[i].url}">${html(sub[i].title)}</a>\n #id${sub[i].id}<code>Upd:${sub[i].lastUpdateTime.toLocaleString().substr(5,13)}</code><code> Unread: </code>${sub[i].unread}\n`;
        }
      }
    }
    // if msg is longer than 31 lines, split it
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
