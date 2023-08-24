import { GetIDctx, Unsubscribe } from "../functions";

export async function botUnSub(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id,
    });
    return;
  }
  console.log(`GET UNSUB ${id}`);
  let { success, msg } = await Unsubscribe(id);
  await ctx.reply(msg, {
    reply_to_message_id: ctx.update.message.message_id,
  });
  return;
}
