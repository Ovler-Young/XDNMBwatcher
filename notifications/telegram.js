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
  if (feed.telegraph && item.content) {
    let telegram_url = await editTelegraph(item);
    feed.telegraphUrl = telegram_url;
    console.log(`telegram_url: ${telegram_url}`);
    // 如果return的不含https, 则说明出错了,直接插入到content中
    let telegram_html = `<a href="${telegram_url}">tg</a>`;
    // 如果不止一个链接，telegram_url是一个数组
    if (Array.isArray(telegram_url)) {
      telegram_html = telegram_url.map((e, index) => `<a href="${e}">tg${index + 1}</a>`).join(" | ");
    }
    if (telegram_url.indexOf("https") === -1) {
      telegram_html = `<b>同步失败</b> | ${telegram_url}`;
    }
    telegraph_link = `|${telegram_html}`;
  }
  let message = `<b>${html(feed.title)}</b>\n#${html(item.writer)} | #id${html(
    feed.id
  )}${
    feed.telegraph ? (item.content ? telegraph_link : "") : ""
  }|<a href="${`https://rssandmore.gcy.workers.dev/1/jumpread?id=${feed.id}`}">Unread: ${
    feed.unread
  }</a>${
    feed.lastUpdateTime ? `|${feed.lastUpdateTime}` : ""
  }|<a href="${`https://rssandmore.gcy.workers.dev/1/jumplast?id=${feed.id}`}">Latest</a>`;
  let send = await telegram.sendMessage(item.SendTo, message, {
    parse_mode: "HTML"
  });
  feed.send_message_id = send.message_id;
  return feed;
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
