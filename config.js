//choose telegram / wechat / bark

export const mode = NOTIFIER || "bark";

export const config = {
  maxErrorCount: 15,
  PARSE_URL,
  SECRET_PATH,
  COOKIES,
  BASE_URL,
  FRONTEND_URL : FRONTEND_URL || "https://www.nmbxd1.com",
  API_BASE_URL: API_BASE_URL || "https://api.nmb.best",
  ...require(`./config/${mode}`).default
};
