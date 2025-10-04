"""
cbitXForge - 计算与推理大模型服务平台
Main Application Entry Point

Copyright © 2025 Reneverland, CBIT, CUHK
Website: http://cbit.cuhk.edu.cn
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
import sys

from app.core.config import settings
from app.api import documents, knowledge_bases, training, models, inference
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


# 健康检查
@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "cbitXForge",
        "version": "1.0.0",
        "copyright": "© 2025 Reneverland, CBIT, CUHK",
    }


@app.get("/", tags=["系统"])
async def root():
    """根路径"""
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


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.RELOAD,
        workers=settings.WORKERS,
    )

