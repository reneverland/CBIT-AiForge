# 本地开发指南 | Local Development Guide

## 🚀 快速开始 | Quick Start

### 方法 1: 使用 Python 脚本（推荐）

```bash
cd backend
python run.py
```

访问：http://localhost:5003

### 方法 2: 使用 Shell 脚本

```bash
cd backend
chmod +x run.sh
./run.sh
```

### 方法 3: 手动启动

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5003
```

---

## 📍 访问地址 | Access URLs

| 服务 | URL | 说明 |
|------|-----|------|
| **主页** | http://localhost:5003 | API 根路径 |
| **健康检查** | http://localhost:5003/health | 健康状态 |
| **API 文档** | http://localhost:5003/docs | Swagger UI |
| **ReDoc** | http://localhost:5003/redoc | 备用文档 |
| **知识库** | http://localhost:5003/api/knowledge-bases | 知识库列表 |
| **模型** | http://localhost:5003/api/models | 模型列表 |

---

## 🧪 测试服务器 | Test Server

### 启动服务器后测试

```bash
# 在另一个终端运行
cd backend
python test_server.py
```

### 手动测试

```bash
# 测试健康检查
curl http://localhost:5003/health

# 测试知识库 API
curl http://localhost:5003/api/knowledge-bases

# 测试模型 API
curl http://localhost:5003/api/models
```

---

## 🔧 开发配置 | Development Settings

### 自动配置（run.py）

启动脚本会自动设置：

```python
DEBUG = true
RELOAD = true
API_HOST = 0.0.0.0
API_PORT = 5003
USE_GPU = false
```

### 数据目录

自动创建以下目录：

```
backend/
├── app/data/
│   ├── chromadb/      # 向量数据库
│   ├── models/        # 模型文件
│   ├── uploads/       # 上传文件
│   ├── processed/     # 处理后文件
│   └── forge.db       # SQLite 数据库
└── logs/              # 日志文件
```

---

## 🐛 调试技巧 | Debug Tips

### 1. 查看实时日志

启动服务器后，所有日志会实时显示在终端。

### 2. 检查数据库

```bash
cd backend/app/data
sqlite3 forge.db

# 查看表
.tables

# 查看知识库
SELECT * FROM knowledge_bases;

# 退出
.quit
```

### 3. 清空数据重新开始

```bash
cd backend
rm -rf app/data/chromadb app/data/forge.db
python run.py
```

### 4. 检查端口占用

```bash
# macOS/Linux
lsof -i :5003

# Windows
netstat -ano | findstr :5003
```

---

## 🔥 常见问题 | Troubleshooting

### 问题 1: 模块导入失败

**错误**: `ModuleNotFoundError: No module named 'fastapi'`

**解决**:
```bash
cd backend
pip install -r requirements.txt
```

### 问题 2: 端口被占用

**错误**: `Address already in use`

**解决**:
```bash
# 杀死占用 5003 端口的进程
kill $(lsof -t -i:5003)

# 或者使用其他端口
python -m uvicorn app.main:app --port 5004
```

### 问题 3: ChromaDB 错误

**错误**: `chromadb.errors.*`

**解决**:
```bash
# 删除 ChromaDB 数据
rm -rf app/data/chromadb
# 重新启动
python run.py
```

### 问题 4: SQLite 锁定

**错误**: `database is locked`

**解决**:
```bash
# 删除数据库
rm app/data/forge.db
# 重新启动
python run.py
```

---

## 📝 开发工作流 | Development Workflow

### 1. 启动开发服务器

```bash
cd backend
python run.py
```

### 2. 修改代码

编辑任何 `.py` 文件，服务器会自动重新加载（hot reload）。

### 3. 测试 API

使用浏览器访问 http://localhost:5003/docs 测试 API。

### 4. 查看日志

终端会实时显示所有请求和错误。

### 5. 停止服务器

按 `Ctrl+C`

---

## 🎯 与前端联调 | Frontend Integration

### 启动后端（5003端口）

```bash
cd backend
python run.py
```

### 启动前端（5173端口）

```bash
cd frontend
npm run dev
```

### 前端配置

前端会自动代理 API 请求到后端：

```typescript
// vite.config.ts 已配置
proxy: {
  '/api': 'http://localhost:8000',  // 修改为 http://localhost:5003
  '/v1': 'http://localhost:8000',   // 修改为 http://localhost:5003
}
```

**临时修改前端代理（仅开发）**:

```bash
cd frontend
# 编辑 vite.config.ts
# 将 8000 改为 5003
npm run dev
```

---

## 🔍 诊断 Docker 健康检查问题

### 在本地复现 Docker 环境

```bash
# 启动本地服务器
cd backend
python run.py

# 在另一个终端测试健康检查
curl http://localhost:5003/health

# 如果成功，说明代码没问题
# 如果失败，查看错误信息
```

### 检查启动时间

```bash
# 记录启动时间
time python run.py &

# 测试何时可以访问
while ! curl -f http://localhost:5003/health 2>/dev/null; do
    echo "Waiting..."
    sleep 1
done
echo "Server is ready!"
```

---

## 📊 性能测试 | Performance Testing

### 测试响应时间

```bash
# 安装 httpie
pip install httpie

# 测试 API
time http GET http://localhost:5003/health
time http GET http://localhost:5003/api/knowledge-bases
```

### 压力测试

```bash
# 安装 ab (Apache Bench)
# macOS: brew install httpd
# Ubuntu: apt-get install apache2-utils

# 100 请求，10 并发
ab -n 100 -c 10 http://localhost:5003/health
```

---

## 🎓 VS Code 调试配置

创建 `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: FastAPI",
            "type": "python",
            "request": "launch",
            "module": "uvicorn",
            "args": [
                "app.main:app",
                "--reload",
                "--host", "0.0.0.0",
                "--port", "5003"
            ],
            "jinja": true,
            "cwd": "${workspaceFolder}/backend"
        }
    ]
}
```

---

## 📚 相关文件 | Related Files

| 文件 | 用途 |
|------|------|
| `run.py` | 本地开发启动脚本 |
| `run.sh` | Shell 启动脚本 |
| `test_server.py` | 服务器测试脚本 |
| `app/main.py` | FastAPI 应用主文件 |
| `requirements.txt` | Python 依赖 |

---

## 🌟 下一步 | Next Steps

1. ✅ 启动本地服务器
2. ✅ 访问 API 文档: http://localhost:5003/docs
3. ✅ 测试健康检查: http://localhost:5003/health
4. ✅ 创建知识库并测试
5. ✅ 与前端联调

---

**© 2025 Reneverland, CBIT, CUHK**

