import { cfetch } from "../util.js";
import { config } from "../../config.js";
export async function Subscribe(id) {
    const subraw = (await KV.get("sub")) || "[]";
    let sub = JSON.parse(subraw);
    let success = true;
    let msg = "";
    const resp = await cfetch(`https://api.nmb.best/Api/po?id=${id}`);
    if (resp.status === 200) {
      let feed = {};
      const data = await resp.json();
      if (data.success === false) {
        success = false;
        msg = data.error;
      }
      feed.id = id.toString();
      feed.url = `https://www.nmbxd1.com/t/${id}`;
      feed.po = data.user_hash;
      // feed.title is data.title if it is not "无标题", otherwise feed.title is first line of data.content
      if (data.title === "无标题" || data.title === "") {
        feed.title = data.content.split("<br />")[0];
      } else {
        feed.title = data.title;
      }
      feed.telegraph = true;
      feed.active = true;
      feed.errorTimes = 0;
      feed.ReplyCount = data.ReplyCount;
      feed.fid = data.fid;
      feed.sendto = config.TG_SENDID;
      feed.Autoremove = 1;
      if (
        sub.findIndex(e => e.url === feed.url) != -1 // 如果已经存在了
      ) {
        success = false;
        msg = "已经订阅过了";
      } else {
        const now = new Date();
        feed.lastUpdateTime = now;
        sub.push(feed);
        await KV.put("sub", JSON.stringify(sub));
        console.log(`ID: ${id} subscribed`);
        msg = `成功订阅${feed.title}`;
        // https://api.nmb.best/Api/addFeed?uuid=xxx&tid=xxx
        const uuid = await KV.get("uuid");
        const addFeedres = await fetch(
          `https://api.nmb.best/Api/addFeed?uuid=${uuid}&tid=${id}`
        );
        // decode the response
        // "\u8be5\u4e32\u4e0d\u5b58\u5728" (该串不存在) -> 该串不存在
        const addFeedresText = await addFeedres.json();
        if (addFeedresText === "该串不存在") {
          success = false;
          msg = "该串不存在";
        }
        // "\u8ba2\u9605\u5927\u6210\u529f\u2192_\u2192" (订阅大成功→_→) -> 订阅大成功→_→
        else if (addFeedresText === "订阅大成功→_→") {
          msg = "订阅成功";
        } else {
          // error
          // return the error message
          success = false;
          msg = addFeedresText;
        }
      }
    } else {
      success = false;
      msg = "订阅失败，网络错误，请稍后再试";
    }
    // return both success and msg
    return {success, msg}
}