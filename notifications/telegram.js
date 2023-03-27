import { config } from "../config";
const { Telegram } = require("telegraf");
import { telegraph } from "../utils/telegraph";
import { html } from "../utils/html";
export async function reply(feed, item) {
  const telegram = new Telegram(config.TG_TOKEN);
  let content_all = item.content.replace(/<[^>]+>/g, "");
  let lines = content_all.split("\n").slice(0, 20);
  console.log(lines);
  let content_safe_all = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("尾") != -1 || /\d/.test(lines[i])) {
      content_safe_all.push(lines[i]);
    }
  }
  let content_safe = content_safe_all.join("\n");
  console.log(`选出: ${content_safe}`);
  await telegram.sendMessage(
    item.sendto,
    `<b>${html(feed.title)}</b>\n#${html(item.writer)} | #id${html(
      feed.id
    )}|${feed.telegraph ? (item.content ? await telegraph(item) : "") : ""}|${item.link ? `<a href="${item.link}">Po</a>` : ""
    }|<a href="${`https://rssandmore.gcy.workers.dev/1/jumpread?id=${feed.id}`}">Unread: ${feed.unread
    }</a>${feed.lastUpdateTime ? `|${feed.lastUpdateTime.substring(14, 21)}` : ""
    }|<a href="${`https://rssandmore.gcy.workers.dev/1/jumplast?id=${feed.id}`}">Latest</a>|${item.id}\n${content_safe}`,
    { parse_mode: "HTML" }
  );
}
export async function replyWhenError(feed, err) {
  const telegram = new Telegram(config.TG_TOKEN);
  let sendto = config.TG_SENDTO;
  await telegram.sendMessage(
    sendto,
    `<b>${html(feed.title)}</b>\n错误消息为：${err}.`,
    { parse_mode: "HTML" }
  );
}
