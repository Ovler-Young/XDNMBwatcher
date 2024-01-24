import { GetIDctx, Subscribe, Unsubscribe, ChangeSendto } from "./functions";
import { html } from "./html";
import { config } from "../config.js";
import { cFetch } from "./util.js";
import { syncToTelegraph } from "./sync.js";

export async function botBind(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅");
  } else {
    let chat_id = ctx.update.message.chat.id;
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    if (find === -1) {
      await ctx.reply("没有找到相关到订阅源", {
        reply_to_message_id: ctx.update.message.message_id
      });
    } else {
      if (chat_id === null || chat_id === undefined) {
        await ctx.reply("获取错误");
      } else {
        sub[find].SendTo = chat_id;
        await KV.put("sub", JSON.stringify(sub));
        await ctx.reply(`成功修改id为${id}的订阅源发送到${chat_id}\n`, {
          reply_to_message_id: ctx.update.message.message_id
        });
      }
    }
  }
}

export async function bot2TG(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  console.log(`GET 2TG ${id}`);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  let msg = await syncToTelegraph(id);
  await ctx.reply(msg, {
    reply_to_message_id: ctx.update.message.message_id
  });
}

export async function botSub(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  console.log(`GET SUB ${id}`);
  let { success, msg } = await Subscribe(id);
  await ctx.reply(msg, {
    reply_to_message_id: ctx.update.message.message_id
  });
}

export async function botUnSub(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  console.log(`GET UNSUB ${id}`);
  let { success, msg } = await Unsubscribe(id);
  await ctx.reply(msg, {
    reply_to_message_id: ctx.update.message.message_id
  });
  return;
}

export async function botUnSubAll(ctx) {
  //await KV.put('sub', '[]')
  await ctx.reply("该功能已被禁用，如需取消订阅请联系管理员", {
    reply_to_message_id: ctx.update.message.message_id
  });
}

export async function botShare(ctx) {
  console.log("GET BOTSHARE");
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  const SubRaw = (await KV.get("sub")) || "[]";
  let message = ctx.update.message;
  let sub = JSON.parse(SubRaw);
  {
    id = id[0];
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    let msg = "";
    if (find != -1) {
      // get chat id
      const chatid = ctx.update.message.chat.id;
      let kvchange = false;
      if (sub[find].SendTo === undefined || sub[find].SendTo !== chatid) {
        sub[find].SendTo = chatid;
        kvchange = true;
        msg += `已将帖子${sub[find].title}的更新推送至本群\n`;
      }
      if (sub[find].unread !== 0) {
        sub[find].unread = 0;
        //await ctx.reply("已将该帖子标记为已读", { reply_to_message_id: ctx.update.message.message_id });
        sub[find].telegraphUrl = null;
        msg += `已将帖子${sub[find].title}标记为已读\n`;
        sub[find].LastRead = sub[find].ReplyCount;
        kvchange = true;
      }
      if (kvchange) {
        await KV.put("sub", JSON.stringify(sub));
        msg += "已更新订阅列表";
      }
      if (msg === "") {
        msg = "处理完成";
      }
      await ctx.reply(msg, {
        reply_to_message_id: ctx.update.message.message_id
      });
      if (sub[find].SendTo == chatid) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        // delete this message
        await ctx.telegram.deleteMessage(
          ctx.update.message.chat.id,
          ctx.update.message.message_id
        );
        // delete last message
        await ctx.telegram.deleteMessage(
          ctx.update.message.chat.id,
          ctx.update.message.message_id + 1
        );
      }
      return;
    } else {
      // subscribe
      let { success, msg } = await Subscribe(id);
      await ctx.reply(msg, {
        reply_to_message_id: ctx.update.message.message_id
      });
    }
  }
}

export async function botUnread(ctx) {
  let SubRaw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    let msg = "";
    let kvchange = false;
    sub.sort((a, b) => {
      if (a.unread === b.unread) {
        return a.id - b.id;
      } else {
        return b.unread - a.unread;
      }
    });
    for (let i = 0; i < sub.length; i++) {
      if (sub[i].unread === undefined) {
        sub[i].unread = 1;
        kvchange = true;
      } else if (sub[i].unread > 0) {
        msg += `${i}.\t<a href="${sub[i].url}">${html(sub[i].title)}</a>\n #id${
          sub[i].id
        }<code>Upd:${sub[i].lastUpdateTime
          .toLocaleString()
          .substr(5, 13)}</code><code> Unread: </code>${sub[i].unread}\n`;
      }
    }
    if (kvchange) {
      await KV.put("sub", JSON.stringify(sub));
      msg += "已更新订阅列表";
    }
    if (msg === "") {
      await ctx.reply("没有未读消息", {
        reply_to_message_id: ctx.update.message.message_id
      });
    } else {
      while (msg.split("\n").length > 31) {
        let msg1 = msg.split("\n");
        let msg2 = msg1.slice(0, 31);
        msg1 = msg1.slice(31);
        msg = msg1.join("\n");
        await ctx.reply(msg2.join("\n"), {
          reply_to_message_id: ctx.update.message.message_id,
          parse_mode: "HTML"
        });
      }
      await ctx.reply(msg, {
        parse_mode: "HTML",
        reply_to_message_id: ctx.update.message.message_id
      });
    }
    //await ctx.reply(msg, { parse_mode: "HTML" });
  }
}

