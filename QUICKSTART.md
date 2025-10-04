# 快速开始指南

## 🚀 方式一：使用启动脚本（推荐）

```bash
./start.sh
```

这个脚本会自动：
1. 创建 Python 虚拟环境
2. 安装所有依赖
3. 启动后端和前端服务

## 📦 方式二：手动启动

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 🐳 方式三：Docker 部署

### CPU 版本

```bash
docker-compose up -d
```

### GPU 版本

```bash
docker-compose -f docker-compose.gpu.yml up -d
```

## 🎯 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

## 📝 配置 OpenAI API（可选）

如果需要使用 OpenAI 辅助生成训练数据：

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，添加你的 OPENAI_API_KEY
```

## 💡 使用流程

1. **创建知识库** → 知识库管理页面
2. **上传文档** → 选择知识库后上传
3. **微调模型** → 模型微调页面，按步骤操作
4. **推理测试** → 推理测试页面，选择模型/知识库进行对话

## 🔧 故障排除

### 端口被占用

修改 `backend/app/core/config.py` 中的 `API_PORT`

### 依赖安装失败

确保 Python 3.10+ 和 Node.js 18+ 已正确安装

### GPU 相关问题

本地开发默认使用 CPU 模式，实际训练和推理需要在 GPU 服务器上部署

---

© 2025 Reneverland, CBIT, CUHK

