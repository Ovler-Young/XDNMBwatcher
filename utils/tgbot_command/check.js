import { config } from "../../config.js";
import { cfetch, errorresponse, successresponse } from "../util.js";
export async function Check(ctx) {
  let message = ctx.update.message;
  let id = message.text.match(/\d{8}/);
  if (id === null) {
    if (message.reply_to_message != undefined) {
      message = message.reply_to_message;
      id = message.text.match(/\d{8}/);
      if (id === null) {
        await ctx.reply("未在 该消息 及 回复 中找到帖子ID");
        return;
      } else {
        id = id[0];
      }
    } else {
      await ctx.reply("未在该消息中找到帖子ID");
      return;
    }
  }
  let frontend_page = 0;
  const resp = await cfetch(`https://api.nmb.best/Api/thread?id=${id}`)
  // find what we just posted
  if (resp.ok) {
      // if everything is fine, return the json
      if (resp.status === 200) {
          frontend_page = parseInt((((await resp.json()).ReplyCount)-1) / 19) + 1;
          console.log(`frontend_page: ${frontend_page}`);
      }
  } else {
      // otherwise, return the error
      return resp;
  }
  const lastpage = await cfetch(`https://api.nmb.best/Api/thread?id=${id}&page=${frontend_page}`)
  const data = await lastpage.json();
  console.log(data);
  try {for (let j = 0; j < data.Replies.length; j++) {
      if (data.Replies[j].Content === msg) {
          console.log(`my_id: ${data.Replies[j].Content}`);
          console.log(`user_hash: ${data.Replies[j].user_hash}`);
          console.log(`id: ${data.Replies[j].id}`);
          if (data.Replies[j].user_hash === "RRbLdfa") {
              console.log(`my_id: ${data.Replies[j].id}`);
              return data.Replies[j].id;
          }
      }
  }}
  catch (e) {
      console.log(e);
      return e;
  }
}