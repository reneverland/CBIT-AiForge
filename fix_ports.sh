#!/bin/bash
# CBIT-AiForge 端口配置修复脚本
# 目标：前端 9300，后端 9200

set -e

echo "=========================================="
echo "🔧 CBIT-AiForge 端口配置修复"
echo "=========================================="
echo ""
echo "目标配置："
echo "  - 后端对外端口: 9200"
echo "  - 前端对外端口: 9300"
echo "  - 容器内部: backend:8000, frontend:80"
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 备份当前配置
echo "📦 备份当前配置..."
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
[ -f frontend/nginx.conf ] && cp frontend/nginx.conf frontend/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 配置已备份"
echo ""

# 2. 修复 docker-compose.yml
echo "🔨 修复 docker-compose.yml..."
cat > docker-compose.yml << 'EOFCOMPOSE'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: cbit_aiforge_backend
    ports:
      - "9200:8000"  # 外部9200端口映射到容器内8000端口
    volumes:
      - ./backend/app/data:/app/app/data
      - ./logs:/app/logs
    environment:
      - USE_GPU=false
      - DEBUG=false
      - API_HOST=0.0.0.0
      - API_PORT=8000  # 容器内部端口保持8000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    networks:
      - aiforge_network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: cbit_aiforge_frontend
    ports:
      - "9300:80"  # 外部9300端口映射到容器内80端口
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - aiforge_network

networks:
  aiforge_network:
    driver: bridge
EOFCOMPOSE

echo "✅ docker-compose.yml 已更新"
echo ""

# 3. 确保 frontend/nginx.conf 存在且正确
echo "🔨 修复 frontend/nginx.conf..."
mkdir -p frontend
cat > frontend/nginx.conf << 'EOFNGINX'
server {
    listen 80;
    server_name localhost;
    
    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理到后端容器（容器间通信用容器名:内部端口）
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # v1 API 代理
    location /v1/ {
        proxy_pass http://backend:8000/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查代理
    location /health {
        proxy_pass http://backend:8000/health;
        proxy_set_header Host $host;
    }
}
EOFNGINX

echo "✅ frontend/nginx.conf 已更新"
echo ""

# 4. 修复前端 API 配置
echo "🔨 修复前端 API 配置..."
mkdir -p frontend/src
cat > frontend/src/config.ts << 'EOFCONFIG'
/**
 * 前端配置文件
 * 根据环境自动选择API地址
 */

// 判断是否为生产环境（Docker）
const isProduction = import.meta.env.PROD

// 生产环境：使用空字符串（通过nginx代理到 backend:8000）
// 开发环境：使用本地端口 5003
export const API_BASE_URL = isProduction ? '' : 'http://localhost:5003'

console.log('🔧 API_BASE_URL:', API_BASE_URL || '(使用相对路径，通过nginx代理)')

// 导出默认配置
export default {
  API_BASE_URL
}
EOFCONFIG

echo "✅ frontend/src/config.ts 已创建"
echo ""

# 5. 修复前端代码中的硬编码端口
echo "🔨 修复前端代码中的 API_BASE 硬编码..."

# 备份并替换前端页面中的 API_BASE
for file in frontend/src/pages/*.tsx; do
    if [ -f "$file" ]; then
        # 检查是否包含 API_BASE 定义
        if grep -q "const API_BASE = 'http://localhost:5003'" "$file" 2>/dev/null; then
            echo "  修复: $file"
            # 替换为引入 config
            sed -i.bak "s|const API_BASE = 'http://localhost:5003'|import { API_BASE_URL } from '../config'\nconst API_BASE = API_BASE_URL|g" "$file"
        fi
        if grep -q "const API_URL = 'http://localhost:5003" "$file" 2>/dev/null; then
            echo "  修复: $file"
            sed -i.bak "s|const API_URL = 'http://localhost:5003/api'|import { API_BASE_URL } from '../config'\nconst API_URL = API_BASE_URL + '/api'|g" "$file"
        fi
    fi
done

echo "✅ 前端代码已修复"
echo ""

# 6. 显示配置摘要
echo "=========================================="
echo "📋 配置摘要"
echo "=========================================="
echo ""
echo "Docker 端口映射："
echo "  后端: 0.0.0.0:9200 → backend:8000"
echo "  前端: 0.0.0.0:9300 → frontend:80"
echo ""
echo "容器内部通信："
echo "  frontend → backend: http://backend:8000"
echo ""
echo "外部访问方式："
echo "  后端API: http://服务器IP:9200"
echo "  前端Web: http://服务器IP:9300"
echo ""
echo "前端页面通过 9300 端口访问，API 请求会被 nginx 代理到 backend:8000"
echo ""

# 7. 询问是否立即重启
echo "=========================================="
echo "🚀 下一步操作"
echo "=========================================="
echo ""
echo "配置文件已修复完成！"
echo ""
echo "请执行以下命令重启服务："
echo ""
echo "  # 停止旧容器"
echo "  docker-compose down"
echo ""
echo "  # 重新构建并启动"
echo "  docker-compose build --no-cache"
echo "  docker-compose up -d"
echo ""
echo "  # 查看日志"
echo "  docker-compose logs -f"
echo ""
echo "  # 测试访问"
echo "  curl http://localhost:9200/health  # 后端健康检查"
echo "  curl -I http://localhost:9300      # 前端访问"
echo ""
echo "=========================================="
echo "✅ 修复脚本执行完成！"
echo "=========================================="

