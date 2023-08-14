import { config } from "./../config";

const cfetch = (url, option) => {
    const defaultOption = {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            cookie: `userhash=${config.COOKIES}`
        }
    };
    return fetch(url, option || defaultOption);
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