# BibleBee

BibleBee 是一个基于 React + Vite 的圣经背诵应用。当前支持两种部署形态：

- Vercel：前端 + Vercel Serverless API
- Cloudflare Pages：静态前端 + Pages Functions 代理 API 到 Vercel

统一依赖：

- 鉴权：Clerk
- 数据库：Neon Postgres
- 本地缓存：IndexedDB

## 1. 当前项目结构


- 前端应用：`src/`
- Vercel API：`api/`
- 服务端共享逻辑：`server/lib/`
- 服务端路由分发：`server/routes/`
- Cloudflare Pages API 代理：`functions/`
- 静态资源与圣经数据：`public/`
- 本地开发脚本：`scripts/`

## 2. 本地开发

前端和本地 API 需要同时启动：

```bash
npm install
npm run dev:all
```

也可以拆开运行：

```bash
npm run dev:api
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 本地 API：`http://localhost:3001`

说明：

- Vite 开发服务器会把 `/api/*` 代理到本地 API
- 本地要测试登录、数据库、同步、反馈等功能时，需要同时跑前端和 API

构建：

```bash
npm run build
```

## 3. Vercel API 说明

| API | 描述 | 输入 | 输出 |
| --- | --- | --- | --- |
| `3.1 DELETE /api/account` | 删除当前登录用户账号；删除 Clerk 用户；删除数据库中的 `users`、`user_verse`、`user_plan` | Clerk Bearer Token；无请求体 | `{ ok, deletedUserId, deletedClerkUserId }` |
| `3.2 GET /api/bootstrap` | 登录后一次性拉取前端启动核心数据：用户信息、计划列表、计划详情摘要、背诵数据 | Clerk Bearer Token | `{ ok, user, plans, planDetails, memorizationData, syncedAt }` |
| `3.3 POST /api/clerk-webhook` | Clerk Webhook 入口；处理 `user.created`、`user.updated`、`user.deleted`；同步 `users` 表 | Clerk Webhook 请求；`CLERK_WEBHOOK_SIGNING_SECRET` 验签 | 成功：`{ ok, type, clerkUserId }`；忽略事件：`{ ok, ignored: true, type }` |
| `3.4 GET /api/feedback` | 读取当前用户自己的反馈列表 | Clerk Bearer Token | `{ ok, feedback: [{ id, content, reply, status, created_at, modified_at }] }` |
| `3.5 POST /api/feedback` | 提交一条新的用户反馈 | Clerk Bearer Token；`{ content }`，至少 10 个字 | `{ ok, feedback }` |
| `3.6 GET /api/leaderboard` | 读取排行榜；按已掌握经文数排序 | 无需登录 | `{ ok, leaderboard: [{ id, username, image_url, mastered_count }] }` |
| `3.7 GET /api/me` | 检查当前请求是否已通过 Clerk 鉴权 | Clerk Bearer Token | `{ ok, userId, dbUserId }` |
| `3.8 GET /api/memorization` | 通过 `api/memorization.js` 分发到背诵数据读取逻辑；读取当前用户背诵数据 | Clerk Bearer Token | `{ ok, activeVerses, masteredVerses }` |
| `3.9 POST /api/memorization/review` | 通过 `api/memorization.js` 分发到背诵复习逻辑；更新数据库闪卡状态 | Clerk Bearer Token；`{ userVerseId, action }` | 例如 `{ ok, status: 'mastered' }`|
| `3.10 GET /api/plans` | 通过 `api/plans.js` 分发到计划列表逻辑；读取计划列表；支持游客模式 | 无需登录 | `{ ok, plans: [{ id, plan_name, description, verse_count, is_selected, selected_users }] }` 已登录时返回 `is_selected` |
| `3.11 GET /api/plans/:planId` | 通过 `api/plans.js` 分发到计划详情逻辑；读取单个计划详情与经文列表 | 路径参数 `planId`；无需登录 | `{ ok, plan, verses }` |
| `3.12 POST /api/plans/:planId/select` | 通过 `api/plans.js` 分发到计划选择逻辑；选择计划并加入当前用户闪卡 | Clerk Bearer Token；路径参数 `planId`；请求体 `{ clearCurrent }` | `{ ok, planId, planName, verseCount }` |
| `3.13 POST /api/settings` | 保存用户圣经版本设置 | Clerk Bearer Token；`{ chVersion, enVersion }` | `{ ok, chVersion, enVersion }` |
| `3.14 GET /api/static-data?name=combined` | 读取完整版静态圣经数据 | 查询参数 `name=combined` | `{ ok, name, data }` |
| `3.15 GET /api/static-data?name=frequent` | 读取常用背诵经文静态数据 | 查询参数 `name=frequent` | `{ ok, name, data }` |
| `3.16 POST /api/sync` | 把前端 IndexedDB 中累积的用户操作批量同步到 Neon | Clerk Bearer Token；`{ operations: [{ type, payload }] }`，支持 `review`、`selectPlan`、`addVerse`、`removeVerse` | `{ ok, synced, results }` |

