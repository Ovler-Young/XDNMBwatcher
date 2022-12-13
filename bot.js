import { botList } from "./utils/tgbot_command/list";
import { botSub } from "./utils/tgbot_command/sub";
import { botUnSub } from "./utils/tgbot_command/unsub";
import { botUnSubAll } from "./utils/tgbot_command/unsuball";
import { botHelp } from "./utils/tgbot_command/help";
import { botRetitle } from "./utils/tgbot_command/retitle";
import { botBind } from "./utils/tgbot_command/bind";
import { botShare } from "./utils/tgbot_command/share";
import { botUnread } from "./utils/tgbot_command/unread";
import { botTelegraph } from "./utils/tgbot_command/telegraph";
import { botListAll } from "./utils/tgbot_command/all"; 
import { botRoll } from "./utils/tgbot_command/roll_banner";
import { botLatest } from "./utils/tgbot_command/latest";
import { botReadAll } from "./utils/tgbot_command/readall";
import { botPO } from "./utils/tgbot_command/po";
const { Telegraf } = require("telegraf");
import { config } from "./config";
const bot = new Telegraf(config.TG_TOKEN);

bot.command("list", botList);
bot.command("sub", botSub);
bot.command("unsuball", botUnSubAll);
bot.command("unsub", botUnSub);
bot.command("ping", ctx => ctx.reply("pong", { reply_to_message_id: ctx.update.message.message_id }));
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
bot.on("message", async ctx => {
  if (ctx.update.message.text.includes("nmbxd") || ctx.update.message.text.includes("#id")) {
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
