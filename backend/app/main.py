"""
cbitXForge - 计算与推理大模型服务平台
Main Application Entry Point

Copyright © 2025 Reneverland, CBIT, CUHK
Website: http://cbit.cuhk.edu.cn
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
import sys
from pathlib import Path

from app.core.config import settings
from app.api import documents, knowledge_bases, training, models, inference, ai_providers, embedding_providers, applications, fixed_qa, app_inference, search_providers, vector_db_providers
from app.models.database import init_db

# 配置日志
logger.remove()
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> | <level>{message}</level>",
    level=settings.LOG_LEVEL,
)
logger.add(
    settings.LOG_FILE,
    rotation="500 MB",
    retention="10 days",
    level=settings.LOG_LEVEL,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("🚀 cbitXForge 正在启动...")
    
    # 初始化数据库
    init_db()
    logger.info("✅ 数据库初始化完成")
    
    # 创建必要的目录
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    settings.MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("✅ 目录结构创建完成")
    
    # 自动加载API配置（如果存在）
    try:
        from app.utils.config_loader import auto_load_config
        from app.models.database import SessionLocal
        
        db = SessionLocal()
        try:
            if auto_load_config(db):
                logger.info("✅ API配置自动导入完成")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"⚠️ API配置自动导入失败: {e}")
    
    logger.info(f"✅ cbitXForge 启动成功！监听端口: {settings.API_PORT}")
    
    yield
    
    logger.info("👋 cbitXForge 正在关闭...")


# 创建 FastAPI 应用
app = FastAPI(
    title="cbitXForge API",
    description="计算与推理大模型服务平台 - 支持 RAG 检索增强 & 模型微调",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 配置
if settings.ENABLE_CORS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"全局异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": str(exc) if settings.DEBUG else "服务器内部错误",
        },
    )


# 健康检查（Docker用）
@app.get("/health")
async def health_check_root():
    """健康检查端点（Docker容器用）"""
    return {"status": "ok"}


# 健康检查（详细信息）
@app.get("/api/health", tags=["系统"])
async def health_check():
    """健康检查端点（详细信息）"""
    return {
        "status": "healthy",
        "service": "cbitXForge",
        "version": "1.0.0",
        "copyright": "© 2025 Reneverland, CBIT, CUHK",
    }


@app.get("/api/info", tags=["系统"])
async def api_info():
    """API信息"""
    return {
        "message": "欢迎使用 cbitXForge API",
        "description": "计算与推理大模型服务平台",
        "docs": "/docs",
        "redoc": "/redoc",
        "copyright": "© 2025 Reneverland, CBIT, CUHK",
        "website": "http://cbit.cuhk.edu.cn",
    }


# 注册路由
app.include_router(documents.router, prefix="/api/documents", tags=["文档管理"])
app.include_router(knowledge_bases.router, prefix="/api/knowledge-bases", tags=["知识库"])
app.include_router(training.router, prefix="/api/training", tags=["模型微调"])
app.include_router(models.router, prefix="/api/models", tags=["模型管理"])
app.include_router(inference.router, prefix="/v1", tags=["推理服务 (OpenAI 兼容)"])
app.include_router(ai_providers.router, prefix="/api/ai-providers", tags=["AI提供商配置"])
app.include_router(embedding_providers.router, prefix="/api/embedding-providers", tags=["Embedding配置"])
app.include_router(search_providers.router, prefix="/api/search-providers", tags=["搜索服务配置"])
app.include_router(vector_db_providers.router, prefix="/api/vector-db-providers", tags=["向量数据库配置"])
app.include_router(applications.router, prefix="/api/applications", tags=["应用管理"])
app.include_router(fixed_qa.router, prefix="/api/fixed-qa", tags=["固定Q&A管理"])
app.include_router(app_inference.router, prefix="/api", tags=["应用推理API"])

# Serve 前端静态文件（在所有API路由之后）
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # Mount assets directory
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    
    # Catch-all route for SPA (must be last)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        """Serve frontend SPA - 所有非API路由返回index.html"""
        # Skip API routes (already handled above)
        if full_path.startswith("api") or full_path.startswith("v1") or full_path in ["docs", "redoc", "openapi.json"]:
            return JSONResponse({"error": "Not Found"}, status_code=404)
        
        # Try to serve static file
        if full_path and not full_path.endswith("/"):
            file_path = frontend_dist / full_path
            if file_path.is_file():
                return FileResponse(file_path)
        
        # Return index.html for SPA routing
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        return JSONResponse({"error": "Frontend not built"}, status_code=404)
    
    logger.info(f"✅ 前端静态文件服务已启用: {frontend_dist}")
else:
    logger.warning(f"⚠️  前端静态文件不存在: {frontend_dist}。请先构建前端：cd frontend && npm run build")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.RELOAD,
        workers=settings.WORKERS,
    )

