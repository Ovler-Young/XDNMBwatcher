import {
  botBind,
  bot2TG,
  botSub,
  botUnSub,
  botUnSubAll,
  botShare,
  botUnread,
  botRetitle,
  botTelegraph,
  botList,
  botListAll,
  botHelp,
  botLatest,
  botReadAll,
  botPO,
  botRoll,
  botMute
} from "./utils/tgbot";
const { Telegraf } = require("telegraf");
import { config } from "./config";
const bot = new Telegraf(config.TG_TOKEN);

bot.command("list", botList);
bot.command("sub", botSub);
bot.command("unsuball", botUnSubAll);
bot.command("unsub", botUnSub);
bot.command("ping", ctx =>
  ctx.reply("pong", { reply_to_message_id: ctx.update.message.message_id })
);
bot.command("help", botHelp);
bot.command("retitle", botRetitle);
bot.command("bind", botBind);
bot.command("read", botUnread);
bot.command("unread", botUnread);
bot.command("share", botShare);
bot.command("tg", botTelegraph);
bot.command("all", botListAll);
bot.command("roll", botRoll);
bot.command("r", botRoll);
bot.command("latest", botLatest);
bot.command("readall", botReadAll);
bot.command("po", botPO);
bot.command("mute", botMute);
bot.command("sync", bot2TG);
bot.on("message", async ctx => {
  if (
    ctx.update.message.text.includes("nmbxd") ||
    ctx.update.message.text.includes("#id")
  ) {
    await botShare(ctx);
  }
});
export function setTgBot(router) {
  router.post(`/${config.SECRET_PATH}`, async (req, e) => {
    const body = await req.json();
    if (body.message != undefined) {
      const msg = body.message;
      console.log(msg);
      await bot.handleUpdate(body);
      return new Response("ok", { status: 200 });
    } else {
      return new Response("ok", { status: 200 });
    }
  });
}
