#!/usr/bin/env python3
"""
CBIT-AiForge 本地开发服务器 (轻量版)
Local Development Server (Lite Version)

不加载 AI/ML 模块，仅用于测试基础 API 功能

用法 / Usage:
    python3 run_lite.py
    
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
os.environ.setdefault("RELOAD", "false")  # 关闭热重载避免模块问题
os.environ.setdefault("API_HOST", "0.0.0.0")
os.environ.setdefault("API_PORT", "5003")
os.environ.setdefault("USE_GPU", "false")

# 创建必要的目录
print("=" * 60)
print("  🚀 CBIT-AiForge 本地开发服务器 (轻量版)")
print("  Local Development Server (Lite Version)")
print("=" * 60)
print()
print("⚠️  注意: 轻量版不加载 AI/ML 功能")
print("   适用于测试基础 API 和健康检查")
print()

data_dir = project_root / "app" / "data"
dirs_to_create = [
    data_dir,
    data_dir / "chromadb",
    data_dir / "models",
    data_dir / "uploads",
    data_dir / "processed",
    project_root / "logs",
]

print("📂 准备数据目录...")
for dir_path in dirs_to_create:
    dir_path.mkdir(parents=True, exist_ok=True)

print()
print("=" * 60)
print("🌐 服务地址:")
print("   - 主页:     http://localhost:5003")
print("   - 健康检查:  http://localhost:5003/health")
print("   - API文档:  http://localhost:5003/docs")
print()
print("💡 提示: 按 Ctrl+C 停止服务器")
print("=" * 60)
print()

if __name__ == "__main__":
    import uvicorn
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from datetime import datetime
    
    # 创建简化的 FastAPI 应用
    app = FastAPI(
        title="CBIT-AiForge API (Lite)",
        description="轻量开发版本 - 仅基础功能",
        version="1.0.0-lite"
    )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 健康检查端点
    @app.get("/")
    async def root():
        return {
            "message": "CBIT-AiForge API (Lite Version)",
            "version": "1.0.0-lite",
            "status": "running",
            "mode": "development-lite",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "mode": "development-lite",
            "checks": {
                "api": "ok",
                "database": "skipped",
                "ml_models": "skipped"
            }
        }
    
    # API 路由占位
    @app.get("/api/knowledge-bases")
    async def list_knowledge_bases():
        return {
            "message": "轻量版 - AI/ML 功能未加载",
            "knowledge_bases": []
        }
    
    @app.get("/api/models")
    async def list_models():
        return {
            "message": "轻量版 - AI/ML 功能未加载",
            "models": []
        }
    
    @app.get("/api/status")
    async def get_status():
        return {
            "backend": "running",
            "version": "1.0.0-lite",
            "features": {
                "basic_api": True,
                "health_check": True,
                "ml_models": False,
                "rag_engine": False,
                "fine_tuning": False
            }
        }
    
    try:
        print("🚀 启动轻量服务器...")
        print()
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=5003,
            log_level="info",
        )
    except KeyboardInterrupt:
        print("\n")
        print("=" * 60)
        print("👋 服务器已停止")
        print("=" * 60)
    except Exception as e:
        print("\n")
        print("=" * 60)
        print(f"❌ 启动失败: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)

