# wxapp — My WxApp

OceanDino 多站服务器的微信小程序工程。

## 是什么

- `src/` —— 原生微信小程序源码（wxml / wxss / js / json）。这一份将来用
  `miniprogram-ci` 上传到微信小程序后台，是真正的「小程序」。
- `web-preview/` —— 基于 [glass-easel](https://github.com/wechat-miniprogram/glass-easel)
  （微信官方开源的小程序组件框架，多 backend 设计可直接跑在浏览器 DOM 里）
  的 Vite 预览前端。开发期用，**不**会发布到微信平台。

## 为什么这么拆

vibe coding：人在 OceanDino dashboard 写代码，希望在同一个网页里看到
小程序界面 + 能点击交互。glass-easel 把 wxml/wxss 渲染成普通 DOM，跑在
浏览器里，配合 Vite hot reload 即可达成。微信开发者工具桌面 app 不需要
下载——直到要调 `wx.login`/支付/订阅消息或上传体验版时，才需要：

- 真机：用 `miniprogram-ci` 推体验版 → 手机微信扫二维码
- 上线：用 `miniprogram-ci` 上传 + 在微信后台提审

## 本地启动

```bash
cd web-preview
npm install
npm run dev    # 默认 0.0.0.0:3006
```

在 ECS 上由 `wxapp-preview.service`（systemd 单元，源于
`oceandino/scripts/site-preview-dev/`）自动起，端口 3006，
Caddy 反代到 `https://p3006.oceandino.com/`。

## 部署

- **预览** 自动跑：`wxapp-preview.service`
- **发布到微信平台**：见 `docs/publish-with-miniprogram-ci.md`（待补）

## 同步

```bash
bash sync.sh    # 双端 main 同步
```

不允许在 `main` 之外的分支提交。详见 AGENTS.md。
