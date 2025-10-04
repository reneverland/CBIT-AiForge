#!/bin/bash

# cbitXForge 启动脚本
# © 2025 Reneverland, CBIT, CUHK

set -e

echo "========================================="
echo "  cbitXForge - 计算与推理大模型服务平台  "
echo "  © 2025 Reneverland, CBIT, CUHK"
echo "========================================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装，请先安装 Python 3.10+"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

# 后端设置
echo "🔧 设置后端..."
cd backend

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "🔌 激活虚拟环境..."
source venv/bin/activate

echo "📥 安装后端依赖..."
pip install -q -r requirements.txt

echo "✅ 后端设置完成"
echo ""

# 前端设置
echo "🔧 设置前端..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "📥 安装前端依赖..."
    npm install
fi

echo "✅ 前端设置完成"
echo ""

# 启动服务
echo "========================================="
echo "🚀 启动服务..."
echo "========================================="
echo ""

cd ../backend
echo "▶️  启动后端 (http://localhost:8000)"
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ../frontend
echo "▶️  启动前端 (http://localhost:5173)"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "✅ 服务启动成功！"
echo "========================================="
echo ""
echo "📍 前端地址: http://localhost:5173"
echo "📍 后端地址: http://localhost:8000"
echo "📍 API 文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 等待
wait

