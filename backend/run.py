#!/usr/bin/env python3
"""
CBIT-AiForge 本地开发服务器
Local Development Server

用法 / Usage:
    python run.py
    
访问 / Access:
    http://localhost:5003
    http://localhost:5003/health
    http://localhost:5003/docs

© 2025 Reneverland, CBIT, CUHK
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 设置环境变量（开发模式）
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("RELOAD", "true")
os.environ.setdefault("API_HOST", "0.0.0.0")
os.environ.setdefault("API_PORT", "5003")
os.environ.setdefault("USE_GPU", "false")

# 创建必要的目录
data_dir = project_root / "app" / "data"
data_dir.mkdir(parents=True, exist_ok=True)
(data_dir / "chromadb").mkdir(exist_ok=True)
(data_dir / "models").mkdir(exist_ok=True)
(data_dir / "uploads").mkdir(exist_ok=True)
(data_dir / "processed").mkdir(exist_ok=True)
(project_root / "logs").mkdir(exist_ok=True)

print("=" * 60)
print("  🚀 CBIT-AiForge 本地开发服务器")
print("  Local Development Server")
print("=" * 60)
print()
print("📂 项目目录:", project_root)
print("📂 数据目录:", data_dir)
print()
print("🌐 服务地址:")
print("   - 主页:     http://localhost:5003")
print("   - 健康检查:  http://localhost:5003/health")
print("   - API文档:  http://localhost:5003/docs")
print("   - ReDoc:    http://localhost:5003/redoc")
print()
print("💡 提示: 按 Ctrl+C 停止服务器")
print("=" * 60)
print()

if __name__ == "__main__":
    import uvicorn
    
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=5003,
            reload=True,
            log_level="info",
        )
    except KeyboardInterrupt:
        print("\n")
        print("👋 服务器已停止")
        print("Server stopped")
    except Exception as e:
        print(f"\n❌ 启动失败: {e}")
        print(f"Error: {e}")
        sys.exit(1)

