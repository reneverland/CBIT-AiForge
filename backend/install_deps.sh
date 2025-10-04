#!/bin/bash
# CBIT-AiForge 依赖安装脚本
# Dependency Installation Script

set -e

echo "=========================================="
echo "  📦 CBIT-AiForge 依赖安装"
echo "  Dependency Installation"
echo "=========================================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装"
    echo "   请安装 Python 3.8+"
    exit 1
fi

echo "✅ Python 版本:"
python3 --version
echo ""

# 升级 pip
echo "📥 升级 pip..."
python3 -m pip install --upgrade pip
echo ""

# 安装核心依赖（用于本地开发）
echo "📦 安装核心依赖..."
python3 -m pip install \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    python-multipart==0.0.6 \
    sqlalchemy==2.0.23 \
    chromadb==0.4.18 \
    pydantic==2.5.2 \
    pydantic-settings==2.1.0 \
    python-dotenv==1.0.0 \
    loguru==0.7.2 \
    aiofiles==23.2.1 \
    httpx==0.25.2

echo ""
echo "✅ 核心依赖安装完成"
echo ""

# 询问是否安装完整依赖
read -p "是否安装完整依赖（包含 AI/ML 库）？(y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 安装完整依赖（这可能需要几分钟）..."
    python3 -m pip install -r requirements.txt
    echo ""
    echo "✅ 完整依赖安装完成"
fi

echo ""
echo "=========================================="
echo "🎉 安装完成！"
echo "   Installation completed!"
echo ""
echo "现在可以运行："
echo "   python3 run_dev.py"
echo "=========================================="

