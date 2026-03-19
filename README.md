# Bible Bee

Bible Bee 是一个基于 React + Vite 的圣经背诵应用，当前集成了：

- Clerk 用户认证
- Neon PostgreSQL 数据库
- Hono 共享后端
- Vercel 部署
- Cloudflare Workers 部署

## 项目架构

项目现在采用一套共享后端代码，同时支持 Vercel 和 Cloudflare：

- 前端：`src/`
- 共享后端：`server/`
- Vercel API 入口：`api/[[route]].js`
- Cloudflare Worker 入口：`worker.js`

后端路由位于：

- `server/routes/bootstrap.js`
- `server/routes/plans.js`
- `server/routes/memorization.js`
- `server/routes/sync.js`
- `server/routes/static-data.js`
- `server/routes/me.js`
- `server/routes/db-test.js`
- `server/routes/clerk-webhook.js`

## 部署策略

当前推荐的生产环境职责划分如下：

- Vercel：保留完整部署能力，但生产上仅保留 Clerk webhook 作为唯一用户同步入口
- Cloudflare：运行前端和业务 API
- Neon：作为两边共用的数据库

这样可以避免 Clerk webhook 在两个后端重复写同一个 `users` 表。

## 环境变量

### Vercel 必需

- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `BIBLEBEE_DATABASE_URL`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `FRONTEND_ORIGINS`

### Cloudflare 必需

- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `BIBLEBEE_DATABASE_URL`
- `FRONTEND_ORIGINS`

如果 Clerk webhook 只保留在 Vercel，则 Cloudflare 不需要：

- `CLERK_WEBHOOK_SIGNING_SECRET`

### 可选：主备 API 自动切换

前端支持按部署环境自动选择主备 API 地址，可配置：

- `VITE_CLOUDFLARE_APP_URL`
- `VITE_VERCEL_APP_URL`
- `VITE_PRIMARY_API_BASE_URL`
- `VITE_FALLBACK_API_BASE_URL`

推荐配置方式：

- Cloudflare 前端部署时：
  - `VITE_PRIMARY_API_BASE_URL=https://你的-cloudflare-域名`
  - `VITE_FALLBACK_API_BASE_URL=https://你的-vercel-域名`
- Vercel 前端部署时：
  - `VITE_PRIMARY_API_BASE_URL=https://你的-vercel-域名`
  - `VITE_FALLBACK_API_BASE_URL=https://你的-cloudflare-域名`

如果不显式配置 `VITE_PRIMARY_API_BASE_URL`，前端会优先根据当前页面域名，以及 `VITE_CLOUDFLARE_APP_URL` / `VITE_VERCEL_APP_URL` 自动判断主备顺序。

### 跨域 Clerk 鉴权

当前项目已经支持跨域 API 请求时使用 Clerk token 鉴权。

建议同时配置：

- `FRONTEND_ORIGINS=https://你的-cloudflare-域名,https://你的-vercel-域名`

作用：

- 作为后端 CORS 白名单
- 作为 Clerk `authorizedParties` 白名单

说明：

- 同域请求仍可使用 cookie
- 跨域主备 API 切换时，前端会自动附带 `Authorization: Bearer <Clerk token>`
- 这比只依赖 cookie 更适合双域名主备 API 场景

## 本地开发

### 仅前端开发

```bash
npm install
npm run dev
```

这个命令只启动 Vite 前端，适合改页面样式和前端交互。

### Cloudflare 本地全栈开发

```bash
npm run build
npm run cf:dev
```

这个命令会同时运行：

- `dist/` 中的前端静态资源
- `worker.js` 中的 Cloudflare Worker 后端
- `/api/*` 下的共享 Hono API

默认本地地址：

