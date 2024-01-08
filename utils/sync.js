import { mode } from "../config";
const {
  reply,
  replyWhenError,
  sendNotice
} = require(`../notifications/${mode}`);
import { cfetch, addcontent } from "./util";
import { telegraph, edittelegraph } from "./telegraph";

const savesyncinfo = async (id, page, telegraphurl, replycount) => {
    let syncinfo = await KV.get("syncinfo");
    let syncinfojson = JSON.parse(syncinfo);
    syncinfojson[id] = {};
    syncinfojson[id].page = page;
    syncinfojson[id].telegraphurl = telegraphurl;
    syncinfojson[id].replycount = replycount;
    await KV.put("syncinfo", JSON.stringify(syncinfojson));
}

export async function synctoTelegraph(id) {
    console.log("synctoTelegraph id: " + id);
    let phpssid = await KV.get("phpssid");
    let syncinfo = await KV.get("syncinfo");
    let syncinfojson = JSON.parse(syncinfo);
    if (syncinfojson === null) {
        syncinfojson = {};
    }
    console.log("syncinfojson: " + JSON.stringify(syncinfojson));
    // get syncinfo if exists
    if (syncinfojson[id] === undefined || syncinfojson === null) {
        syncinfojson[id] = {};
        syncinfojson[id].page = 1;
        syncinfojson[id].telegraphurl = "";
        syncinfojson[id].replycount = 0;
        await KV.put("syncinfo", JSON.stringify(syncinfojson));
    }
    let page = syncinfojson[id].page;
    let telegraphurl = syncinfojson[id].telegraphurl;
    let replycount = syncinfojson[id].replycount;
    let url = `https://www.nmbxd1.com/t/${id}`;

    // try if it is in the sub list
    let subraw = await KV.get("sub");
    let sub = JSON.parse(subraw);
    let index = sub.findIndex(e => e.url === url);
    if (index === -1) {
        // not found
        console.log("未找到" + id + "，请先订阅");
        let sendstatus = sendNotice(`id: ${id} 未找到, 请先订阅`);
        return `id: ${id} 未找到, 请先订阅`;
    }
    let title = sub[index].title;


    let r = 0; // 请求次数
    // get page info
    let res = await cfetch(
        `https://api.nmb.best/Api/po?id=${id}`, // 只看po即可，第一次确认总回复数
        (phpssid = phpssid)
    );
    r++;
    let po = await res.json();
    let reply = po.ReplyCount;
    let totalpage = Math.ceil(reply / 19);
    console.log("totalpage: " + totalpage);
    if (totalpage === 0) {
        totalpage = 1;
    }
    if (replycount === reply) {
        console.log("replycount === reply");
        let sendstatus = sendNotice(`id: ${id} 无新回复, 无需同步`);
        return sendstatus;
    }

    // get page content
    let content = "";    
    let i = 0;
    let content_all = [];
    if (replycount === 0) {
        content_all.push(
            `PO：${po.user_hash} | rep：${po.ReplyCount}`
            );
        content_all = addcontent(id, po, content_all);
    } else if (telegraphurl !== "") {
        content_all.push(
            `上一次同步：${telegraphurl}`
            );
    }
    let lastpagereply = 0;
    for (i = page; i <= totalpage; i++) {
        if (r > 25) {
            break;
        }
        let res = await cfetch(
            `https://api.nmb.best/Api/po?id=${id}&page=${i}`,
            (phpssid = phpssid)
        );
        r++;
        let thread = await res.json();
        let Replies = thread.Replies;
        if (Replies.length === 0) {
            break;
        }
        for (let j = 0; j < Replies.length; j++) {
            let data = Replies[j];
            content_all = addcontent(id, data, content_all);
            lastpagereply = j;
        }
    }
    content = content_all.join("<br/>");
    reply = (i-1) * 19 + lastpagereply;
    console.log("reply: " + reply);

    let item = {};
    item.id = id;
    item.writer = po.user_hash;
    item.title = title;
    item.url = `https://www.nmbxd1.com/t/${id}`;

    // the limit of telegraph is 64k. To avoid error, we need to split the content if it is too long
    while (true) {
        if (content.length < 20000|| r > 40) {
            item.content = content;
            item.telegraphurl = telegraphurl;
            let telegraphurl_new = await telegraph(item);
            telegraphurl = telegraphurl_new;
            if (r > 40) {
                let sendstatus = sendNotice(`id: ${id} 同步未完成, 请查看最新页面：${telegraphurl}`);
                await savesyncinfo(id, i, telegraphurl, reply);
                return `id: ${id} 同步未完成, 请查看最新页面：${telegraphurl}`;
            }
            r += 1;
            break;
        }
        // split content at 60k and find the nearest <br/>
        let index = content.lastIndexOf("<br/>", 20000);
        let content1 = content.slice(0, index);
        let content2 = content.slice(index);
        content = content2;

        // send content1 to telegraph
        item.content = content1;
        item.telegraphurl = telegraphurl;
        let telegraphurl_new = await telegraph(item);
        r += 2;
        item.content = `下一页：${telegraphurl_new}`;
        item.telegraphurl = telegraphurl;
        await edittelegraph(item); // edit the previous telegraph to add the next page link
        r += 3;
        telegraphurl = telegraphurl_new;
        r += 1;
    }
    // save syncinfo
    if (telegraphurl !== "CONTENT_TOO_BIG") {
        await savesyncinfo(id, i, telegraphurl, reply);
    }
    // send notice
    let sendstatus = sendNotice(`id: ${id} 同步完成, ${telegraphurl}, ${reply}条回复`);
    return `id: ${id} 同步${sendstatus}, ${telegraphurl}, ${reply}条回复`;
}