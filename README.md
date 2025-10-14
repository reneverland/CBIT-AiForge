# CBIT-AiForge

> 企业级 AI 模型自动化训练与部署平台
> 
> AI Model Automation Training and Deployment Platform

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9%2B-blue)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-18.3-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115-green)](https://fastapi.tiangolo.com/)

## 📋 项目简介

CBIT-AiForge 是一个功能完整的 AI 模型训练与部署平台，支持 RAG（检索增强生成）、多模型管理、智能推理等企业级功能。

### ✨ 核心特性

- 🤖 **智能知识库管理** - 支持文档上传、智能文本拆分、向量化存储
- 🎯 **RAG 检索增强** - 混合检索、多源融合、智能问答
- 🔧 **多模型引擎** - 支持 OpenAI、Anthropic、Gemini 等多种 AI 提供商
- 📊 **应用实例管理** - 灵活配置检索策略、融合算法
- 🔍 **联网搜索集成** - 支持 Tavily、Google 等搜索引擎
- 💾 **向量数据库** - 支持 ChromaDB、Qdrant、Pinecone 等
- 🎨 **现代化界面** - 基于 React + TypeScript + Tailwind CSS

## 🏗️ 技术架构

### 后端技术栈
- **框架**: FastAPI + Uvicorn
- **数据库**: SQLite (数据) + ChromaDB/Qdrant (向量)
- **AI 引擎**: LangChain + OpenAI API
- **文档处理**: pypdf, python-docx, openpyxl

### 前端技术栈
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 框架**: Tailwind CSS
- **图标库**: Lucide React
- **路由**: React Router v6

## 🚀 快速开始

### 前置要求

- Python 3.9+
- Node.js 16+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/cbit_forge.git
cd cbit_forge
```

### 2. 后端设置

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动后端服务
python3 run.py
```

后端服务将在 `http://localhost:5003` 启动

### 3. 前端设置

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 `http://localhost:5173` 启动

### 4. 一键启动（推荐）

```bash
# 使用便捷脚本
./一键启动.sh

# 或
./start.sh
```

## 📁 项目结构

```
cbit_forge/
├── backend/                  # 后端服务
│   ├── app/
│   │   ├── api/             # API 路由
│   │   │   ├── knowledge_bases.py      # 知识库管理
│   │   │   ├── applications.py         # 应用管理
│   │   │   ├── ai_providers.py         # AI 提供商
│   │   │   ├── app_inference.py        # 智能推理
│   │   │   └── ...
│   │   ├── core/            # 核心引擎
│   │   │   ├── rag_engine.py           # RAG 引擎
│   │   │   ├── text_splitter.py        # 智能文本拆分
│   │   │   ├── hybrid_retrieval_engine.py  # 混合检索
│   │   │   ├── multi_model_engine.py   # 多模型引擎
│   │   │   └── ...
│   │   ├── models/          # 数据模型
│   │   │   └── database.py
│   │   ├── data/            # 数据存储
│   │   │   ├── forge.db     # 主数据库 ⭐
│   │   │   ├── chromadb/    # 向量数据库
│   │   │   └── uploads/     # 上传文件
│   │   └── main.py          # FastAPI 应用入口
│   ├── run.py               # 启动脚本
│   └── requirements.txt     # Python 依赖
│
├── frontend/                 # 前端应用
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── KnowledgeBasePage.tsx   # 知识库页面 ⭐
│   │   │   ├── ApplicationsPage.tsx    # 应用管理
│   │   │   ├── InferencePage.tsx       # 智能推理
│   │   │   └── ...
│   │   ├── components/      # 通用组件
│   │   ├── App.tsx          # 应用入口
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── LICENSE                   # 开源许可
├── README.md                # 项目文档
└── QUICKSTART.md            # 快速开始指南
```

## 🎯 核心功能

### 1. 知识库管理

- ✅ **智能文本拆分** - 5种拆分策略
  - 🤖 智能推荐 - AI 自动选择最佳策略
  - 💬 问答格式 - 识别 `::` 等分隔符
  - 🎯 语义拆分 - AI 识别语义边界
  - 📄 段落拆分 - 按自然段落
  - ✂️ 固定长度 - 按字符数分割

- 📁 **文件上传** - 支持 TXT, MD, DOC, DOCX, PDF
- 🔍 **向量检索** - 高效相似度搜索
- ✏️ **文本编辑** - 在线编辑、删除、批量操作

### 2. 应用实例管理

- 🎛️ **灵活配置** - 知识库、检索策略、融合算法
- 🔗 **多源融合** - 固定 Q&A、向量知识库、联网搜索
- 📊 **策略模式** - 安全优先 / 实时知识
- 🎨 **自定义回复** - 未达阈值时的回复内容

### 3. 智能推理

- 💬 **多轮对话** - 支持上下文记忆
- 🔍 **来源追溯** - 显示引用来源和置信度
- 🌐 **联网搜索** - 实时获取最新信息
- 📈 **性能监控** - 响应时间、token 使用统计

## 🔧 配置说明

### 环境变量

创建 `.env` 文件（可选）：

```bash
# OpenAI 配置
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# 数据库路径（默认：backend/app/data/forge.db）
SQLITE_DB_PATH=./app/data/forge.db

# 服务端口
API_PORT=5003
```

### 数据库位置

⭐ **重要**: 主数据库位置为 `backend/app/data/forge.db`

包含：
- 知识库配置
- 应用实例
- 固定 Q&A 对
- AI 提供商配置
- 向量数据库配置

## 📚 API 文档

启动后端服务后访问：

- Swagger UI: `http://localhost:5003/docs`
- ReDoc: `http://localhost:5003/redoc`

主要 API 端点：

```
POST   /api/knowledge-bases              # 创建知识库
GET    /api/knowledge-bases              # 获取知识库列表
POST   /api/knowledge-bases/{id}/texts/smart-split  # 智能文本拆分
POST   /api/knowledge-bases/{id}/texts/batch        # 批量导入文本
POST   /api/applications                 # 创建应用实例
POST   /api/app/{app_id}/inference       # 智能推理
GET    /api/ai-providers/providers/models/available # 获取可用模型
```

## 🎨 智能文本拆分示例

### 使用问答格式 (::分隔符)

```
输入：
经管学院有开设哪些博士专业？::学院开设的哲学博士项目有经济学博士项目、金融学博士项目、会计学博士项目...

输出：
Q: 经管学院有开设哪些博士专业？
A: 学院开设的哲学博士项目有经济学博士项目、金融学博士项目...
```

### 智能推荐策略

系统会自动检测文本格式并选择最佳拆分策略：
- 检测到 `::` → 使用问答格式拆分
- 检测到段落结构 → 使用段落拆分
- 长文本无明显结构 → 使用语义拆分（需 AI）

## 🔒 安全说明

- ⚠️ **生产环境**: 请修改 `API_SECRET_KEY`
- 🔐 **API 密钥**: 敏感信息存储在数据库中，请妥善保管
- 🌐 **CORS 配置**: 默认允许所有来源，生产环境请限制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 开源许可

本项目采用 [MIT License](LICENSE) 开源协议。

## 👥 作者

**Reneverland**  
CBIT, CUHK

© 2025 CBIT-AiForge. All rights reserved.

---

## 🆘 常见问题

### 1. 数据库找不到？

确保使用正确的数据库路径：`backend/app/data/forge.db`

### 2. 端口被占用？

```bash
# 杀掉占用端口的进程
lsof -ti:5003 | xargs kill -9  # 后端
lsof -ti:5173 | xargs kill -9  # 前端
```

### 3. 依赖安装失败？

```bash
# 升级 pip
pip install --upgrade pip

# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 4. 前端无法连接后端？

检查 `frontend/src/pages/KnowledgeBasePage.tsx` 中的 API_BASE 配置：
```typescript
const API_BASE = 'http://localhost:5003'
```

---

**🌟 如果这个项目对你有帮助，请给个 Star！**
