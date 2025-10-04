#!/usr/bin/env python3
"""
CBIT-AiForge 本地开发服务器 (增强版)
Local Development Server (Enhanced)

用法 / Usage:
    python3 run_dev.py
    
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

print("=" * 60)
print("  🚀 CBIT-AiForge 本地开发服务器")
print("  Local Development Server")
print("=" * 60)
print()

# 检查 Python 版本
python_version = sys.version_info
print(f"✅ Python 版本: {python_version.major}.{python_version.minor}.{python_version.micro}")

if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
    print("❌ 错误: 需要 Python 3.8 或更高版本")
    print("   Error: Python 3.8+ required")
    sys.exit(1)

if python_version.minor == 9:
    print("⚠️  警告: 检测到 Python 3.9，建议使用 Python 3.10+")
    print("   Warning: Python 3.9 detected, Python 3.10+ recommended")
    print()

print()

# 检查必需的包
print("📦 检查依赖包...")
required_packages = {
    'fastapi': 'FastAPI',
    'uvicorn': 'Uvicorn',
    'sqlalchemy': 'SQLAlchemy',
    'chromadb': 'ChromaDB',
    'pydantic': 'Pydantic',
}

missing_packages = []
for package, name in required_packages.items():
    try:
        __import__(package)
        print(f"   ✅ {name}")
    except ImportError:
        print(f"   ❌ {name} (未安装)")
        missing_packages.append(package)

if missing_packages:
    print()
    print("⚠️  缺少依赖包！请先安装：")
    print("   Warning: Missing dependencies! Please install:")
    print()
    print(f"   pip3 install -r requirements.txt")
    print()
    print("   或者只安装缺失的包：")
    print("   Or install only missing packages:")
    print()
    print(f"   pip3 install {' '.join(missing_packages)}")
    print()
    sys.exit(1)

print()

# 设置环境变量（开发模式）
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("RELOAD", "true")
os.environ.setdefault("API_HOST", "0.0.0.0")
os.environ.setdefault("API_PORT", "5003")
os.environ.setdefault("USE_GPU", "false")

# 创建必要的目录
print("📂 准备数据目录...")
data_dir = project_root / "app" / "data"
dirs_to_create = [
    data_dir,
    data_dir / "chromadb",
    data_dir / "models",
    data_dir / "uploads",
    data_dir / "processed",
    project_root / "logs",
]

for dir_path in dirs_to_create:
    dir_path.mkdir(parents=True, exist_ok=True)
    print(f"   ✅ {dir_path.relative_to(project_root)}")

print()
print("=" * 60)
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

# 尝试导入应用
try:
    print("🔍 正在加载应用...")
    from app.main import app
    print("✅ 应用加载成功")
    print()
except Exception as e:
    print(f"❌ 应用加载失败: {e}")
    print()
    print("详细错误信息:")
    import traceback
    traceback.print_exc()
    print()
    sys.exit(1)

if __name__ == "__main__":
    import uvicorn
    
    try:
        print("🚀 启动服务器...")
        print()
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=5003,
            reload=True,
            log_level="info",
        )
    except KeyboardInterrupt:
        print("\n")
        print("=" * 60)
        print("👋 服务器已停止")
        print("   Server stopped")
        print("=" * 60)
    except Exception as e:
        print("\n")
        print("=" * 60)
        print(f"❌ 启动失败: {e}")
        print(f"   Error: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)

