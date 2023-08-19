import { config } from "./../config";

const cfetch = async (url, option, phpssid) => {
    let retry = 0;
    if (phpssid === undefined) {
        phpssid = await KV.get("phpssid");
    }
    if (phpssid === null || phpssid === undefined) {
        for (retry = 0; retry < 4; retry++) {
            // fetch phpssid
            const phpssidurl = "https://www.nmbxd1.com/Forum";
            const phpssidoption = { method: "GET" };
            phpssidoption.signal = AbortSignal.timeout(1700 * (retry + 1));
            let phpssidresponse = await fetch(phpssidurl, phpssidoption);
            phpssid = phpssidresponse.headers.get("set-cookie").split(";")[0].split("=")[1];
            await KV.put("phpssid", phpssid, { expirationTtl: 3600 });
        }
    }
    const timeout = 1700;
    const defaultOption = {
        method: "GET",
        headers: {
            'user-agent' : 'xdnmb',
            'cookie' : `userhash=${config.COOKIES}; PHPSESSID=${phpssid};`,
            'host' : 'www.nmbxd1.com',
            'accept-encoding' : 'gzip'
        },
        redirect: "follow",
        httpVersion: "1.1",
        "same-origin": true,
        signal: AbortSignal.timeout(timeout),
    };
    for (retry = 0; retry < 4; retry++) {
        try {
            //await new Promise(r => setTimeout(r, 200)); 
            defaultOption.signal = AbortSignal.timeout(timeout * (retry + 1));     
            let response = await fetch(url, Object.assign({}, defaultOption, option));
            return response;
        } catch (e) {
            console.log(e.name);
        }
    }
    return cfetch(url, option);
}

const errorresponse = (message) => {
    return new Response(
        JSON.stringify({
            status: 400,
            message: message,
        }),
        {
            status: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, HEAD",
                "Access-Control-Allow-Headers": "Content-Type"
            },
        }
    );
}

const successresponse = (message) => {
    return new Response(
        JSON.stringify({
            status: 0,
            message: message,
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
}

export { cfetch, errorresponse, successresponse };