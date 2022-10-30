import { config } from "../config";
const { Telegram } = require("telegraf");
import { telegraph } from "../utils/telegraph";
import { html } from "../utils/html";
export async function reply(feed, item) {
  const telegram = new Telegram(config.TG_TOKEN);
  let content_safe = item.content.replace(/<[^>]+>/g, "");
  let lines = content_safe.split("\n");
  console.log(lines);
  content_safe = "";
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("尾") != -1 || /\d/.test(lines[i])) {
      content_safe += lines[i] + "\n";
    }
  }
  console.log(`选出: ${content_safe}`);
  if (content_safe.lenth > 30) {
    content_safe = content_safe.substring(0, 10);
  }
  await telegram.sendMessage(
    item.sendto,
    `<b>${html(feed.title)}</b>\n#${html(feed.po)} | #id${html(
      feed.id
    )}|<a href="${`https://rssandmore.gcy.workers.dev/1/jumpread?id=${item.id}`}">Unread: ${feed.unread
    }</a>|${feed.lastUpdateTime ? `${feed.lastUpdateTime.substring(14, 21)}|` : ""
    }${feed.telegraph ? (item.content ? await telegraph(item) : "") : ""}${item.link ? `|<a href="${item.link}">Po</a>` : ""
    }|<a href="${`https://rssandmore.gcy.workers.dev/1/jumplast?id=${item.id}`}">Latest</a>\n${content_safe}`,
    { parse_mode: "HTML" }
  );
}
export async function replyWhenError(feed, err) {
  const telegram = new Telegram(config.TG_TOKEN);
  await telegram.sendMessage(
    sendto,
    `<b>${html(feed.title)}</b>\n错误消息为：${err}.`,
    { parse_mode: "HTML" }
  );
}