export async function botRetitle(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    if (find === -1) {
      await ctx.reply("没有找到相关到订阅源", {
        reply_to_message_id: ctx.update.message.message_id
      });
    } else {
      // title is the last word
      let title = ctx.update.message.text.split(" ").pop();
      if (title === undefined || title === id) {
        await ctx.reply("获取错误", {
          reply_to_message_id: ctx.update.message.message_id
        });
      } else {
        sub[find].title = title;
        await KV.put("sub", JSON.stringify(sub));
        await ctx.reply(`成功修改id为${id}的订阅源标题为 ${title}\n`, {
          reply_to_message_id: ctx.update.message.message_id
        });
      }
    }
  }
}

export async function botTelegraph(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    if (find === -1) {
      await ctx.reply("没有找到相关到订阅源", {
        reply_to_message_id: ctx.update.message.message_id
      });
    } else {
      sub[find].telegraph = !sub[find].telegraph;
      await KV.put("sub", JSON.stringify(sub));
      await ctx.reply(
        `成功修改id为${id}的订阅源telegraph为 ${
          sub[find].telegraph ? "✔️" : "❌"
        }\n`,
        { reply_to_message_id: ctx.update.message.message_id }
      );
    }
  }
}

export async function botList(ctx) {
  let SubRaw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    let msg = "";
    let chat_id = ctx.update.message.chat.id;
    let chat_name = ctx.update.message.chat.title;
    let n = 0;
    if (chat_name === undefined) {
      msg += `默认地点订阅：\n`;
      for (let i = 0; i < sub.length; i++) {
        n += 1;
        if (sub[i].SendTo === chat_id || sub[i].SendTo === undefined) {
          msg += `${n}.\t<a href="${sub[i].url}">${html(
            sub[i].title
          )}</a>\n #id${sub[i].id}<code>Upd:${sub[i].lastUpdateTime
            .toLocaleString()
            .substr(5, 13)}</code><code> Unread: </code>${sub[i].unread}\n`;
        }
      }
    } else {
      msg += `在 ${chat_name} 中的订阅：\n`;
      for (let i = 0; i < sub.length; i++) {
        n += 1;
        if (sub[i].SendTo === chat_id) {
          msg += `${n}.\t<a href="${sub[i].url}">${html(
            sub[i].title
          )}</a>\n #id${sub[i].id}<code>Upd:${sub[i].lastUpdateTime
            .toLocaleString()
            .substr(5, 13)}</code><code> Unread: </code>${sub[i].unread}\n`;
        }
      }
    }
    // if msg is longer than 31 lines, split it
    while (msg.split("\n").length > 31) {
      let msg1 = msg.split("\n");
      let msg2 = msg1.slice(0, 31);
      msg1 = msg1.slice(31);
      msg = msg1.join("\n");
      await ctx.reply(msg2.join("\n"), {
        reply_to_message_id: ctx.update.message.message_id,
        parse_mode: "HTML"
      });
    }
    await ctx.reply(msg, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.update.message.message_id
    });
  }
}

export async function botListAll(ctx) {
  let SubRaw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    let msg = "";
    let n = 0;
    for (let i = 0; i < sub.length; i++) {
      n += 1;
      msg += `${n}.\t<a href="${sub[i].url}">${html(
        sub[i].title
      )}</a>\n <code>#id${sub[i].id}</code> <code> Upd:${sub[i].lastUpdateTime
        .toLocaleString()
        .substr(5, 13)}</code><code> Unread: </code>${sub[i].unread}\n`;
    }
    while (msg.split("\n").length > 20) {
      let msg1 = msg.split("\n");
      let msg2 = msg1.slice(0, 20);
      msg1 = msg1.slice(20);
      msg = msg1.join("\n");
      await ctx.reply(msg2.join("\n"), {
        reply_to_message_id: ctx.update.message.message_id,
        parse_mode: "HTML"
      });
    }
    await ctx.reply(msg, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.update.message.message_id
    });
  }
}

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

