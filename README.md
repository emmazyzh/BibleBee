# Bible Bee - 中英双语圣经背诵与研读平台

## 项目简介

Bible Bee 是一个帮助用户背诵和学习圣经经文的 Web 应用，支持中英双语对照、多种背诵模式和进度追踪。

## 项目结构

```
BibleBee/
├── frontend/          # 前端代码 (React + Tailwind CSS)
├── backend/           # 后端代码 (FastAPI)
│   ├── app/          # 应用代码
│   ├── env/          # Python 虚拟环境
│   └── requirements.txt
├── data/             # 数据文件 (JSON)
└── src/              # 原始 React 组件 (可选)
```

## 技术栈

- **前端**: React 18, Tailwind CSS, Lucide Icons
- **后端**: Python 3, FastAPI, Uvicorn
- **数据**: JSON 文件存储

## 快速启动

### 1. 启动后端服务

```bash
cd backend

# 激活虚拟环境
source env/bin/activate

# 安装依赖 (首次运行)
pip install -r requirements.txt

# 启动服务
python app/main.py
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

## 开发说明

### 后端 API 端点

- `GET /` - 健康检查
- `GET /api/verses` - 获取所有经文
- `GET /api/verses/{id}` - 获取单节经文
- `GET /api/verses/search/{query}` - 搜索经文
- `GET /api/collections` - 获取经文集合列表
- `GET /api/collections/{id}` - 获取单个集合
- `GET /api/collections/{id}/verses` - 获取集合中的经文
- `GET /api/leaderboard` - 获取排行榜数据

### 数据文件

- `data/verses.json` - 经文数据
- `data/collections.json` - 经文集合数据

## 功能特性

- 中英双语经文对照
- 多种背诵模式：对照、挖空、首字母
- 背诵进度追踪
- 经文搜索
- 排行榜
- 深色模式
- 响应式设计

## 环境要求

- Python 3.8+
- Node.js (可选，用于未来扩展)

## 许可证

MIT License
