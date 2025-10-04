"""
模型管理 API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from loguru import logger

from app.models.database import get_db, Model as ModelModel
from app.core.config import settings

router = APIRouter()


@router.get("/")
async def list_models(
    skip: int = 0,
    limit: int = 20,
    model_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取模型列表"""
    query = db.query(ModelModel)
    
    if model_type:
        query = query.filter(ModelModel.model_type == model_type)
    
    models = query.order_by(ModelModel.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": query.count(),
        "models": [
            {
                "id": model.id,
                "name": model.name,
                "display_name": model.display_name,
                "description": model.description,
                "base_model": model.base_model,
                "model_type": model.model_type,
                "port": model.port,
                "status": model.status,
                "created_at": model.created_at.isoformat() if model.created_at else None,
                "trained_at": model.trained_at.isoformat() if model.trained_at else None,
            }
            for model in models
        ]
    }


@router.get("/{model_id}")
async def get_model(
    model_id: int,
    db: Session = Depends(get_db)
):
    """获取模型详情"""
    model = db.query(ModelModel).filter(ModelModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    return {
        "id": model.id,
        "name": model.name,
        "display_name": model.display_name,
        "description": model.description,
        "base_model": model.base_model,
        "model_type": model.model_type,
        "model_path": model.model_path,
        "port": model.port,
        "status": model.status,
        "training_config": model.training_config,
        "performance_metrics": model.performance_metrics,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "trained_at": model.trained_at.isoformat() if model.trained_at else None,
    }


@router.post("/{model_id}/activate")
async def activate_model(
    model_id: int,
    port: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    激活模型（启动推理服务）
    
    注意：实际部署需要在 GPU 服务器上运行
    """
    model = db.query(ModelModel).filter(ModelModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    # 分配端口
    if not port:
        # 查找可用端口
        used_ports = [m.port for m in db.query(ModelModel).filter(ModelModel.port.isnot(None)).all()]
        port = settings.MODEL_PORT_START
        while port in used_ports:
            port += 1
    
    # 在生产环境中，这里会启动模型服务
    # start_model_service(model, port)
    
    model.port = port
    model.status = "active"
    db.commit()
    
    logger.info(f"✅ 模型已激活: {model.name} on port {port}")
    
    return {
        "message": "模型已激活",
        "model_id": model.id,
        "model_name": model.name,
        "port": port,
        "status": "active",
        "note": "实际推理服务需要在 GPU 服务器上运行。本地开发环境仅更新状态。"
    }


@router.post("/{model_id}/deactivate")
async def deactivate_model(
    model_id: int,
    db: Session = Depends(get_db)
):
    """停用模型"""
    model = db.query(ModelModel).filter(ModelModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    # 在生产环境中，这里会停止模型服务
    # stop_model_service(model)
    
    model.status = "inactive"
    model.port = None
    db.commit()
    
    logger.info(f"✅ 模型已停用: {model.name}")
    
    return {
        "message": "模型已停用",
        "model_id": model.id,
        "model_name": model.name,
        "status": "inactive"
    }


@router.delete("/{model_id}")
async def delete_model(
    model_id: int,
    db: Session = Depends(get_db)
):
    """删除模型"""
    model = db.query(ModelModel).filter(ModelModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    # 如果模型正在运行，先停用
    if model.status == "active":
        raise HTTPException(status_code=400, detail="请先停用模型后再删除")
    
    # 删除模型文件（如果存在）
    if model.model_path:
        from pathlib import Path
        model_path = Path(model.model_path)
        if model_path.exists():
            import shutil
            try:
                shutil.rmtree(model_path)
            except Exception as e:
                logger.warning(f"删除模型文件失败: {e}")
    
    # 删除数据库记录
    db.delete(model)
    db.commit()
    
    return {"message": "模型删除成功"}

