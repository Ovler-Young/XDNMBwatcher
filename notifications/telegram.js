import { config } from "../config";
const { Telegram } = require("telegraf");
import { editTelegraph } from "../utils/telegraph";
import { html } from "../utils/html";
export async function reply(feed, item) {
  const telegram = new Telegram(config.TG_TOKEN);

  if (item.lastSendId && item.lastSendId != 0 && item.AutoRemove == 1) {
    try {
      await telegram.deleteMessage(item.SendTo, item.lastSendId);
    } catch (err) {
      console.log(err);
    }
  }

  let telegraph_link = "";
  if (feed.telegraph) {
    if (item.content) {
      telegraph_link = await editTelegraph(item);
      console.log(`telegraph_link: ${telegraph_link}`);
    }
  }
  let message = `<b>${html(feed.title)}</b>\n#${html(item.writer)} | #id${html(
    feed.id
  )}|${
    feed.telegraph ? (item.content ? telegraph_link : "") : ""
  }|<a href="${`https://rssandmore.gcy.workers.dev/1/jumpread?id=${feed.id}`}">Unread: ${
    feed.unread
  }</a>${
    feed.lastUpdateTime ? `|${feed.lastUpdateTime.substring(14, 21)}` : ""
  }|<a href="${`https://rssandmore.gcy.workers.dev/1/jumplast?id=${feed.id}`}">Latest</a>`;
  let send = await telegram.sendMessage(item.SendTo, message, {
    parse_mode: "HTML"
  });
  return send.message_id;
}
export async function replyWhenError(feed, err) {
  const telegram = new Telegram(config.TG_TOKEN);
  let SendTo = config.TG_SENDID;
  await telegram.sendMessage(
    SendTo,
    `<b>${html(feed.title)}</b>, id ${feed.id} 发生错误\n错误消息为：${err}.`,
    { parse_mode: "HTML" }
  );
}

export async function sendNotice(message) {
  const telegram = new Telegram(config.TG_TOKEN);
  let SendTo = config.TG_SENDID;
  console.log(message);
  await telegram.sendMessage(SendTo, message, { parse_mode: "HTML" });
  return true;
}
