#!/bin/bash
###############################################################################
# CBIT-AiForge 服务器端更新脚本
# Server Update Script for Docker Deployment
# 
# 使用方法：
#   1. 在服务器上克隆项目后，运行此脚本即可更新到最新版本
#   2. chmod +x server_update.sh
#   3. ./server_update.sh
#
# © 2025 Reneverland, CBIT, CUHK
###############################################################################

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 CBIT-AiForge 服务器更新脚本"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 备份当前配置（如果存在）
echo "📦 备份当前配置..."
if [ -f "backend/app/data/api_config.json" ]; then
    cp backend/app/data/api_config.json backend/app/data/api_config.json.backup
    echo "✅ 配置文件已备份"
fi

# 2. 拉取最新代码
echo ""
echo "📥 拉取最新代码..."
git fetch origin main
git pull origin main

# 3. 恢复配置文件
if [ -f "backend/app/data/api_config.json.backup" ]; then
    cp backend/app/data/api_config.json.backup backend/app/data/api_config.json
    echo "✅ 配置文件已恢复"
fi

# 4. 停止并删除旧容器（保留数据卷）
echo ""
echo "🛑 停止旧容器..."
docker-compose down

# 5. 重新构建镜像（如果代码有变化）
echo ""
echo "🔨 重新构建镜像..."
docker-compose build --no-cache

# 6. 启动新容器
echo ""
echo "🚀 启动新容器..."
docker-compose up -d

# 7. 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 8. 检查服务状态
echo ""
echo "📊 检查服务状态..."
docker-compose ps

# 9. 显示日志
echo ""
echo "📋 最近日志（按Ctrl+C退出查看）："
echo "----------------------------------------"
docker-compose logs -f --tail=50

echo ""
echo "=========================================="
echo "✅ 更新完成！"
echo "=========================================="

