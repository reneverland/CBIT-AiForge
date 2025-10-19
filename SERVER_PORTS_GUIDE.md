# 服务器端口配置指南

## 🎯 端口配置总览

### Docker 部署（服务器）
| 服务 | 外部端口 | 容器内部端口 | 说明 |
|------|----------|--------------|------|
| 后端API | `9200` | `8000` | FastAPI + Uvicorn |
| 前端Web | `9300` | `80` | Nginx + React |

### 本地开发
| 服务 | 端口 | 命令 |
|------|------|------|
| 后端API | `5003` | `python backend/run.py` |
| 前端Web | `5173` | `cd frontend && npm run dev` |

---

## 🚀 服务器快速部署

### 方法 1：使用一键部署脚本（推荐）

```bash
# 1. 上传 ZIP 文件到服务器并解压，或使用 git clone
cd /www/wwwroot/CBIT-AiForge-main

# 2. 执行一键部署
bash deploy_server.sh
```

### 方法 2：仅修复端口配置

```bash
# 如果只需要修复端口配置
cd /www/wwwroot/CBIT-AiForge-main
bash fix_ports.sh

# 然后手动重启
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 方法 3：手动部署

```bash
cd /www/wwwroot/CBIT-AiForge-main

# 1. 创建配置文件
mkdir -p backend/app/data
cp backend/app/data/api_config_template.json backend/app/data/api_config.json
nano backend/app/data/api_config.json  # 添加您的API密钥

# 2. 启动服务
docker-compose up -d --build

# 3. 查看日志
docker-compose logs -f
```

---

## 🔍 验证部署

### 1. 检查容器状态

```bash
docker-compose ps

# 应该看到：
# cbit_aiforge_backend    healthy    0.0.0.0:9200->8000/tcp
# cbit_aiforge_frontend   healthy    0.0.0.0:9300->80/tcp
```

### 2. 测试服务（从服务器本地）

```bash
# 测试后端
curl http://localhost:9200/health
# 应返回: {"status":"ok"}

# 测试前端
curl -I http://localhost:9300
# 应返回: HTTP/1.1 200 OK
```

### 3. 测试服务（从外部访问）

```bash
# 假设服务器IP是 192.168.1.100

# 测试后端
curl http://192.168.1.100:9200/health

# 测试前端（在浏览器中打开）
http://192.168.1.100:9300
```

---

## 🛠️ 常见问题

### Q1: 端口被占用怎么办？

```bash
# 查看端口占用
lsof -i :9200
lsof -i :9300

# 停止占用端口的进程
kill -9 <PID>

# 或修改 docker-compose.yml 使用其他端口
# 例如改为 "9201:8000" 和 "9301:80"
```

### Q2: 前端无法访问后端API？

**检查步骤**：

1. 确认前端代码使用了 `config.ts` 配置：
```bash
# 检查构建后的文件
docker exec cbit_aiforge_frontend cat /usr/share/nginx/html/index.html | grep -o "localhost:5003"
# 不应该有输出
```

2. 检查 nginx 配置：
```bash
docker exec cbit_aiforge_frontend cat /etc/nginx/conf.d/default.conf
# 应该看到 proxy_pass http://backend:8000
```

3. 测试容器间通信：
```bash
docker exec cbit_aiforge_frontend curl http://backend:8000/health
# 应返回: {"status":"ok"}
```

### Q3: 容器一直重启？

```bash
# 查看详细日志
docker-compose logs backend --tail=100
docker-compose logs frontend --tail=100

# 常见原因：
# 1. api_config.json 不存在或格式错误
# 2. 健康检查失败（端口不匹配）
# 3. 依赖关系问题（backend 未就绪）

# 解决方法：重新运行修复脚本
bash fix_ports.sh
docker-compose down -v
docker-compose up -d --build
```

### Q4: 防火墙阻止访问？

```bash
# Ubuntu/Debian
sudo ufw allow 9200/tcp
sudo ufw allow 9300/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=9200/tcp
sudo firewall-cmd --permanent --add-port=9300/tcp
sudo firewall-cmd --reload
```

---

## 📊 端口映射原理

### Docker 端口映射格式

```
宿主机端口:容器内部端口
```

示例：`9200:8000`
- 外部访问 `服务器IP:9200`
- Docker 将请求转发到容器内的 `8000` 端口
- 容器内的应用监听 `0.0.0.0:8000`

### 容器间通信

Docker Compose 创建了内部网络 `aiforge_network`，容器间可以通过**容器名**互相访问：

- 前端访问后端：`http://backend:8000`
- 不需要使用宿主机端口（`9200`）

### Nginx 代理配置

前端 nginx 配置：
```nginx
location /api/ {
    proxy_pass http://backend:8000/api/;  # 使用容器名:内部端口
}
```

用户访问流程：
```
浏览器 
  → http://服务器IP:9300/api/xxx 
  → Nginx (容器内80端口)
  → 代理到 http://backend:8000/api/xxx
  → 后端 FastAPI (容器内8000端口)
```

---

## 📝 宝塔面板配置（可选）

如果要通过域名访问（如 `https://forge.example.com`）：

### 1. 添加网站

宝塔面板 → 网站 → 添加站点
- 域名：`forge.example.com`
- 根目录：任意（会被代理覆盖）

### 2. 配置反向代理

点击站点 → 反向代理 → 添加：

**前端代理**：
```
代理名称：CBIT-AiForge
目标URL：http://127.0.0.1:9300
```

**API代理**（高级配置）：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:9200/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 3. 申请 SSL 证书

宝塔面板 → SSL → Let's Encrypt → 申请

完成后即可通过 `https://forge.example.com` 访问！

---

## 🔄 日常运维命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f              # 所有服务
docker-compose logs backend -f      # 仅后端
docker-compose logs frontend -f     # 仅前端

# 重启服务
docker-compose restart              # 所有服务
docker-compose restart backend      # 仅后端
docker-compose restart frontend     # 仅前端

# 停止服务
docker-compose down

# 完全清理重建
docker-compose down -v
docker system prune -f
docker-compose build --no-cache
docker-compose up -d

# 进入容器调试
docker exec -it cbit_aiforge_backend sh
docker exec -it cbit_aiforge_frontend sh
```

---

## 📚 相关文档

- [服务器部署指南](./SERVER_DEPLOYMENT.md)
- [更新工作流程](./UPDATE_WORKFLOW.md)
- [Docker Compose 配置](./docker-compose.yml)
- [前端配置说明](./frontend/src/config.ts)

---

## 💡 技术支持

如遇问题，请提供以下信息：

```bash
# 1. 容器状态
docker-compose ps

# 2. 最近日志
docker-compose logs --tail=50

# 3. 网络连接
curl -v http://localhost:9200/health
curl -v http://localhost:9300

# 4. 系统信息
docker version
docker-compose version
uname -a
```

