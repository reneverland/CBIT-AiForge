"""
应用实例管理API v3.0
简化版 - 基于mode + mode_config架构
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger
import secrets
import string

from app.models.database import get_db, Application, ApplicationKnowledgeBase, KnowledgeBase
from app.core.mode_presets import (
    get_mode_config, 
    validate_mode, 
    get_mode_description,
    MODE_DESCRIPTIONS
)

router = APIRouter()


# ==================== Pydantic 模型 ====================

class KnowledgeBaseAssociation(BaseModel):
    knowledge_base_id: int
    priority: int = 1
    weight: float = 1.0
    boost_factor: float = 1.0


class ApplicationCreate(BaseModel):
    """创建应用 - v3.0 简化版"""
    # 基础信息
    name: str
    description: Optional[str] = None
    
    # 核心模式（三选一）
    mode: str = "standard"  # safe | standard | enhanced
    
    # 模式自定义配置（可选，会覆盖预设）
    mode_config: Optional[Dict[str, Any]] = None
    
    # AI配置
    ai_provider: str
    llm_model: str
    temperature: float = 0.7
    
    # 关联知识库
    knowledge_bases: Optional[List[KnowledgeBaseAssociation]] = None


class ApplicationUpdate(BaseModel):
    """更新应用 - v3.0 简化版"""
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    mode_config: Optional[Dict[str, Any]] = None
    ai_provider: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    is_active: Optional[bool] = None


# ==================== 工具函数 ====================

def generate_api_key() -> str:
    """生成应用API密钥"""
    alphabet = string.ascii_letters + string.digits
    key = "app_" + ''.join(secrets.choice(alphabet) for _ in range(32))
    return key


def generate_endpoint_path(name: str) -> str:
    """生成应用endpoint路径"""
    path = name.lower().replace(" ", "-").replace("_", "-")
    path = ''.join(c for c in path if c.isalnum() or c == '-')
    return path


def serialize_application(app: Application, include_kb: bool = False, db: Session = None) -> dict:
    """序列化应用实例为API响应格式"""
    result = {
        "id": app.id,
        "name": app.name,
        "description": app.description,
        "mode": app.mode,
        "mode_config": app.mode_config,
        "ai_provider": app.ai_provider,
        "llm_model": app.llm_model,
        "temperature": app.temperature,
        "api_key": app.api_key,
        "endpoint_path": app.endpoint_path,
        "endpoint_url": f"/api/apps/{app.endpoint_path}/chat/completions",
        "is_active": app.is_active,
        "total_requests": app.total_requests,
        "total_tokens": app.total_tokens,
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None
    }
    
    # 获取完整配置（含默认值）
    result["full_config"] = app.get_mode_config_with_defaults()
    
    # 获取模式描述
    result["mode_description"] = get_mode_description(app.mode)
    
    # 如果需要包含关联的知识库
    if include_kb and db:
        kb_assocs = db.query(ApplicationKnowledgeBase).filter(
            ApplicationKnowledgeBase.application_id == app.id
        ).all()
        
        knowledge_bases = []
        for assoc in kb_assocs:
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == assoc.knowledge_base_id).first()
            if kb:
                knowledge_bases.append({
                    "id": kb.id,
                    "name": kb.name,
                    "priority": assoc.priority,
                    "weight": assoc.weight,
                    "boost_factor": assoc.boost_factor
                })
        
        result["knowledge_bases"] = knowledge_bases
    
    return result


# ==================== API端点 ====================

@router.get("/modes")
async def get_available_modes():
    """获取所有可用的工作模式"""
    return {
        "modes": MODE_DESCRIPTIONS
    }


@router.get("/")
@router.get("")
async def list_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """列出所有应用"""
    applications = db.query(Application).offset(skip).limit(limit).all()
    total = db.query(Application).count()
    
    return {
        "total": total,
        "applications": [serialize_application(app) for app in applications]
    }


@router.post("/", status_code=201)
@router.post("", status_code=201)
async def create_application(
    app_data: ApplicationCreate,
    db: Session = Depends(get_db)
):
    """创建新应用"""
    
    # 验证模式
    if not validate_mode(app_data.mode):
        raise HTTPException(
            status_code=400, 
            detail=f"无效的模式: {app_data.mode}。支持的模式: safe, standard, enhanced"
        )
    
    # 检查名称是否已存在
    existing = db.query(Application).filter(Application.name == app_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="应用名称已存在")
    
    # 生成API密钥和endpoint路径
    api_key = generate_api_key()
    endpoint_path = generate_endpoint_path(app_data.name)
    
    # 确保endpoint路径唯一
    counter = 1
    original_path = endpoint_path
    while db.query(Application).filter(Application.endpoint_path == endpoint_path).first():
        endpoint_path = f"{original_path}-{counter}"
        counter += 1
    
    # 创建应用
    db_app = Application(
        name=app_data.name,
        description=app_data.description,
        mode=app_data.mode,
        mode_config=app_data.mode_config,
        ai_provider=app_data.ai_provider,
        llm_model=app_data.llm_model,
        temperature=app_data.temperature,
        api_key=api_key,
        endpoint_path=endpoint_path
    )
    
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    
    # 关联知识库
    if app_data.knowledge_bases:
        for kb_assoc in app_data.knowledge_bases:
            kb = db.query(KnowledgeBase).filter(
                KnowledgeBase.id == kb_assoc.knowledge_base_id
            ).first()
            if not kb:
                logger.warning(f"知识库 {kb_assoc.knowledge_base_id} 不存在，跳过")
                continue
            
            db_assoc = ApplicationKnowledgeBase(
                application_id=db_app.id,
                knowledge_base_id=kb_assoc.knowledge_base_id,
                priority=kb_assoc.priority,
                weight=kb_assoc.weight,
                boost_factor=kb_assoc.boost_factor
            )
            db.add(db_assoc)
        
        db.commit()
    
    logger.info(f"✅ 创建应用: {db_app.name} (模式: {db_app.mode})")
    
    return {
        "id": db_app.id,
        "name": db_app.name,
        "mode": db_app.mode,
        "api_key": db_app.api_key,
        "endpoint_path": db_app.endpoint_path,
        "endpoint_url": f"/api/apps/{db_app.endpoint_path}/chat/completions",
        "message": "创建成功"
    }


@router.get("/{app_id}")
async def get_application(app_id: int, db: Session = Depends(get_db)):
    """获取应用详情"""
    app = db.query(Application).filter(Application.id == app_id).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    return serialize_application(app, include_kb=True, db=db)


@router.put("/{app_id}")
async def update_application(
    app_id: int,
    app_update: ApplicationUpdate,
    db: Session = Depends(get_db)
):
    """更新应用"""
    db_app = db.query(Application).filter(Application.id == app_id).first()
    
    if not db_app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 更新字段
    update_data = app_update.dict(exclude_unset=True)
    
    # 验证模式
    if 'mode' in update_data:
        if not validate_mode(update_data['mode']):
            raise HTTPException(
                status_code=400,
                detail=f"无效的模式: {update_data['mode']}"
            )
    
    # 记录更新
    logger.info(f"📝 更新应用 [{db_app.name}] 的字段: {list(update_data.keys())}")
    
    # 特殊处理 mode_config（JSON字段需要标记修改）
    if 'mode_config' in update_data:
        db_app.mode_config = update_data.pop('mode_config')
        flag_modified(db_app, 'mode_config')
        logger.info(f"✅ 已更新并标记 mode_config")
    
    # 更新其他字段
    for key, value in update_data.items():
        setattr(db_app, key, value)
    
    db.commit()
    db.refresh(db_app)
    
    logger.info(f"✅ 更新应用成功: {db_app.name}")
    
    return {
        "id": db_app.id,
        "name": db_app.name,
        "message": "更新成功",
        "updated_fields": list(update_data.keys())
    }


@router.delete("/{app_id}")
async def delete_application(app_id: int, db: Session = Depends(get_db)):
    """删除应用"""
    db_app = db.query(Application).filter(Application.id == app_id).first()
    
    if not db_app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 删除关联的知识库
    db.query(ApplicationKnowledgeBase).filter(
        ApplicationKnowledgeBase.application_id == app_id
    ).delete()
    
    # 删除应用
    db.delete(db_app)
    db.commit()
    
    logger.info(f"✅ 删除应用: {db_app.name}")
    
    return {"message": "删除成功"}


@router.post("/{app_id}/knowledge-bases/{kb_id}")
async def add_knowledge_base(
    app_id: int,
    kb_id: int,
    priority: int = 1,
    weight: float = 1.0,
    boost_factor: float = 1.0,
    db: Session = Depends(get_db)
):
    """为应用添加知识库"""
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 检查是否已关联
    existing = db.query(ApplicationKnowledgeBase).filter(
        ApplicationKnowledgeBase.application_id == app_id,
        ApplicationKnowledgeBase.knowledge_base_id == kb_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="知识库已关联")
    
    # 创建关联
    assoc = ApplicationKnowledgeBase(
        application_id=app_id,
        knowledge_base_id=kb_id,
        priority=priority,
        weight=weight,
        boost_factor=boost_factor
    )
    
    db.add(assoc)
    db.commit()
    
    logger.info(f"✅ 为应用 {app.name} 添加知识库 {kb.name}")
    
    return {"message": "添加成功"}


@router.delete("/{app_id}/knowledge-bases/{kb_id}")
async def remove_knowledge_base(
    app_id: int,
    kb_id: int,
    db: Session = Depends(get_db)
):
    """从应用移除知识库"""
    assoc = db.query(ApplicationKnowledgeBase).filter(
        ApplicationKnowledgeBase.application_id == app_id,
        ApplicationKnowledgeBase.knowledge_base_id == kb_id
    ).first()
    
    if not assoc:
        raise HTTPException(status_code=404, detail="关联不存在")
    
    db.delete(assoc)
    db.commit()
    
    logger.info(f"✅ 从应用移除知识库")
    
    return {"message": "移除成功"}


@router.post("/{app_id}/regenerate-api-key")
async def regenerate_api_key(app_id: int, db: Session = Depends(get_db)):
    """重新生成应用API密钥"""
    app = db.query(Application).filter(Application.id == app_id).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 生成新密钥
    new_key = generate_api_key()
    app.api_key = new_key
    
    db.commit()
    
    logger.info(f"✅ 重新生成应用 {app.name} 的API密钥")
    
    return {
        "message": "API密钥已重新生成",
        "api_key": new_key
    }
