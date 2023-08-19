export async function botHelp(ctx) {
  let msg = "";
  msg += `<code>/list</code> - 列出当前会话订阅\n`;
  msg += `<code>/all</code> - 列出所有当前会话\n`;
  msg += `<code>/sub </code> - 订阅\n`;
  msg += `<code>/unsub </code> - 取消订阅\n`;
  msg += `<code>/retitle </code> - [id] [title] 修改标题\n`;
  msg += `<code>/bind </code> - 绑定订阅源到当前群组\n`;
  msg += `<code>/unbind </code> - 解绑订阅源\n`;
  msg += `<code>/active </code> - 激活订阅源\n`;
  msg += `<code>/tg </code> - 开启订阅源的telegraph\n`;
  msg += `<code>/read </code> - [id] 标记为已读\n`;
  msg += `<code>/mute </code> - [id] 只保留最后一条消息\n`;
  msg += `<code>/help</code> - 再次显示帮助\n`;
  msg += `直接分享响应链接到对话自动添加订阅源\n`;
  msg += `直接转发响应链接到对话自动绑定订阅源\n`;
  await ctx.reply(msg, {
    parse_mode: "HTML",
    reply_to_message_id: ctx.update.message.message_id
  });
}
