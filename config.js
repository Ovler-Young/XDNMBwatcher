//choose telegram / wechat / bark

export const mode = NOTIFIER || "bark";

export const config = {
  maxErrorCount: 15,
  PARSE_URL,
  SECRET_PATH,
  COOKIES,
  BASE_URL,
  ...require(`./config/${mode}`).default
};
