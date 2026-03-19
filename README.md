# BibleBee

BibleBee 是一个基于 React + Vite + Vercel Serverless Functions 的圣经背诵应用。  
当前项目已经收敛为单平台部署：

- 前端：Vite + React
- 后端：Vercel `api/*.js`
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

- `/data/combined.json`
- `/data/plans.json`

## 环境变量

前端构建时需要：

- `VITE_CLERK_PUBLISHABLE_KEY`

Vercel 运行时需要：

- `CLERK_SECRET_KEY`
- `BIBLEBEE_DATABASE_URL`
- `FRONTEND_ORIGINS`
- 可选：`CLERK_PUBLISHABLE_KEY`

说明：

- `CLERK_PUBLISHABLE_KEY` 不配置时，服务端会回退读取 `VITE_CLERK_PUBLISHABLE_KEY`
- `FRONTEND_ORIGINS` 建议至少包含你的正式域名

## 本地开发

前端热更新：

```bash
npm run dev
```

Vercel 前后端联调：

```bash
npx vercel dev
```

常用本地地址：

- 前端：`http://localhost:5173`
- Vercel 全栈：`http://localhost:3000`

如果要测试登录态、数据库、`/api/*`，优先使用 `npx vercel dev`。

## 部署

推荐方式：

1. 将仓库连接到 Vercel
2. Framework Preset 选择 `React (Vite)`
3. 在 Vercel 项目中配置环境变量
4. 重新部署

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

## 构建

```bash
npm run build
```

当前构建会同时复制静态数据到 `dist/data`：

```bash
vite build
```
