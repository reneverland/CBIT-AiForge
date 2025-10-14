#!/bin/bash

echo "🚀 CBIT Forge 一键启动"
echo "======================"
echo ""

# 检查是否有tmux或screen
if command -v tmux &> /dev/null; then
    SESSION_NAME="cbit_forge"
    
    # 检查session是否已存在
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        echo "⚠️  服务已在运行"
        echo "如需重启，请先运行: tmux kill-session -t $SESSION_NAME"
        exit 1
    fi
    
    echo "使用 tmux 启动服务..."
    echo ""
    
    # 创建新session并启动后端
    tmux new-session -d -s $SESSION_NAME -n backend "cd backend && python3 run.py"
    
    # 创建新窗口并启动前端
    tmux new-window -t $SESSION_NAME -n frontend "cd frontend && npm run dev"
    
    echo "✅ 服务已启动！"
    echo ""
    echo "📡 后端: http://localhost:5003"
    echo "🌐 前端: http://localhost:5173"
    echo "📖 API文档: http://localhost:5003/docs"
    echo ""
    echo "查看服务状态:"
    echo "  tmux attach -t $SESSION_NAME"
    echo ""
    echo "停止服务:"
    echo "  tmux kill-session -t $SESSION_NAME"
    echo ""
    
else
    echo "⚠️  未找到 tmux，将在前台启动后端服务"
    echo "请在另一个终端窗口中运行前端服务"
    echo ""
    echo "启动后端..."
    cd backend
    python3 run.py
fi

