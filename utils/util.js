import { config } from "./../config";

const cFetch = async (url, option, PHPSESSID) => {
  let retry = 0;
  if (PHPSESSID === undefined) {
    PHPSESSID = await KV.get("PHPSESSID");
  }
  if (PHPSESSID === null || PHPSESSID === undefined) {
    for (retry = 0; retry < 4; retry++) {
      // fetch PHPSESSID
      const PHPSESSIDurl = "https://www.nmbxd1.com/Forum";
      const PHPSESSIDoption = { method: "GET" };
      PHPSESSIDoption.signal = AbortSignal.timeout(1700 * (retry + 1));
      let PHPSESSIDresponse = await fetch(PHPSESSIDurl, PHPSESSIDoption);
      PHPSESSID = PHPSESSIDresponse.headers
        .get("set-cookie")
        .split(";")[0]
        .split("=")[1];
      await KV.put("PHPSESSID", PHPSESSID, { expirationTtl: 3600 });
    }
  }
  const timeout = 1700;
  const defaultOption = {
    method: "GET",
    headers: {
      "user-agent": "xdnmb",
      cookie: `userhash=${config.COOKIES}; PHPSESSID=${PHPSESSID};`,
      host: "www.nmbxd1.com",
      "accept-encoding": "gzip"
    },
    redirect: "follow",
    httpVersion: "1.1",
    "same-origin": true,
    signal: AbortSignal.timeout(timeout)
  };
  for (retry = 0; retry < 4; retry++) {
    try {
      //await new Promise(r => setTimeout(r, 200));
      defaultOption.signal = AbortSignal.timeout(timeout * (retry + 1));
      let response = await fetch(url, Object.assign({}, defaultOption, option));
      // if 429 wait 10 seconds
      if ( response.status === 429 ) {
        // sleep 3 sec
        await new Promise(r => setTimeout(r, 200));
      } else {
      return response;
      }
    } catch (e) {
      console.log(e.name);
    }
  }
  return cFetch(url, option);
};

const errorResponse = message => {
  return new Response(
    JSON.stringify({
      status: 400,
      message: message
    }),
    {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, HEAD",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    }
  );
};

const successResponse = message => {
  return new Response(
    JSON.stringify({
      status: 0,
      message: message
    }),
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, HEAD",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    }
  );
};

const addContent = (id, data, content_all) => {
  if (data.id === 9999999) {
    return content_all;
  }
  if (data.title !== "" && data.title !== "无标题") {
    content_all.push(
      `<br/><a href="https://www.nmbxd1.com/t/${id}?r=${data.id}">${data.title}</a> | PO: ${data.user_hash} | ${data.now}`
    );
  } else {
    content_all.push(
      `<br/><a href="https://www.nmbxd1.com/t/${id}?r=${data.id}">#${data.id}</a> | PO: ${data.user_hash} | ${data.now}`
    );
  }
  // if so, we need to get the content
  content_all.push(
    data.content
      .replace(/<[^>]+>/g, "")
      .replace(
        /&gt;&gt;No\.(\d+)/g,
        `<a href="https://www.nmbxd1.com/Home/Forum/ref?id=$1">>>No.$1</a>`
      )
  ); //https://www.nmbxd1.com/Home/Forum/ref?id=57858642
  // if there is an image, we need to add it to the content
  if (data.ext !== "") {
    content_all.push(
      `<img src="https://image.nmb.best/image/${data.img}${data.ext}">`
    );
  }
  return content_all;
};

export { cFetch, errorResponse, successResponse, addContent };
