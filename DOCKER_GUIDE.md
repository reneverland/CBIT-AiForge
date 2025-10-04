# Docker Deployment Guide | Docker 部署指南

## English

### 🚢 One-Command Deployment

The easiest way to deploy CBIT-AiForge:

```bash
docker-compose up -d
```

That's it! No environment configuration needed - everything is pre-configured in the containers.

### 📦 What's Included

- **Backend Service**: FastAPI application with all dependencies
- **Frontend Service**: React application served by Nginx
- **Persistent Storage**: Docker volumes for database and uploads
- **Health Checks**: Automatic service monitoring

### 🔍 Container Details

#### Backend Container
- **Port**: 8000
- **Database**: SQLite at `/app/app/data/forge.db`
- **Uploads**: `/app/app/data/uploads`
- **Models**: `/app/app/data/models`
- **Vector DB**: `/app/app/data/chromadb`
- **Logs**: `/app/logs`

#### Frontend Container
- **Port**: 80
- **Technology**: Nginx serving React static files
- **Proxy**: API requests forwarded to backend

### 📊 Service Management

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

### 🔧 Troubleshooting

**Port already in use:**
```bash
# Edit docker-compose.yml to change ports
# For example, change "80:80" to "8080:80"
```

**View container logs:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Check container health:**
```bash
docker ps
# Look for "healthy" status
```

**Rebuild containers after code changes:**
```bash
docker-compose build
docker-compose up -d
```

### 💾 Data Backup

All data is stored in Docker volumes:

```bash
# Backup
docker run --rm -v cbit_forge_aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm -v cbit_forge_aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/backup-20250104.tar.gz -C /
```

### 🖥️ GPU Support

For GPU-accelerated training and inference:

```bash
# Use GPU version
docker-compose -f docker-compose.gpu.yml up -d
```

**Requirements:**
- NVIDIA GPU
- NVIDIA Docker Runtime
- CUDA 11.0+

---

## 中文

### 🚢 一键部署

最简单的部署方式：

```bash
docker-compose up -d
```

就这么简单！无需配置环境变量 - 所有配置都已内置在容器中。

### 📦 包含内容

- **后端服务**: 包含所有依赖的 FastAPI 应用
- **前端服务**: Nginx 提供的 React 应用
- **持久化存储**: Docker 卷存储数据库和上传文件
- **健康检查**: 自动服务监控

### 🔍 容器详情

#### 后端容器
- **端口**: 8000
- **数据库**: SQLite 位于 `/app/app/data/forge.db`
- **上传文件**: `/app/app/data/uploads`
- **模型文件**: `/app/app/data/models`
- **向量数据库**: `/app/app/data/chromadb`
- **日志**: `/app/logs`

#### 前端容器
- **端口**: 80
- **技术**: Nginx 提供 React 静态文件
- **代理**: API 请求转发到后端

### 📊 服务管理

```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 停止并删除卷（⚠️ 会删除所有数据）
docker-compose down -v
```

### 🔧 故障排除

**端口已被占用:**
```bash
# 编辑 docker-compose.yml 更改端口
# 例如，将 "80:80" 改为 "8080:80"
```

**查看容器日志:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**检查容器健康状态:**
```bash
docker ps
# 查找 "healthy" 状态
```

**代码更改后重新构建:**
```bash
docker-compose build
docker-compose up -d
```

### 💾 数据备份

所有数据存储在 Docker 卷中：

```bash
# 备份
docker run --rm -v cbit_forge_aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# 恢复
docker run --rm -v cbit_forge_aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/backup-20250104.tar.gz -C /
```

### 🖥️ GPU 支持

用于 GPU 加速的训练和推理：

```bash
# 使用 GPU 版本
docker-compose -f docker-compose.gpu.yml up -d
```

**要求:**
- NVIDIA GPU
- NVIDIA Docker Runtime
- CUDA 11.0+