export async function botLatest(ctx) {
  // 记时
  let start = new Date().getTime();
  const resp = await cFetch(`https://api.nmb.best/Api/timeline`);
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

export async function botReadAll(ctx) {
  let SubRaw = (await KV.get("sub")) || "[]";
  const sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    let msg = "";
    let n = 0;
    for (let i = 0; i < sub.length; i++) {
      if (sub[i].unread > 0) {
        n += 1;
        sub[i].unread = 0;
        sub[i].LastRead = sub[i].ReplyCount;
      }
    }
    msg += `已将 ${n} 个订阅标记为已读`;
    await KV.put("sub", JSON.stringify(sub));
    while (msg.split("\n").length > 31) {
      let msg1 = msg.split("\n");
      let msg2 = msg1.slice(0, 31);
      msg1 = msg1.slice(31);
      msg = msg1.join("\n");
      await ctx.reply(msg2.join("\n"), {
        reply_to_message_id: ctx.update.message.message_id,
        parse_mode: "HTML"
      });
    }
    await ctx.reply(msg, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.update.message.message_id
    });
  }
}

export async function botPO(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    if (find === -1) {
      await ctx.reply("没有找到相关到订阅源", {
        reply_to_message_id: ctx.update.message.message_id
      });
    } else {
      // po is the last word
      await ctx.reply("正在获取po", {
        reply_to_message_id: ctx.update.message.message_id
      });
      let po = ctx.update.message.text.split(" ").pop();
      if (po === undefined || po === id) {
        await ctx.reply("获取错误", {
          reply_to_message_id: ctx.update.message.message_id
        });
      } else {
        await ctx.reply("获取成功，为 " + po, {
          reply_to_message_id: ctx.update.message.message_id
        });
        try {
          sub[find].IsSingle = false;
          if (sub[find].writer === undefined) {
            sub[find].writer = [po];
            sub[find].po = po;
            await KV.put("sub", JSON.stringify(sub));
            await ctx.reply(`成功添加 ${po} 至 ${id}\n`, {
              reply_to_message_id: ctx.update.message.message_id
            });
          } else if (typeof sub[find].writer === "string") {
            sub[find].writer = [sub[find].writer];
            sub[find].po = po;
            await KV.put("sub", JSON.stringify(sub));
            await ctx.reply(`成功添加 ${po} 至 ${id}\n`, {
              reply_to_message_id: ctx.update.message.message_id
            });
          } else if (po in sub[find].writer) {
            await ctx.reply("已经是po", {
              reply_to_message_id: ctx.update.message.message_id
            });
          } else {
            sub[find].writer.push(po);
            sub[find].po = po;
            await KV.put("sub", JSON.stringify(sub));
            await ctx.reply(`成功添加 ${po} 至 ${id}\n`, {
              reply_to_message_id: ctx.update.message.message_id
            });
          }
        } catch (e) {
          await ctx.reply("添加失败" + e, {
            reply_to_message_id: ctx.update.message.message_id
          });
        }
      }
    }
  }
}

export async function botMute(ctx) {
  let { getid, id } = await GetIDctx(ctx);
  if (getid === false) {
    await ctx.reply("Cannot get id", {
      reply_to_message_id: ctx.update.message.message_id
    });
    return;
  }
  const SubRaw = await KV.get("sub");
  let sub = JSON.parse(SubRaw);
  if (sub.length == 0) {
    await ctx.reply("还没有进行过订阅", {
      reply_to_message_id: ctx.update.message.message_id
    });
  } else {
    const find = sub.findIndex(e => e.url === `https://www.nmbxd1.com/t/${id}`);
    if (find === -1) {
      await ctx.reply("没有找到相关到订阅", {
        reply_to_message_id: ctx.update.message.message_id
      });
    } else {
      const title = sub[find].title;
      // AutoRemove1
      sub[find].AutoRemove = 1;
      await KV.put("sub", JSON.stringify(sub));
      await ctx.reply(`已将 ${title} 的推送设置为仅推送最后一次`, {
        reply_to_message_id: ctx.update.message.message_id
      });
    }
  }
}

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
    const resp = await cFetch(`https://api.nmb.best/Api/timeline`);
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
      msg += `在 t = ${new Date()
        .toISOString()
        .substring(11, 19)} 时，最新串ID为 ${max_id}\n`;
      continues = false;
      ctx.reply(msg, {
        parse_mode: "HTML",
        reply_to_message_id: ctx.update.message.message_id
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
          reply_to_message_id: ctx.update.message.message_id
        });
      } else {
        ctx.reply(
          `发送失败！\n帖子ID：${id}\n直达链接：https://www.nmbxd1.com/t/${id}`,
          {
            parse_mode: "HTML",
            reply_to_message_id: ctx.update.message.message_id
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
        reply_to_message_id: ctx.update.message.message_id
      });
      break;
    }
    await new Promise(res => setTimeout(res, 1000));
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
        "User-Agent": "adnmbposter"
      },
      body: `fid=0&resto=${id}&content=${message}`
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
  const resp = await cFetch(`https://api.nmb.best/Api/thread?id=${id}`);
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
  const lastpage = await cFetch(
    `https://api.nmb.best/Api/thread?id=${id}&page=${frontend_page}`
  );
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
