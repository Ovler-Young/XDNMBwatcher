<p align="center">
    <h1 align="center">XDNMB watcher</h1>
</p>
    <p align="center">
<img src="https://img.shields.io/github/license/pureink/inkrss?style=for-the-badge"/>
</p>

- [介绍](#介绍)
- [特点](#特点)
- [项目背景](#项目背景)
- [TODO](#todo)
- [注意事项](#注意事项)
- [部署](#部署)
- [额外附赠](#额外附赠)
- [使用建议](#使用建议)
- [调查](#调查)
- [贡献](#贡献)
- [作者](#作者)
- [协议](#协议)

## 介绍

本项目由 @Ovler-Young 在 [inkrss](https://github.com/pureink/inkrss) 项目上修改而成，在这里感谢原作者的开源与分享，给了我很大的启发与思考。

XDNMB watcher 是一个监视 XDNMB 论坛的工具，可以在论坛帖子有更新时，自动将更新内容推送到 Telegram 群组或频道，并集成了一些其他功能如非常不准确的灌铅骰子。

已包含的订阅方式：
网页，telegram bot

已实现的通知方式：telegram（支持 instant view）~~，bark，微信~~(现在高度依赖Telegram 机器人，所以暂时不支持微信)

⚠️ 注意：由于测试有限，无法发现所有问题，当前无法保证项目的高可用性。如果部署的早期代码出现异常，请在网页删除 worker 和 KV 并部署最新版本。

## 特点

🎊 **免费** - 整个应用部署在 cloudflare workers（包括前后端，机器人）

⚡️ **即时** - 最短一分钟进行一次监测。

♻️ **省心** - serverless，无需管理服务器和数据库。

🎨 **定制** - 多种订阅和通知方式，包括不限于 telegram~~，bark，微信~~(现在高度依赖Telegram 机器人，所以暂时不支持微信等其他通知方式)。

## 项目背景

跑团的时候刷新多了独自寂寞，刷新少了kp跑路，非常的可怕。就搞个爬虫抓一下，然后推送到telegram群组，方便你我他；再除外，也可以当作一个会丢内容的备份。

## TODO

- [ ] 关键词过滤

- [ ] 多语言支持

- [x] 监视多po

- [x] tg bot

- [ ] [Bog岛支持](https://bog.ac)

- [ ] i18n

- [x] 图片支持

## ChangeLog

- 2024-01-24
  - 更新 `telegraf` 至v4
  - 修复了bug
  - 增加了使用说明
  - 修复 PHPSSID 重复获取写入的问题
  - 关闭 webpack 的压缩功能，减少编译时间，方便debug
  - 修复sync中的部分bug

- 2024-01-23
  - telegraph 的过长文本修复
  - webpack 优化
  - 重写全文转移

- 2024-01-20
  - 重写更新获取逻辑，减少请求频率降低源站压力
  - 错误处理优化，报错包括详细的错误信息
  - 处理了telegraph链接存放问题
  - 修复了一些小bug
  - 不必要的代码优化
  - 非po长消息提醒
  
- 2024-01-10
  - 自动删除在软件中删除的订阅功能逻辑修复

- 2024-01-09
  - 增加了自动删除在软件中删除的订阅
  - 部分代码命名修改
  - Cookie 过期通知
  - 删除了未使用的代码
  - 前端处理板块信息方式修改
  - 前端滚动bar删除

## 注意事项

### Work in progress, 本章节文档尚未更新

1. 对于所有项目都可以使用网页进行订阅

   <img src="https://user-images.githubusercontent.com/44235276/126451080-1c16cc60-9f7e-4423-b67a-ce8b26134a90.gif" alt="screen" style="zoom: 50%;" />

2. 使用 telegram 不仅可以使用网页，还包含借助 telegraph 提供的即时预览功能（instant view）以及一个提供增删查功能的机器人。部署后访问

   ```
   https://api.telegram.org/bot<your token>/setwebhook?url=https://example.com/secret_path
   ```

   即可开始使用 bot 进行订阅，注意替换 token 以及 url

3. 连续更新 15 次失败后将会收到错误通知，并将暂时关闭此订阅源更新，如确认订阅源无误，可自行在网页中开启更新。如无法确保订阅源的高可用性，也可在配置中调高此数值。

4. 由于 workers 的限制，无法自行解析 xml，需要配置 PARSE_URL 用于提供解析功能，可以点击以下按钮自行部署，或者适量使用我已部署的 https://inkrssparse.vercel.app

<p align="center"><a href="https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fpureink%2Finkrss%2Ftree%2Fmain%2Fparse"><img src="https://vercel.com/button" alt="Deploy with Vercel"/></a></p>

5. 需要配置 SECRET_PATH,网页将部署在https://inkrss.example.workers.dev/secret_path 请仅使用大小写字母和数字进行编写。

## 部署

本项目不依赖于本地环境，但需要在本地进行打包和上传，推荐使用 mac os 系统或者 linux 系统进行以下操作。

- 前期准备

1. 在[官网](https://workers.cloudflare.com)注册 cloudflare 账号，验证邮箱后找到 workers 界面，选择一个子域如 inkrss.workers.dev 即可。
2. 畅通无阻的网络。

3. 安装 wrangler


    推荐根据[官方文档](https://github.com/cloudflare/wrangler)进行安装，以避免不确定的问题。

    在[nodejs 官网](https://nodejs.org/zh-cn/)安装 nodejs（选择长期支持版即可）安装后运行

    ```bash
    npm i @cloudflare/wrangler -g
    ```

    如果在命令行输入以下命令成功输出版本号，即安装成功。

    ```
    wrangler -V
    ```

4.  wrangler 登录

    ```
    wrangler login
    ```

    在一般情况下，会打开浏览器申请授权，授权后即成功登陆，可以跳转到下一步。但有些情况 wrangler 会收不到返回的 token，此时应使用另一种方式登陆.

    在[api tokens 界面](https://dash.cloudflare.com/profile/api-tokens) 找到创建令牌，选择编辑 cloudflare workers 模版，账户资源选择所有账户，区域资源选择所有区域其他默认即可点击确定并复制 api token。


    ```bash
    wrangler config
    ```

    ![login](https://user-images.githubusercontent.com/44235276/126451261-50b79eda-90f3-462e-8af4-2feaa0fe8ee6.png)

- 开始部署

1.  克隆本项目并解压，复制 wrangler.example.toml 内容建立新配置文件 wrangler.toml

    在文件夹目录打开命令行（windows 用户可直接在资源管理器输入 cmd 并回车）

    ```
    wrangler kv:namespace create "KV"
    ```

    根据提示将输出的内容粘贴在 wrangler.toml 文件中 kv_namespaces 位置。

2.  配置

    在 cloudflare 网页找到自己的 account id,粘贴在 wrangler.toml 的对应位置。

    ![api screenshot](https://user-images.githubusercontent.com/44235276/126452407-8f7fb995-1ba1-4daf-91c5-d931e893ccc6.png)

    选择你的通知方式，出于覆盖性考虑目前支持以下方式。

    - telegram（包括即时预览和机器人订阅，功能丰富，受限于网络）

    定义 wrangler.toml 中环境变量 `[vars]`，其中必须定义的有：

    - `NOTIFIER` 为想要的通知方式
    - `SECRET_PATH` 为 UI 页面路径
    - `PARSE_URL` 为 Feed Parser
    - `COOKIES` 为 cookie，即X岛登录后 "userhash" 的值，可在浏览器开发者工具中找到

    然后根据所选通知方式，根据 config 文件夹的指定文件夹中 readme 配置其他相应变量，如`BARK_URL`。

3.  发布

    ```
    wrangler publish
    ```

    ![publish](https://user-images.githubusercontent.com/44235276/126451441-6af7df11-ae99-4bae-bad5-e1db46de1ef8.png)

    wrangler 会自动安装相应的依赖，进行打包和上传，并返回一个部署好的 url,之后就可以立即在https://ink-rss.xxx.workers.dev/secret_path 访问到前端进行订阅.但由于 cloudflare 的一些延迟，定时计划可能在半小时后才会开始运行

4.  多环境（Workers）

    可以在 wrangler.toml 中定义多个环境，并通过命令行发布，如若去掉 wrangler.example.toml 中的注释，并如下配置：

    ```
    # Environments / Multiple Workers
    [env.production]
    name = "inkrss-prod"

    kv_namespaces = [
       { binding = "KV", id = "" }
    ]

    [env.production.vars]
    NOTIFIER = "telegram" # bark, telegram or wechat

    PARSE_URL = "https://inkrssparse.vercel.app"
    SECRET_PATH = "subscriptions"

    # Telegram notification
    TELEGRAPH_TOKEN = ""
    TG_TOKEN = ""

    TG_SENDID = "@channel_name"
    TG_USERID = 12345678
    ```

    即可使用以下命令行来部署新的 Worker

    ```
    $ wrangler publish -e production
    ```

    具体 wrangler.toml 多环境配置请参考：

    - https://developers.cloudflare.com/workers/platform/environments
    - https://developers.cloudflare.com/workers/cli-wrangler/configuration

## 额外附赠

### Work in progress, 本章节文档尚未更新

- [IOS 桌面小插件](https://github.com/pureink/scripts/tree/master/scriptable/inkrss)


    <p align="center">
    <img src="https://user-images.githubusercontent.com/44235276/126298401-3370afa4-878d-4243-a587-302e60a19fa3.png" alt="screenshot" width="50%"/></p>

      默认部署后的 url 很长，使用此小部件可以一键跳转，并展示基本信息。

- 功能丰富的 telegram bot（还没有做完）

  cloudflare workers 开发机器人只能使用过时的框架并且开发体验较差。目前仅支持四个命令/list /sub /unsub /unsuball

  具有完整功能以及行内键盘支持的机器人将部署在其他无服务器平台

## 使用建议

- 由于对 cpu 时间的限制，cloudflare worker 会分批进行监测，如果订阅数过多，或者希望多渠道接收消息，只需要在 wrangler.toml 中修改名称重新部署即可部署多个 worker。
- 频繁的通知提醒会打扰到正常的生活，建议适量订阅。
- 建议和阅读器结合使用。

## 贡献

本项目仍在起步阶段，无论是机器人，前端后端的交互，还是 worker 的逻辑和功能都可能有所缺陷，任何贡献都将起到帮助。

## 原inkrss作者

21 岁，是学生。

[@pureink](https://github.com/pureink)

## 现XDNMB watcher 作者

[@Ovler-Young](https://github.com/Ovler-Young)

## 协议

The MIT License.
