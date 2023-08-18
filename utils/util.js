import { config } from "./../config";

const cfetch = async (url, option) => {
    let phpssid = await KV.get("phpssid");
    const timeout = 3000;
    AbortSignal.timeout ??= function timeout(ms) {
        const ctrl = new AbortController()
        setTimeout(() => ctrl.abort(), ms)
        return ctrl.signal
      }
    const defaultOption = {
        method: "GET",
        headers: {
            'user-agent' : 'xdnmb',
            'cookie' : `userhash=${config.COOKIES}; PHPSESSID=${phpssid}`,
            'host' : 'www.nmbxd1.com',
            'accept-encoding' : 'gzip'
            },
        redirect: "follow",
        httpVersion: "1.1",
        "same-origin": true,
        timeout: timeout,
        signal: AbortSignal.timeout(60000),
    };
    const maxRetries = 5;
    for(let i = 0; i < maxRetries; i++){
        try{
            const response = await fetch(url, Object.assign(defaultOption, option));
            return response;
        }catch(e){
            if(i === maxRetries - 1) throw e; // If it's the last retry, throw the error
        }
    }
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