# CBIT-AiForge

<div align="center">

[![CI Pipeline](https://github.com/reneverland/CBIT-AiForge/workflows/CI%20Pipeline/badge.svg)](https://github.com/reneverland/CBIT-AiForge/actions)
[![CodeQL](https://github.com/reneverland/CBIT-AiForge/workflows/CodeQL%20Security%20Scan/badge.svg)](https://github.com/reneverland/CBIT-AiForge/security)
[![GitHub Stars](https://img.shields.io/github/stars/reneverland/CBIT-AiForge?style=social)](https://github.com/reneverland/CBIT-AiForge/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/reneverland/CBIT-AiForge?style=social)](https://github.com/reneverland/CBIT-AiForge/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/reneverland/CBIT-AiForge)](https://github.com/reneverland/CBIT-AiForge/issues)
[![GitHub License](https://img.shields.io/github/license/reneverland/CBIT-AiForge)](https://github.com/reneverland/CBIT-AiForge/blob/main/LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-18+-61DAFB.svg)](https://reactjs.org/)

**Professional AI Model Platform for Computation and Reasoning**

[English](#english) | [中文](#中文)

</div>

---

## English

### 🎯 Overview

CBIT-AiForge is a professional AI model service platform designed for computation and reasoning tasks. It provides a comprehensive solution for document processing, RAG (Retrieval-Augmented Generation), model fine-tuning, and inference services.

### ✨ Key Features

- **📚 Intelligent Document Processing**
  - Multi-format support (PDF, Word, Excel, TXT, Markdown)
  - Automatic text cleaning and structuring
  - OpenAI-assisted QA format conversion
  - Vectorization and storage

- **🧠 Dual-Mode Inference**
  - **RAG**: Multi-knowledge base management with real-time retrieval
  - **Fine-tuning**: Template-based model training with guided UI

- **🚀 Model Services**
  - OpenAI API compatible (`/v1/chat/completions`)
  - Multi-model parallel serving
  - Real-time performance monitoring
  - Streaming output support

- **🎨 Modern Interface**
  - Responsive design with TailwindCSS
  - Drag-and-drop document upload
  - Real-time training progress visualization
  - Interactive inference testing

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (React + Vite + TailwindCSS)          │
│  • Document Upload  • KB Management             │
│  • Model Training   • Inference Testing         │
└────────────────────┬────────────────────────────┘
                     │ REST API / WebSocket
┌────────────────────▼────────────────────────────┐
│  FastAPI Backend Service                         │
│  • /api/documents   • /api/knowledge-bases       │
│  • /api/training    • /api/models                │
│  • /v1/chat/completions (OpenAI Compatible)     │
└───────────┬─────────────┬──────────────┬────────┘
            │             │              │
    ┌───────▼──────┐ ┌───▼────┐ ┌──────▼────────┐
    │  ChromaDB    │ │ SQLite │ │ Model Engine  │
    │  Vector DB   │ │ MetaDB │ │ (vLLM/Ollama) │
    └──────────────┘ └────────┘ └───────────────┘
```

### 🚀 Quick Start

#### Using Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/reneverland/CBIT-AiForge.git
cd CBIT-AiForge

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

Access the application:
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

#### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 📖 Usage Guide

1. **Create Knowledge Base** → Navigate to Knowledge Base Management
2. **Upload Documents** → Select KB and upload files (PDF, DOCX, etc.)
3. **Fine-tune Model** → Follow the 4-step wizard in Model Fine-tuning
4. **Activate Model** → Activate trained models in Model Management
5. **Start Inference** → Test in Inference page with model/KB selection

### 🔧 Configuration

All configurations are handled within Docker containers. For custom settings:

```bash
# Edit backend configuration
vi backend/app/core/config.py

# Rebuild containers
docker-compose build
docker-compose up -d
```

### 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# GPU version (requires NVIDIA Docker)
docker-compose -f docker-compose.gpu.yml up -d
```

### 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Backend** | FastAPI, Python 3.10+, SQLite, ChromaDB |
| **Frontend** | React 18, Vite, TailwindCSS, TypeScript |
| **AI/ML** | Transformers, Sentence-Transformers, LangChain |
| **Deployment** | Docker, Docker Compose, Nginx |

### 📊 System Requirements

- **CPU**: 2+ cores
- **RAM**: 4GB+ (16GB recommended)
- **Storage**: 20GB+
- **GPU**: Optional (for model training/inference)

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 👨‍💻 Author & Copyright

**CBIT-AiForge** © 2025 by [Reneverland](https://github.com/Reneverland)

**Institution**: CBIT, The Chinese University of Hong Kong  
**Website**: [cbit.cuhk.edu.cn](http://cbit.cuhk.edu.cn)

### 📧 Contact

- **GitHub Issues**: [Report Issues](https://github.com/reneverland/CBIT-AiForge/issues)
- **Email**: cooledward@outlook.com

---

## 中文

### 🎯 项目概述

CBIT-AiForge 是一个面向计算与推理任务的专业 AI 模型服务平台。提供文档处理、RAG 检索增强、模型微调和推理服务的完整解决方案。

### ✨ 核心功能

- **📚 智能文档处理**
  - 支持多种格式（PDF、Word、Excel、TXT、Markdown）
  - 自动清洗和结构化处理
  - OpenAI 辅助转换 QA 格式
  - 向量化存储与检索

- **🧠 双模式推理**
  - **RAG 模式**: 多知识库管理，实时检索增强
  - **微调模式**: 模板化训练流程，UI 步骤指引

- **🚀 模型服务**
  - 兼容 OpenAI API 格式 (`/v1/chat/completions`)
  - 多模型并行服务
  - 实时性能监控
  - 支持流式输出

- **🎨 现代化界面**
  - TailwindCSS 响应式设计
  - 拖拽式文档上传
  - 实时训练进度可视化
  - 交互式推理测试

### 🏗️ 系统架构

```
┌─────────────────────────────────────────────────┐
│  前端 (React + Vite + TailwindCSS)               │
│  • 文档上传   • 知识库管理   • 模型微调          │
│  • 推理测试                                      │
└────────────────────┬────────────────────────────┘
                     │ REST API / WebSocket
┌────────────────────▼────────────────────────────┐
│  FastAPI 后端服务                                │
│  • /api/documents   • /api/knowledge-bases       │
│  • /api/training    • /api/models                │
│  • /v1/chat/completions (OpenAI 兼容)           │
└───────────┬─────────────┬──────────────┬────────┘
            │             │              │
    ┌───────▼──────┐ ┌───▼────┐ ┌──────▼────────┐
    │  ChromaDB    │ │ SQLite │ │ 模型推理引擎  │
    │  向量数据库  │ │ 元数据 │ │ (vLLM/Ollama) │
    └──────────────┘ └────────┘ └───────────────┘
```

### 🚀 快速开始

#### 使用 Docker（推荐）

```bash
# 克隆仓库
git clone https://github.com/reneverland/CBIT-AiForge.git
cd CBIT-AiForge

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

访问应用：
- **前端界面**: http://localhost:80
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

#### 手动部署

**后端:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

### 📖 使用指南

1. **创建知识库** → 进入知识库管理页面
2. **上传文档** → 选择知识库并上传文件（PDF、DOCX 等）
3. **微调模型** → 在模型微调页面按 4 步向导操作
4. **激活模型** → 在模型管理页面激活训练好的模型
5. **开始推理** → 在推理测试页面选择模型/知识库进行对话

### 🔧 配置说明

所有配置已内置在 Docker 容器中。如需自定义配置：

```bash
# 编辑后端配置
vi backend/app/core/config.py

# 重新构建容器
docker-compose build
docker-compose up -d
```

### 🐳 Docker 常用命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# GPU 版本（需要 NVIDIA Docker）
docker-compose -f docker-compose.gpu.yml up -d
```

### 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **后端** | FastAPI, Python 3.10+, SQLite, ChromaDB |
| **前端** | React 18, Vite, TailwindCSS, TypeScript |
| **AI/ML** | Transformers, Sentence-Transformers, LangChain |
| **部署** | Docker, Docker Compose, Nginx |

### 📊 系统要求

- **CPU**: 2 核心以上
- **内存**: 4GB 以上（推荐 16GB）
- **存储**: 20GB 以上
- **GPU**: 可选（用于模型训练/推理）

### 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 📄 开源协议

本项目采用 MIT 协议开源 - 详见 [LICENSE](LICENSE) 文件

### 👨‍💻 作者与版权

**CBIT-AiForge** © 2025 by [Reneverland](https://github.com/Reneverland)

**机构**: CBIT, The Chinese University of Hong Kong  
**网站**: [cbit.cuhk.edu.cn](http://cbit.cuhk.edu.cn)

### 📧 联系方式

- **GitHub Issues**: [提交问题](https://github.com/reneverland/CBIT-AiForge/issues)
- **邮箱**: cooledward@outlook.com

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给我们一个星标！**

Made with ❤️ by CBIT Team

</div>
