# Bible Bee - 中英双语圣经背诵与研读平台

## 项目简介

Bible Bee 是一个帮助用户背诵和学习圣经经文的 Web 应用，支持中英双语对照、多种背诵模式和进度追踪。

## 项目结构

```
BibleBee/
├── api/                # 后端 API (FastAPI + Vercel Serverless)
│   ├── index.py        # Vercel 入口
│   ├── requirements.txt
│   └── src/            # 业务逻辑
├── frontend/           # 前端代码 (React + Tailwind CSS)
├── data/               # 数据文件 (JSON)
└── src/                # 原始 React 组件 (可选)
```

## 技术栈

- **前端**: React 18, Tailwind CSS, Lucide Icons
- **后端**: Python 3, FastAPI, Mangum (Vercel适配)
- **部署**: Vercel (Serverless Functions)
- **数据**: JSON 文件存储 (圣经全文), Vercel Postgres (用户数据)

## 本地开发

### 1. 启动后端服务

```bash
cd api

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python3 -m uvicorn index:app --reload --port 8001
```

后端服务将在 http://localhost:8001 启动

API 文档: http://localhost:8001/docs

### 2. 启动前端服务

```bash
cd frontend

# 启动静态文件服务器
python -m http.server 8080
```

前端将在 http://localhost:8080 启动

## Vercel 部署

### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

### 2. 登录并部署

```bash
vercel login
vercel
```

### 3. 配置环境变量

在 Vercel Dashboard 设置以下环境变量：

- `POSTGRES_URL` - Vercel Postgres 连接字符串
- `CLERK_SECRET_KEY` - Clerk 认证密钥
- `CLERK_PUBLISHABLE_KEY` - Clerk 公钥

### 4. 连接数据库

```bash
# 安装 Vercel Postgres
vercel integrations add vercel-postgres

# 获取连接字符串
vercel env pull .env.local
```

## API 端点

- `GET /` - 健康检查
- `GET /api/verses` - 获取所有经文
- `GET /api/verses/{id}` - 获取单节经文
- `GET /api/verses/search/{query}` - 搜索经文
- `GET /api/collections` - 获取经文集合列表
- `GET /api/collections/{id}` - 获取单个集合
- `GET /api/collections/{id}/verses` - 获取集合中的经文
- `GET /api/leaderboard` - 获取排行榜数据

## 数据存储

### 静态数据 (JSON)
- `data/verses.json` - 圣经经文数据
- `data/collections.json` - 经文集合数据

### 数据库 (Vercel Postgres)
- 用户进度 (艾宾浩斯记忆曲线)
- 背诵计划
- 用户成就

## 功能特性

- 中英双语经文对照
- 多种背诵模式：对照、挖空、首字母
- 艾宾浩斯记忆曲线复习
- 经文搜索
- 排行榜
- 用户认证 (Clerk)
- 深色模式
- 响应式设计

## 环境要求

- Python 3.9+
- Node.js 16+ (用于 Vercel CLI)

## 许可证

MIT License
