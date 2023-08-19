const map = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;"
};
export const html = string =>
  string.toString().replace(/[\<\>\&]/g, m => map[m]);
