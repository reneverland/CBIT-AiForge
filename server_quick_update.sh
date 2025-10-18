#!/bin/bash
###############################################################################
# CBIT-AiForge 服务器快速更新脚本（不重新构建镜像）
# Quick Update Script - 仅更新代码，不重新构建Docker镜像
# 
# 适用场景：
#   - 只修改了Python代码或前端代码
#   - 没有修改Dockerfile或依赖项
#   - 需要快速更新（几秒钟完成）
#
# 使用方法：
#   1. chmod +x server_quick_update.sh
#   2. ./server_quick_update.sh
#
# © 2025 Reneverland, CBIT, CUHK
###############################################################################

set -e

echo "=========================================="
echo "⚡ CBIT-AiForge 快速更新"
echo "=========================================="
echo ""

# 1. 备份配置
echo "📦 备份配置..."
if [ -f "backend/app/data/api_config.json" ]; then
    cp backend/app/data/api_config.json backend/app/data/api_config.json.backup
fi

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 3. 恢复配置
if [ -f "backend/app/data/api_config.json.backup" ]; then
    cp backend/app/data/api_config.json.backup backend/app/data/api_config.json
fi

# 4. 重启容器（代码通过volume挂载会自动更新）
echo "🔄 重启容器..."
docker-compose restart

echo ""
echo "✅ 快速更新完成！"
echo ""
echo "📋 查看日志："
echo "   docker-compose logs -f"
echo ""

