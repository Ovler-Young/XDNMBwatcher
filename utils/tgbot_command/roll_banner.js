import { config } from "../../config.js";
import { cfetch } from "../util.js";

export async function botRoll(ctx) {
  let msg = ``;
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
  // msg += `帖子ID：${id}\n`;
  const num2r = parseInt(ctx.update.message.text.split(" ").pop());
  const send = [];
  const try_num = 15;
  if ((num2r > 10 && num2r < 100) || num2r === 10) {
    // start_num 是 num2r 的十位数
    const start_num = Math.floor(num2r / 10);
    // end_num 是 num2r 对 10 取余
    let end_num = num2r % 10;
    if (end_num === 0) {
      end_num = 10;
    }
    let num = start_num;
    while (num <= end_num) {
      send.push(num - 1);
      num++;
    }
    await ctx.reply("准备以" + start_num + "到" + end_num + "为尾数进行抽取");
  } else if (num2r < 10 && num2r > -1) {
    send.push(num2r - 1);
    await ctx.reply("准备以" + num2r + "为尾数进行抽取");
  } else {
    await ctx.reply("获取尾数失败");
    return;
  }
  console.log(send);
  let continues = true;
  let web_request_count = 0;
  let max_id = 0;
  let try_count = 0;
  while (continues) {
    try_count++;
    const resp = await cfetch(`https://api.nmb.best/Api/timeline`);
    web_request_count += 1;
    const data = await resp.json();
    // the id we need is in data[*].Replies[0].id
    max_id = 0;
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].Replies.length; j++) {
        if (data[i].Replies[j].id > max_id) {
          max_id = data[i].Replies[j].id;
        }
      }
    }
    // 获取串最后一位
    let endwith = max_id % 10;
    if (send.includes(endwith)) {
      msg += `用了${try_count}次抽取成功！\n`;
      msg += `在 t = ${new Date().toISOString().substring(11,19)} 时，最新串ID为 ${max_id}\n`;
      continues = false;
      ctx.reply(msg, {
        parse_mode: "HTML",
        reply_to_message_id: ctx.update.message.message_id,
      });
      let start = new Date().getTime();
      let Reply_status = await Reply(id, "r");
      let end = new Date().getTime();
      let time = end - start;
      console.log(`Time: ${time}ms`);
      if (Reply_status) {
        let my_id = await Check(id, "r");
        console.log(`my_id2342456756: ${my_id}`);
        ctx.reply(`回复成功！耗时 ${time}ms\n帖子ID：${id}\n串ID：${my_id}\n`, {
          parse_mode: "HTML",
          reply_to_message_id: ctx.update.message.message_id,
        });
      } else {
        ctx.reply(
          `发送失败！\n帖子ID：${id}\n直达链接：https://www.nmbxd1.com/t/${id}`,
          {
            parse_mode: "HTML",
            reply_to_message_id: ctx.update.message.message_id,
          }
        );
      }
      break;
    }
    if (web_request_count > try_num) {
      msg += `抽取失败！\n`;
      msg += `已尝试 ${try_num} 次，最新串ID：${max_id}\n`;
      ctx.reply(msg, {
        parse_mode: "HTML",
        reply_to_message_id: ctx.update.message.message_id,
      });
      break;
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
}

export async function Reply(id, msg) {
  const message = msg || "r";
  const resp = await fetch(
    `https://www.nmbxd1.com/Home/Forum/doReplyThread.html`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `userhash=${config.COOKIES}`,
        "User-Agent": "adnmbposter",
      },
      body: `fid=0&resto=${id}&content=${message}`,
    }
  );
  // check if the response is ok
  if (resp.ok) {
    console.log("OK");
    // if everything is fine, return the json
    if (resp.status === 200) {
      console.log("200");
      // Content-Type: text/html; charset=utf-8
      if (resp.headers.get("Content-Type") === "text/html; charset=utf-8") {
        console.log("text/html; charset=utf-8");
        const data = await resp.text();
        console.log(data);
        if (data.includes("回复成功")) {
          console.log("回复成功");
          return true;
        }
      }
    }
  } else {
    // otherwise, return the error
    console.log("error");
    console.log(resp);
    return resp;
  }
}

export async function Check(id, msg) {
  let frontend_page = 0;
  const resp = await cfetch(`https://api.nmb.best/Api/thread?id=${id}`);
  // find what we just posted
  if (resp.ok) {
    // if everything is fine, return the json
    if (resp.status === 200) {
      frontend_page = parseInt(((await resp.json()).ReplyCount - 1) / 19) + 1;
      console.log(`frontend_page: ${frontend_page}`);
    }
  } else {
    // otherwise, return the error
    return resp;
  }
  console.log(`https://www.nmbxd1.com/t/${id}?page=${frontend_page}`);
  const lastpage = await cfetch(`https://api.nmb.best/Api/thread?id=${id}&page=${frontend_page}`);
  const data = await lastpage.json();
  console.log(data);
  console.log("data.Replies.length: " + data.Replies.length);
  let my_id = 0;
  try {
    for (let j = 0; j < data.Replies.length; j++) {
      if (data.Replies[j].user_hash === "RRbLdfa") {
        if (data.Replies[j].content === msg) {
          console.log(`my_id: ${data.Replies[j].content}`);
          console.log(`user_hash: ${data.Replies[j].user_hash}`);
          console.log(`id: ${data.Replies[j].id}`);
          my_id = data.Replies[j].id;
        }
      }
    }
    if (my_id === 0) {
      console.log("my_id not found");
      return "my_id not found";
    } else {
      return my_id;
    }
  } catch (e) {
    console.log(e);
    return e;
  }
}
