"""
Embedding提供商配置API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger

from app.models.database import get_db, EmbeddingProvider
from app.core.embedding_engine import embedding_engine

router = APIRouter()


# Pydantic模型
class EmbeddingProviderCreate(BaseModel):
    name: str
    provider_type: str  # openai, local, custom
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    dimension: Optional[int] = None
    is_default: bool = False
    config: Optional[Dict[str, Any]] = None


class EmbeddingProviderUpdate(BaseModel):
    name: Optional[str] = None
    model_name: Optional[str] = None  # 允许更新模型名称
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    dimension: Optional[int] = None
    is_default: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class EmbeddingProviderResponse(BaseModel):
    id: int
    name: str
    provider_type: str
    model_name: str
    base_url: Optional[str]
    dimension: Optional[int]
    is_default: bool
    created_at: str
    
    class Config:
        from_attributes = True


class EmbeddingTestRequest(BaseModel):
    provider_id: int
    text: str = "测试文本"


# API端点
@router.get("/")
@router.get("")
async def list_providers(db: Session = Depends(get_db)):
    """列出所有Embedding提供商"""
    providers = db.query(EmbeddingProvider).all()
    return {
        "total": len(providers),
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "provider_type": p.provider_type,
                "model_name": p.model_name,
                "base_url": p.base_url,
                "dimension": p.dimension,
                "is_default": p.is_default,
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in providers
        ]
    }


@router.post("/", status_code=201)
@router.post("", status_code=201)
async def create_provider(
    provider: EmbeddingProviderCreate,
    db: Session = Depends(get_db)
):
    """创建新的Embedding提供商"""
    
    # 如果设置为默认，取消其他提供商的默认状态
    if provider.is_default:
        db.query(EmbeddingProvider).update({"is_default": False})
    
    # 创建新提供商
    db_provider = EmbeddingProvider(
        name=provider.name,
        provider_type=provider.provider_type,
        model_name=provider.model_name,
        api_key=provider.api_key,
        base_url=provider.base_url,
        dimension=provider.dimension,
        is_default=provider.is_default,
        config=provider.config
    )
    
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    
    # 如果是默认提供商，设置到engine中
    if db_provider.is_default:
        embedding_engine.set_default_provider({
            "id": db_provider.id,
            "name": db_provider.name,
            "provider_type": db_provider.provider_type,
            "model_name": db_provider.model_name,
            "api_key": db_provider.api_key,
            "base_url": db_provider.base_url,
            "dimension": db_provider.dimension,
            "config": db_provider.config
        })
    
    logger.info(f"✅ 创建Embedding提供商: {db_provider.name}")
    
    return {
        "id": db_provider.id,
        "name": db_provider.name,
        "provider_type": db_provider.provider_type,
        "model_name": db_provider.model_name,
        "is_default": db_provider.is_default,
        "message": "创建成功"
    }


@router.get("/{provider_id}")
async def get_provider(provider_id: int, db: Session = Depends(get_db)):
    """获取Embedding提供商详情"""
    provider = db.query(EmbeddingProvider).filter(EmbeddingProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    return {
        "id": provider.id,
        "name": provider.name,
        "provider_type": provider.provider_type,
        "model_name": provider.model_name,
        "base_url": provider.base_url,
        "dimension": provider.dimension,
        "is_default": provider.is_default,
        "config": provider.config,
        "created_at": provider.created_at.isoformat()
    }


@router.put("/{provider_id}")
async def update_provider(
    provider_id: int,
    provider_update: EmbeddingProviderUpdate,
    db: Session = Depends(get_db)
):
    """更新Embedding提供商"""
    db_provider = db.query(EmbeddingProvider).filter(EmbeddingProvider.id == provider_id).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 如果设置为默认，取消其他提供商的默认状态
    if provider_update.is_default:
        db.query(EmbeddingProvider).filter(EmbeddingProvider.id != provider_id).update({"is_default": False})
    
    # 更新字段
    update_data = provider_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_provider, key, value)
    
    db.commit()
    db.refresh(db_provider)
    
    # 如果是默认提供商，更新engine
    if db_provider.is_default:
        embedding_engine.set_default_provider({
            "id": db_provider.id,
            "name": db_provider.name,
            "provider_type": db_provider.provider_type,
            "model_name": db_provider.model_name,
            "api_key": db_provider.api_key,
            "base_url": db_provider.base_url,
            "dimension": db_provider.dimension,
            "config": db_provider.config
        })
    
    logger.info(f"✅ 更新Embedding提供商: {db_provider.name}")
    
    return {
        "id": db_provider.id,
        "name": db_provider.name,
        "message": "更新成功"
    }


@router.delete("/{provider_id}")
async def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    """删除Embedding提供商"""
    db_provider = db.query(EmbeddingProvider).filter(EmbeddingProvider.id == provider_id).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    if db_provider.is_default:
        raise HTTPException(status_code=400, detail="无法删除默认提供商，请先设置其他提供商为默认")
    
    db.delete(db_provider)
    db.commit()
    
    logger.info(f"✅ 删除Embedding提供商: {db_provider.name}")
    
    return {"message": "删除成功"}


@router.post("/test")
@router.post("/test/")
async def test_embedding(
    test_request: EmbeddingTestRequest,
    db: Session = Depends(get_db)
):
    """测试Embedding提供商"""
    provider = db.query(EmbeddingProvider).filter(
        EmbeddingProvider.id == test_request.provider_id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 构建配置
    provider_config = {
        "provider_type": provider.provider_type,
        "model_name": provider.model_name,
        "api_key": provider.api_key,
        "base_url": provider.base_url,
        "dimension": provider.dimension
    }
    
    try:
        # 测试embedding
        vector = await embedding_engine.embed_text(test_request.text, provider_config)
        dimension = len(vector)
        
        # 更新维度信息（如果之前没有）
        if not provider.dimension:
            provider.dimension = dimension
            db.commit()
        
        return {
            "success": True,
            "message": "测试成功",
            "dimension": dimension,
            "vector_sample": vector[:5],  # 只返回前5个值作为示例
            "provider": {
                "id": provider.id,
                "name": provider.name,
                "model_name": provider.model_name
            }
        }
        
    except Exception as e:
        logger.error(f"Embedding测试失败: {e}")
        return {
            "success": False,
            "message": f"测试失败: {str(e)}",
            "error": str(e)
        }


@router.post("/{provider_id}/set-default")
@router.post("/{provider_id}/set-default/")
async def set_default_provider(provider_id: int, db: Session = Depends(get_db)):
    """设置默认Embedding提供商"""
    provider = db.query(EmbeddingProvider).filter(EmbeddingProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 取消其他提供商的默认状态
    db.query(EmbeddingProvider).update({"is_default": False})
    
    # 设置当前提供商为默认
    provider.is_default = True
    db.commit()
    
    # 更新engine
    embedding_engine.set_default_provider({
        "id": provider.id,
        "name": provider.name,
        "provider_type": provider.provider_type,
        "model_name": provider.model_name,
        "api_key": provider.api_key,
        "base_url": provider.base_url,
        "dimension": provider.dimension,
        "config": provider.config
    })
    
    logger.info(f"✅ 设置默认Embedding提供商: {provider.name}")
    
    return {
        "message": "设置成功",
        "provider": {
            "id": provider.id,
            "name": provider.name
        }
    }
