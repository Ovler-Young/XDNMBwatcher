export async function botUnSubAll(ctx) {
  //await KV.put('sub', '[]')
  await ctx.reply("该功能已被禁用，如需取消订阅请联系管理员", { reply_to_message_id: ctx.update.message.message_id });
}
