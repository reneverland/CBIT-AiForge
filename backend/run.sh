#!/bin/bash
# CBIT-AiForge 本地开发启动脚本
# Local Development Startup Script

set -e

echo "=========================================="
echo "  🚀 CBIT-AiForge 开发服务器"
echo "  Local Development Server"
echo "=========================================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装"
    echo "   请安装 Python 3.10+"
    exit 1
fi

echo "✅ Python 版本:"
python3 --version
echo ""

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
    echo "✅ 虚拟环境创建完成"
    echo ""
fi

# 激活虚拟环境
echo "🔌 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📥 检查依赖..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✅ 依赖已安装"
echo ""

# 运行服务器
echo "=========================================="
echo "🚀 启动服务器 (端口 5003)"
echo "=========================================="
echo ""

python run.py

