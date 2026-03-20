# BibleBee

BibleBee 是一个基于 React + Vite 的圣经背诵应用。

当前支持两种站点同时可用：

- Vercel：前端 + 后端 API
- Cloudflare Pages：仅静态前端，后端 API 调用 Vercel

统一依赖：

- 鉴权：Clerk
- 数据库：Neon Postgres
- 本地缓存：IndexedDB

## 项目结构

前端：

- `/src`

Vercel API：

- `/api/bootstrap.js`
- `/api/plans/index.js`
- `/api/plans/[planId].js`
- `/api/plans/[planId]/select.js`
- `/api/memorization/index.js`
- `/api/memorization/review.js`
- `/api/sync.js`
- `/api/static-data.js`
- `/api/me.js`
- `/api/clerk-webhook.js`
- `/api/db-test.js`

服务端共享逻辑：

- `/server/lib`

静态圣经数据：

- `/public/data/combined.json`
- `/public/data/plans.json`

## 环境变量

前端构建时需要：

- `VITE_CLERK_PUBLISHABLE_KEY`
- 可选：`VITE_API_BASE_URL`

Vercel 运行时需要：

- `CLERK_SECRET_KEY`
- `BIBLEBEE_DATABASE_URL`
- `FRONTEND_ORIGINS`
- 可选：`CLERK_PUBLISHABLE_KEY`

说明：

- `CLERK_PUBLISHABLE_KEY` 不配置时，服务端会回退读取 `VITE_CLERK_PUBLISHABLE_KEY`
- `FRONTEND_ORIGINS` 必须包含所有允许访问 Vercel API 的前端域名
- 当 Cloudflare Pages 作为静态前端时，设置：
  - `VITE_API_BASE_URL=https://你的-vercel-域名`

## 本地开发

推荐本地联调方式：

```bash
npm run dev:api
npm run dev
```

常用本地地址：

- 前端：`http://localhost:5173`
- 本地 API：`http://localhost:3001`

说明：

- `5173` 的 `/api/*` 会自动代理到 `3001`
- 如果要测试登录态、数据库、`/api/*`，保持这两个进程同时运行

## 部署

### Vercel

1. 将仓库连接到 Vercel
2. Framework Preset 选择 `React (Vite)`
3. 在 Vercel 项目中配置环境变量
4. 重新部署

### Cloudflare Pages

1. 仅部署前端静态站点
2. Build command:

```bash
npm run build
```

3. Output directory:

```bash
dist
```

4. Pages 环境变量至少配置：
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_BASE_URL=https://你的-vercel-域名`

5. 同时在 Vercel 的 `FRONTEND_ORIGINS` 中加入你的 Pages 域名

## Clerk Webhook

Clerk webhook 入口：

- `/api/clerk-webhook`

建议监听：

- `user.created`
- `user.updated`
- `user.deleted`

Webhook secret 配置在 Vercel 环境变量：

- `CLERK_WEBHOOK_SIGNING_SECRET`

## IndexedDB 缓存

前端会在浏览器本地缓存：

- `combined.json`
- `plans.json`
- 用户计划与背诵状态快照
- 待同步操作队列

当前策略：

- 静态圣经数据默认优先使用 IndexedDB
- 没有本地缓存时才首次下载
- 设置页可手动“下载与更新本地圣经数据”
- 用户操作先写本地，再按同步策略写入 Neon
- 用户背诵状态可在背诵页面手动同步

## 构建

```bash
npm run build
```
