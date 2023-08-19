import { config } from "../../config.js";
import { cfetch } from "../util.js";
export async function botLatest(ctx) {
  // 记时
  let start = new Date().getTime();
  const resp = await cfetch(`https://api.nmb.best/Api/timeline`);
  const data = await resp.json();
  let middle = new Date().getTime();
  // the id we need is in data[*].Replies[0].id
  let max_id = 0;
  let all_id = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].Replies.length; j++) {
      all_id.push(data[i].Replies[j].id);
      if (data[i].Replies[j].id > max_id) {
        max_id = data[i].Replies[j].id;
      }
    }
  }
  console.log(all_id);
  console.log(max_id);
  let end = new Date().getTime();
  let time = end - start;
  let net = middle - start;
  let proc = end - middle;
  let msg = `获取最新串耗时：${time}ms，网络请求耗时：${net}ms，处理耗时：${proc}ms`;
  msg += `\n 最新串id：${max_id}`;
  console.log("Call to doSomething took " + time + " milliseconds.");
  ctx.reply(msg, {
    parse_mode: "HTML",
    reply_to_message_id: ctx.update.message.message_id
  });
}
