#!/bin/bash
# CBIT-AiForge 服务器一键部署脚本
# 完整流程：修复配置 → 构建 → 启动 → 验证

set -e

echo "=========================================="
echo "🚀 CBIT-AiForge 服务器一键部署"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 运行修复脚本
echo "📝 第1步：修复配置文件..."
bash fix_ports.sh

echo ""
echo "⏸️  按 Enter 继续部署，或按 Ctrl+C 取消..."
read

# 2. 确保配置文件存在
echo "📝 第2步：检查 API 配置..."
if [ ! -f "backend/app/data/api_config.json" ]; then
    echo "⚠️  未找到 api_config.json，从模板创建..."
    mkdir -p backend/app/data
    cp backend/app/data/api_config_template.json backend/app/data/api_config.json
    echo ""
    echo "⚠️  请编辑配置文件添加您的 API 密钥："
    echo "    nano backend/app/data/api_config.json"
    echo ""
    echo "按 Enter 继续（确保已配置 API 密钥）..."
    read
else
    echo "✅ api_config.json 已存在"
fi

# 3. 停止旧容器
echo ""
echo "📝 第3步：停止旧容器..."
docker-compose down -v 2>/dev/null || true
echo "✅ 旧容器已停止"

# 4. 清理旧镜像（可选）
echo ""
echo "📝 第4步：清理 Docker 缓存..."
docker system prune -f
echo "✅ 清理完成"

# 5. 重新构建
echo ""
echo "📝 第5步：构建 Docker 镜像..."
docker-compose build --no-cache
echo "✅ 镜像构建完成"

# 6. 启动服务
echo ""
echo "📝 第6步：启动服务..."
docker-compose up -d
echo "✅ 服务已启动"

# 7. 等待服务就绪
echo ""
echo "📝 第7步：等待服务启动..."
sleep 10

# 8. 检查容器状态
echo ""
echo "📝 第8步：检查容器状态..."
docker-compose ps
echo ""

# 9. 测试服务
echo "📝 第9步：测试服务..."
echo ""

echo "测试后端健康检查..."
if curl -f http://localhost:9200/health 2>/dev/null; then
    echo "✅ 后端服务正常 (http://localhost:9200)"
else
    echo "⚠️  后端健康检查失败，查看日志："
    docker-compose logs backend --tail=20
fi

echo ""
echo "测试前端访问..."
if curl -f -I http://localhost:9300 2>/dev/null | head -1; then
    echo "✅ 前端服务正常 (http://localhost:9300)"
else
    echo "⚠️  前端访问失败，查看日志："
    docker-compose logs frontend --tail=20
fi

# 10. 显示访问信息
echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前端Web: http://$(hostname -I | awk '{print $1}'):9300"
echo "  后端API: http://$(hostname -I | awk '{print $1}'):9200"
echo ""
echo "本地测试："
echo "  curl http://localhost:9200/health"
echo "  curl http://localhost:9300"
echo ""
echo "查看日志："
echo "  docker-compose logs -f"
echo "  docker-compose logs backend -f"
echo "  docker-compose logs frontend -f"
echo ""
echo "管理命令："
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo "  查看状态: docker-compose ps"
echo ""
echo "=========================================="

