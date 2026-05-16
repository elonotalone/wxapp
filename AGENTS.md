# AGENTS — wxapp (My WxApp)

This is the **WeChat Mini Program** site on the OceanDino multisite server.

## Branch lock

- All agent work happens on `main`.
- Push via `bash sync.sh` (NOT `git push -u origin main`).
- No feature branches.

## Layout

```
src/             原生微信小程序源码 (将来上传到微信平台的部分)
  app.json
  app.js
  app.wxss
  pages/<page>/<page>.{js,wxml,wxss,json}

web-preview/     glass-easel + Vite 浏览器预览
  vite.config.ts
  index.html
  src/main.ts    把 src/ 的小程序编译成浏览器 DOM 渲染
  package.json
```

## Dev loop (vibe coding 流程)

1. Cursor agent 在 `src/` 改 wxml/wxss/js
2. `web-preview/` 的 Vite dev server 跑在 **port 3006**
3. Caddy 反代 `https://p3006.oceandino.com/` → `127.0.0.1:3006`
4. OceanDino dashboard 的 "My WxApp" 侧边栏点进去 → Preview tab iframe 加载上述 URL → 浏览器里看小程序界面、可点击交互

## Production publish

通过 OceanDino dashboard 的 **WxApp · 小程序 → Upload (体验版) / Submit (提审)** 按钮，
后端会调 `miniprogram-ci` 把 `src/` 上传到微信小程序后台。一次性准备工作：

1. 在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册 appid。
2. 开发 → 开发设置 → 小程序代码上传：生成上传密钥（下载
   `.private.<appid>.key`），同页面把 ECS 出口 IP 加入白名单。
3. Dashboard 的「凭据」卡片上传 appid + key 文件（AES-256-GCM 加密存
   Supabase；运行时仅落到 ECS `/dev/shm` 内存盘，命令结束即删）。
4. 把 `src/project.config.json` 里的占位 `"touristappid"` 改为真实 appid。

完成后每次 ship 都是「点 Upload → 扫二维码」，**不需要打开微信开发者工具**。
本仓库 `web-preview/` 永远只做 vibe coding 期浏览器预览，不参与微信平台发布。

完整集成设计见 `oceandino/docs/work-logs/2026-05/miniprogram-ci-integration.md`。

## 不在此仓库做的事

- 不要在这里塞 Caddy 配置 / systemd 单元 / docker-compose 文件
  → 这些归 `/opt/multisite-docker/`（host infra repo）
- 不要在 `web-preview` 引入微信私有 API 的真实实现
  → glass-easel 只渲染组件，`wx.*` 调用需要 stub 或走真机

## 已知限制

- `wx.login` / `wx.requestPayment` / `getUserProfile` 等微信能力 API：
  glass-easel 不模拟，需要在真机扫体验版二维码验证。
- 性能 / 渲染时序：和真机非 100% 一致，但足够 vibe coding 期使用。