## 4. 静态圣经数据说明

静态数据位于：

- `public/data/combined.json`
- `public/data/frequent.json`

### 4.1. `combined.json`

作用：

- 完整圣经经文数据源
- 用于经文搜索
- 用于按 `verse_id` 回填经文正文
- 包含中英文版本与中文挖空 `cuv_blank`

特点：

- 体积较大
- 前端优先缓存在 IndexedDB
- 不再默认每次刷新都强制重下

### 4.2.  `frequent.json`

作用：

- 存放常用背诵经文集合
- 来源于原始计划经文，已按 `verse_id` 去重并保留首次出现项
- 首页游客模式、计划页 hydrate、研读页兜底会使用它

特点：

- 每次页面刷新时都会重新读取并覆盖 IndexedDB 缓存
- 体积远小于 `combined.json`

### 4.3. 前端 IndexedDB 缓存内容

IndexedDB 由 `src/lib/indexed-db.js` 管理，包含 3 个对象仓库：

- `static_json`
  - 缓存 `combined`、`frequent`
- `user_cache`
  - 缓存当前用户的 `plans`、`planDetails`、`memorizationData`
- `pending_ops`
  - 缓存待同步到 `/api/sync` 的本地操作

## 5. 环境变量

### 5.1. 前端构建环境变量

- `VITE_CLERK_PUBLISHABLE_KEY`
  - Clerk 前端 Publishable Key

### 5.2. Vercel 环境变量

- `BIBLEBEE_DATABASE_URL`
  - Neon 连接串，主用
- `BIBLEBEE_POSTGRES_URL`
  - 兼容回退连接串，可选
- `CLERK_SECRET_KEY`
  - Clerk 服务端密钥
- `CLERK_PUBLISHABLE_KEY`
  - 服务端兜底读取用，可选但建议配置
- `VITE_CLERK_PUBLISHABLE_KEY`
  - 前端构建时注入
- `CLERK_WEBHOOK_SIGNING_SECRET`
  - Clerk Webhook 验签密钥
- `FRONTEND_ORIGINS`
  - 允许跨域访问 Vercel API 的前端域名列表
  - 例如：
  - `https://bible-bee.vercel.app,https://biblebee.pages.dev,http://localhost:5173`
  - Vercel API 的 CORS 会严格按这个白名单放行；未列出的 `Origin` 会返回 `403 Origin not allowed`

### 5.3. Cloudflare Pages 环境变量

Cloudflare Pages 目前只负责静态前端和 API 代理，不承载业务后端逻辑。

必须配置：

- `VITE_CLERK_PUBLISHABLE_KEY`
  - Pages 前端登录必需
- `API_PROXY_TARGET`
  - Pages Functions 代理目标
  - 例如：`https://bible-bee.vercel.app`

按需要配置：

说明：

- Cloudflare Pages 不需要 `CLERK_SECRET_KEY`
- Cloudflare Pages 不需要 `BIBLEBEE_DATABASE_URL`
- Clerk 登录注册仍由浏览器直接连接 Clerk，不经过 Pages Functions

## 6. Cloudflare 代理接口说明

代理文件：

- `functions/api/[[path]].js`

作用：

- 仅代理业务 API 请求
- 不承载任何业务逻辑
- 不处理数据库
- 不处理 Clerk Webhook

请求链路：

1. 浏览器访问 `https://biblebee.pages.dev`
2. 前端调用同源 `/api/*`
3. Pages Functions 把请求转发到 `API_PROXY_TARGET`
4. 最终由 Vercel API 处理业务

当前默认代理目标：

- `https://bible-bee.vercel.app`

不会被代理的内容：

- Clerk 前端 SDK
- Clerk 登录注册
- 静态资源 `/assets/*`
- 静态文件 `/data/*`
