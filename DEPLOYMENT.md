# Deployment Guide | 部署指南

## English

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ Storage

### Production Deployment

1. **Clone Repository**
   ```bash
   git clone https://github.com/reneverland/CBIT-AiForge.git
   cd CBIT-AiForge
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Verify Deployment**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

4. **Access Application**
   - Frontend: http://your-server-ip:80
   - API: http://your-server-ip:8000

### GPU Deployment

For GPU-accelerated model training and inference:

```bash
# Install NVIDIA Docker
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# Start with GPU support
docker-compose -f docker-compose.gpu.yml up -d
```

### Data Persistence

All data is stored in Docker volumes:
- `aiforge_data`: Database, uploads, models
- `aiforge_logs`: Application logs

Backup:
```bash
docker run --rm -v aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/aiforge_backup.tar.gz /data
```

Restore:
```bash
docker run --rm -v aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/aiforge_backup.tar.gz -C /
```

---

## 中文

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ 内存
- 20GB+ 存储空间

### 生产环境部署

1. **克隆仓库**
   ```bash
   git clone https://github.com/reneverland/CBIT-AiForge.git
   cd CBIT-AiForge
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **验证部署**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

4. **访问应用**
   - 前端: http://your-server-ip:80
   - API: http://your-server-ip:8000

### GPU 部署

用于 GPU 加速的模型训练和推理：

```bash
# 安装 NVIDIA Docker
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# 使用 GPU 支持启动
docker-compose -f docker-compose.gpu.yml up -d
```

### 数据持久化

所有数据存储在 Docker 卷中：
- `aiforge_data`: 数据库、上传文件、模型
- `aiforge_logs`: 应用日志

备份：
```bash
docker run --rm -v aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/aiforge_backup.tar.gz /data
```

恢复：
```bash
docker run --rm -v aiforge_data:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/aiforge_backup.tar.gz -C /
```

