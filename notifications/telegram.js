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
    content_safe = content_safe.substring(0, 10)
  }
  await telegram.sendMessage(
    item.sendto,
    `<b>${html(feed.title)}</b>\n#${html(feed.po)
    } | #id${html(feed.id)}|${feed.unread === 1
      ? ""
      : `|Unread: ${feed.unread}`
    }|${
      feed.lastUpdateTime
        ? `${feed.lastUpdateTime.substring(14, 21)}\n`
        : ""
    }${feed.telegraph
      ? item.content
        ? await telegraph(item)
        : ""
      : ""
    }${item.link
      ? `|<a href="${item.link}">Po</a>`
      : ""
    }|${feed.ReplyCountAll
      ? `<a href="${`https://www.nmbxd1.com/t/${item.id}?page=${Math.floor((feed.ReplyCountAll - 1) / 19 + 1)}`}">Latest</a>`
      : `<a href="${`https://www.nmbxd1.com/t/${item.id}?page=1`}">latest</a>`
    }|${feed.LastRead
      ? `<a href="${`https://www.nmbxd1.com/t/${item.id}?page=${Math.floor((feed.LastRead - 1) / 19 + 1)}`}">Read</a>`
      : `<a href="${`https://www.nmbxd1.com/t/${item.id}?page=1`}">read</a>`
    }\n${content_safe}`,
    { parse_mode: "HTML" }
  );
}
export async function replyWhenError(feed,err) {
  const telegram = new Telegram(config.TG_TOKEN);
  await telegram.sendMessage(
    sendto,
    `<b>${html(
      feed.title
    )}</b>\n错误消息为：${err}.`,
    { parse_mode: "HTML" }
  );
}
