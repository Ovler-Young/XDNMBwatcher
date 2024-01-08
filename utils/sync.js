import { mode } from "../config";
const {
  reply,
  replyWhenError,
  sendNotice
} = require(`../notifications/${mode}`);
import { cFetch, addContent } from "./util";
import { telegraph, editTelegraph } from "./telegraph";

const saveSyncInfo = async (id, page, telegraphUrl, ReplyCount) => {
    let syncInfo = await KV.get("syncInfo");
    let syncInfoJson = JSON.parse(syncInfo);
    syncInfoJson[id] = {};
    syncInfoJson[id].page = page;
    syncInfoJson[id].telegraphUrl = telegraphUrl;
    syncInfoJson[id].ReplyCount = ReplyCount;
    await KV.put("syncInfo", JSON.stringify(syncInfoJson));
}

export async function syncToTelegraph(id) {
    console.log("syncToTelegraph id: " + id);
    let PHPSESSID = await KV.get("PHPSESSID");
    let syncInfo = await KV.get("syncInfo");
    let syncInfoJson = JSON.parse(syncInfo);
    if (syncInfoJson === null) {
        syncInfoJson = {};
    }
    console.log("syncInfoJson: " + JSON.stringify(syncInfoJson));
    // get syncInfo if exists
    if (syncInfoJson[id] === undefined || syncInfoJson === null) {
        syncInfoJson[id] = {};
        syncInfoJson[id].page = 1;
        syncInfoJson[id].telegraphUrl = "";
        syncInfoJson[id].ReplyCount = 0;
        await KV.put("syncInfo", JSON.stringify(syncInfoJson));
    }
    let page = syncInfoJson[id].page;
    let telegraphUrl = syncInfoJson[id].telegraphUrl;
    let ReplyCount = syncInfoJson[id].ReplyCount;
    let url = `https://www.nmbxd1.com/t/${id}`;

    // try if it is in the sub list
    let SubRaw = await KV.get("sub");
    let sub = JSON.parse(SubRaw);
    let index = sub.findIndex(e => e.url === url);
    if (index === -1) {
        // not found
        console.log("未找到" + id + "，请先订阅");
        let sendStatus = sendNotice(`id: ${id} 未找到, 请先订阅`);
        return `id: ${id} 未找到, 请先订阅`;
    }
    let title = sub[index].title;


    let r = 0; // 请求次数
    // get page info
    let res = await cFetch(
        `https://api.nmb.best/Api/po?id=${id}`, // 只看po即可，第一次确认总回复数
        (PHPSESSID = PHPSESSID)
    );
    r++;
    let po = await res.json();
    let reply = po.ReplyCount;
    let TotalPage = Math.ceil(reply / 19);
    console.log("TotalPage: " + TotalPage);
    if (TotalPage === 0) {
        TotalPage = 1;
    }
    if (ReplyCount === reply) {
        console.log("ReplyCount === reply");
        let sendStatus = sendNotice(`id: ${id} 无新回复, 无需同步`);
        return sendStatus;
    }

    // get page content
    let content = "";    
    let i = 0;
    let content_all = [];
    if (ReplyCount === 0) {
        content_all.push(
            `PO：${po.user_hash} | rep：${po.ReplyCount}`
            );
        content_all = addContent(id, po, content_all);
    } else if (telegraphUrl !== "") {
        content_all.push(
            `上一次同步：${telegraphUrl}`
            );
    }
    let lastPageReply = 0;
    for (i = page; i <= TotalPage; i++) {
        if (r > 25) {
            break;
        }
        let res = await cFetch(
            `https://api.nmb.best/Api/po?id=${id}&page=${i}`,
            (PHPSESSID = PHPSESSID)
        );
        r++;
        let thread = await res.json();
        let Replies = thread.Replies;
        if (Replies.length === 0) {
            break;
        }
        for (let j = 0; j < Replies.length; j++) {
            let data = Replies[j];
            content_all = addContent(id, data, content_all);
            lastPageReply = j;
        }
    }
    content = content_all.join("<br/>");
    reply = (i-1) * 19 + lastPageReply;
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
            item.telegraphUrl = telegraphUrl;
            let telegraphUrl_new = await telegraph(item);
            telegraphUrl = telegraphUrl_new;
            if (r > 40) {
                let sendStatus = sendNotice(`id: ${id} 同步未完成, 请查看最新页面：${telegraphUrl}`);
                await saveSyncInfo(id, i, telegraphUrl, reply);
                return `id: ${id} 同步未完成, 请查看最新页面：${telegraphUrl}`;
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
        item.telegraphUrl = telegraphUrl;
        let telegraphUrl_new = await telegraph(item);
        r += 2;
        item.content = `下一页：${telegraphUrl_new}`;
        item.telegraphUrl = telegraphUrl;
        await editTelegraph(item); // edit the previous telegraph to add the next page link
        r += 3;
        telegraphUrl = telegraphUrl_new;
        r += 1;
    }
    // save syncInfo
    if (telegraphUrl !== "CONTENT_TOO_BIG") {
        await saveSyncInfo(id, i, telegraphUrl, reply);
    }
    // send notice
    let sendStatus = sendNotice(`id: ${id} 同步完成, ${telegraphUrl}, ${reply}条回复`);
    return `id: ${id} 同步${sendStatus}, ${telegraphUrl}, ${reply}条回复`;
}