- [http://localhost:8787](http://localhost:8787)

### Vercel 本地开发

```bash
npx vercel dev
```

说明：

- 当前项目在本地更适合优先使用 `wrangler dev` 验证 Cloudflare 全栈行为
- `vercel dev` 在部分机器上仍可能需要额外调整
- 如果要同时本地验证两套前后端，可以分别启动：
  - `npm run cf:dev`
  - `npx vercel dev`

## 构建

```bash
npm run build
```

## Cloudflare 部署

先构建，再部署：

```bash
npm run cf:build
npm run cf:deploy
```

Cloudflare 配置文件：

- `wrangler.toml`

### GitHub Actions 自动部署

项目已经内置 GitHub Actions 工作流：

- `.github/workflows/cloudflare-worker-deploy.yml`

默认行为：

- push 到 `main` 时自动部署
- 也支持手动触发 `workflow_dispatch`

你需要在 GitHub 仓库 Secrets 中配置：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

说明：

- 这个 workflow 只负责构建和执行 `wrangler deploy`
- Neon、Clerk、主备 API 等业务环境变量，仍然建议保留在 Cloudflare 后台配置
- 不建议把数据库连接串和 Clerk 密钥直接写进 GitHub Actions workflow

## Vercel 部署

在 Vercel 中将项目识别为 Vite 项目进行部署。

注意：

- Clerk webhook 只指向 Vercel
- 不要同时把同一个 Clerk webhook 配到 Vercel 和 Cloudflare
- 虽然这套共享 Hono 后端也可以部署到 Vercel，但当前推荐生产职责仍然是：Vercel 只负责 webhook，Cloudflare 负责主业务 API

## Clerk Webhook

当前建议由 Vercel 作为唯一的 Clerk webhook 写入入口。

Clerk webhook 地址示例：

- `https://<你的-vercel-域名>/api/clerk-webhook`

推荐监听事件：

- `user.created`
- `user.updated`
- `user.deleted`

这些 webhook 会把 Clerk 用户信息同步到 Neon 的 `users` 表。

## IndexedDB 本地缓存

前端使用 IndexedDB 做本地缓存和延迟同步，主要包括：

- 缓存 `combined.json`
- 缓存 `plans.json`
- 缓存当前用户的 bootstrap 数据
- 缓存待同步操作队列

当前使用的对象存储：

- `static_json`
- `user_cache`
- `pending_ops`

同步策略：

- 用户操作后立即更新 IndexedDB
- 普通写操作使用 10 分钟防抖批量同步
- 某些操作例如“选择背诵列表”会立即同步
- 页面关闭或刷新时，如果有待同步内容，会尝试再同步一次

## 主要 API

- `GET /api/me`
- `GET /api/bootstrap`
- `GET /api/plans`
- `GET /api/plans/:planId`
- `POST /api/plans/:planId/select`
- `GET /api/memorization`
- `POST /api/memorization/review`
- `POST /api/sync`
- `GET /api/static-data?name=combined`
- `GET /api/static-data?name=plans`
- `POST /api/clerk-webhook`
- `GET /api/db-test`

## 静态经文数据

静态经文数据文件位于：

- `data/combined.json`
- `data/plans.json`

挖空文本使用预先计算好的 `cuv_blank`。

说明：

- 这两份大 JSON 不会再被打进 Cloudflare Worker bundle
- 构建时会复制到 `dist/data/`
- Worker 运行时通过静态资源按需读取并做内存缓存
- 这样可以避免触发 Cloudflare 免费版 Worker 的 3 MiB 脚本体积限制

经文读取优先级：

1. `plans.json`
2. `combined.json`

## 当前验证状态

目前已经在 Cloudflare 本地 Worker 环境验证通过：

- 前端页面可用
- Clerk 登录鉴权可用
- `/api/me`
- `/api/bootstrap`
- `/api/static-data`
- `/api/sync`
- 通过 Worker 读写 Neon 数据库

另外已经完成：

- 前端主备 API 地址切换
- 按部署环境自动选择主备 API
- 跨域 Bearer token 鉴权接入

## 说明

- `npm run dev` 只适合前端开发
- 要验证 Cloudflare 后端行为，请使用 `npm run cf:dev`
- 当前默认由 Vercel 独占 Clerk webhook，同步用户数据到 Neon
- 如果以后要把 Vercel 作为完整备用站点启用，不需要重写后端，只需要补齐对应域名和环境变量
