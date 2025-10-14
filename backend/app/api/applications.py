"""
应用实例管理API
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
from app.core.multi_model_engine import multi_model_engine
from app.core.strategy_presets import get_all_presets, get_preset_config, apply_preset_to_config

router = APIRouter()


# Pydantic模型
class KnowledgeBaseAssociation(BaseModel):
    knowledge_base_id: int
    priority: int = 1
    weight: float = 1.0
    boost_factor: float = 1.0


class ApplicationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    
    # LLM配置
    ai_provider: str
    llm_model: str
    
    # 知识源启用
    enable_fixed_qa: bool = False
    enable_vector_kb: bool = False
    enable_web_search: bool = False
    
    # 对话配置
    enable_context: bool = False  # 是否启用上下文对话
    
    # 检索策略（保留兼容性）
    similarity_threshold_high: float = 0.90
    similarity_threshold_low: float = 0.75
    retrieval_strategy: str = "priority"
    top_k: int = 5
    
    # 融合策略预设（新增）
    fusion_strategy_preset: Optional[str] = "smart"  # accurate/comprehensive/fast/smart/custom
    
    # 固定Q&A阈值配置（新增）
    qa_direct_threshold: Optional[float] = 0.90  # 直接返回Q&A答案的阈值
    qa_suggest_threshold: Optional[float] = 0.55  # 显示问题让用户确认的阈值（更宽松，更好匹配）
    qa_min_threshold: Optional[float] = 0.50  # 最低匹配阈值，低于此值忽略固定Q&A
    
    # 知识库阈值配置（新增）
    kb_high_confidence_threshold: Optional[float] = 0.85  # 高置信度，直接基于检索回答
    kb_context_threshold: Optional[float] = 0.60  # 提供给LLM作为上下文的阈值
    kb_min_threshold: Optional[float] = 0.40  # 最低相关性，低于此值忽略知识库结果
    
    # 联网搜索策略配置（新增）
    web_search_trigger_threshold: Optional[float] = 0.70  # 其他源低于此值时触发联网
    web_search_weight: Optional[float] = 0.30  # 联网结果的融合权重
    web_search_mode: Optional[str] = "supplement"  # supplement/primary/disabled
    
    # 知识库优先策略参数（新增）
    kb_absolute_priority_threshold: Optional[float] = 0.85  # 知识库绝对优先阈值
    kb_priority_threshold: Optional[float] = 0.70  # 知识库优先阈值
    kb_priority_bonus: Optional[float] = 0.15  # 知识库优先加成
    
    # 向量检索高级配置（当enable_vector_kb=True时使用）
    min_similarity_score: Optional[float] = 0.70  # 最小相似度分数（精度控制）
    max_results: Optional[int] = 5  # 最大返回结果数（召回控制）
    rerank_enabled: Optional[bool] = False  # 是否启用重排序
    hybrid_search_enabled: Optional[bool] = False  # 是否启用混合搜索（向量+关键词）
    
    # 固定Q&A智能匹配配置（当enable_fixed_qa=True时使用）
    fixed_qa_mode: Optional[str] = "smart"  # 匹配模式: smart/suggest/strict
    direct_match_threshold: Optional[float] = 0.90  # 直接回答阈值
    suggest_threshold: Optional[float] = 0.70  # 建议阈值
    max_suggestions: Optional[int] = 3  # 最多返回几个建议问题
    
    # 知识源权重
    fixed_qa_weight: float = 1.0
    vector_kb_weight: float = 1.0
    web_search_weight: float = 1.0
    
    # 融合策略
    fusion_strategy: str = "weighted_avg"
    fusion_config: Optional[Dict[str, Any]] = None
    
    # 搜索配置
    web_search_domains: Optional[List[str]] = None
    search_channels: Optional[List[str]] = None
    
    # 预处理配置
    enable_preprocessing: bool = True
    enable_intent_recognition: bool = True
    enable_language_detection: bool = True
    enable_sensitive_filter: bool = False
    sensitive_words: Optional[List[str]] = None
    
    # 其他配置
    enable_source_tracking: bool = True
    enable_citation: bool = True
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    
    # 🆕 策略模式配置（v2.0）
    strategy_mode: str = "safe_priority"  # safe_priority(安全优先) | realtime_knowledge(实时知识)
    web_search_auto_threshold: float = 0.50  # 自动联网阈值（低于此值自动联网）
    
    # 自定义未达阈值回复
    enable_custom_no_result_response: bool = False
    custom_no_result_response: Optional[str] = None
    
    # LLM润色
    enable_llm_polish: bool = True
    
    # 关联知识库
    knowledge_bases: Optional[List[KnowledgeBaseAssociation]] = None


class ApplicationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    ai_provider: Optional[str] = None
    llm_model: Optional[str] = None
    enable_fixed_qa: Optional[bool] = None
    enable_vector_kb: Optional[bool] = None
    enable_web_search: Optional[bool] = None
    enable_context: Optional[bool] = None  # 是否启用上下文对话
    similarity_threshold_high: Optional[float] = None
    similarity_threshold_low: Optional[float] = None
    retrieval_strategy: Optional[str] = None
    top_k: Optional[int] = None
    fixed_qa_weight: Optional[float] = None
    vector_kb_weight: Optional[float] = None
    web_search_weight: Optional[float] = None
    web_search_trigger_threshold: Optional[float] = None  # 新增：联网搜索触发阈值
    web_search_mode: Optional[str] = None  # 联网搜索模式
    kb_absolute_priority_threshold: Optional[float] = None  # 知识库绝对优先阈值
    kb_priority_threshold: Optional[float] = None  # 知识库优先阈值
    kb_priority_bonus: Optional[float] = None  # 知识库优先加成
    fusion_strategy: Optional[str] = None
    fusion_strategy_preset: Optional[str] = None  # 🔑 融合策略预设类型
    fusion_config: Optional[Dict[str, Any]] = None
    # 融合策略阈值配置
    qa_direct_threshold: Optional[float] = None  # Q&A直接回答阈值
    qa_suggest_threshold: Optional[float] = None  # Q&A建议确认阈值
    qa_min_threshold: Optional[float] = None  # Q&A最低匹配阈值
    kb_high_confidence_threshold: Optional[float] = None  # 知识库高置信度阈值
    kb_context_threshold: Optional[float] = None  # 知识库上下文阈值
    kb_min_threshold: Optional[float] = None  # 知识库最低相关性阈值
    
    # 🆕 策略模式配置（v2.0）
    strategy_mode: Optional[str] = None  # safe_priority | realtime_knowledge
    web_search_auto_threshold: Optional[float] = None  # 自动联网阈值
    
    web_search_domains: Optional[List[str]] = None
    search_channels: Optional[List[str]] = None
    enable_preprocessing: Optional[bool] = None
    enable_intent_recognition: Optional[bool] = None
    enable_language_detection: Optional[bool] = None
    enable_sensitive_filter: Optional[bool] = None
    sensitive_words: Optional[List[str]] = None
    enable_source_tracking: Optional[bool] = None
    enable_citation: Optional[bool] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    is_active: Optional[bool] = None
    enable_custom_no_result_response: Optional[bool] = None
    custom_no_result_response: Optional[str] = None
    enable_llm_polish: Optional[bool] = None


def generate_api_key() -> str:
    """生成应用API密钥"""
    alphabet = string.ascii_letters + string.digits
    key = "app_" + ''.join(secrets.choice(alphabet) for _ in range(32))
    return key


def generate_endpoint_path(name: str) -> str:
    """生成应用endpoint路径"""
    # 将名称转换为URL安全的格式
    path = name.lower().replace(" ", "-").replace("_", "-")
    # 移除特殊字符
    path = ''.join(c for c in path if c.isalnum() or c == '-')
    return path


# API端点

# 策略预设相关路由（必须在 /{app_id} 之前）
@router.get("/strategy-presets")
@router.get("/strategy-presets/")
async def get_strategy_presets():
    """
    获取所有策略预设方案
    
    返回所有可用的策略预设，包括：
    - 🛡️ 安全优先模式
    - 🌐 实时知识模式
    """
    presets = get_all_presets()
    logger.info(f"📋 返回 {len(presets)} 个策略预设")
    return {
        "presets": presets
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
        "applications": [
            {
                "id": app.id,
                "name": app.name,
                "description": app.description,
                "ai_provider": app.ai_provider,
                "llm_model": app.llm_model,
                "enable_fixed_qa": app.enable_fixed_qa,
                "enable_vector_kb": app.enable_vector_kb,
                "enable_web_search": app.enable_web_search,
                "enable_context": app.enable_context,
                "similarity_threshold_high": app.similarity_threshold_high,
                "similarity_threshold_low": app.similarity_threshold_low,
                "retrieval_strategy": app.retrieval_strategy,
                "top_k": app.top_k,
                "fixed_qa_weight": app.fixed_qa_weight,
                "vector_kb_weight": app.vector_kb_weight,
                "web_search_weight": app.web_search_weight,
                "fusion_strategy": app.fusion_strategy,
                "fusion_config": app.fusion_config,
                "search_channels": app.search_channels,  # 🔧 添加这个字段
                "api_key": app.api_key,
                "endpoint_path": app.endpoint_path,
                "is_active": app.is_active,
                "total_requests": app.total_requests,
                "total_tokens": app.total_tokens or 0,
                "temperature": app.temperature,
                "max_tokens": app.max_tokens,
                "system_prompt": app.system_prompt,
                "enable_custom_no_result_response": app.enable_custom_no_result_response or False,
                "custom_no_result_response": app.custom_no_result_response,
                "enable_llm_polish": app.enable_llm_polish if app.enable_llm_polish is not None else True,
                "strategy_mode": app.strategy_mode if hasattr(app, 'strategy_mode') else "safe_priority",
                "web_search_auto_threshold": app.web_search_auto_threshold if hasattr(app, 'web_search_auto_threshold') else 0.50,
                "created_at": app.created_at.isoformat()
            }
            for app in applications
        ]
    }


@router.post("/", status_code=201)
@router.post("", status_code=201)
async def create_application(
    app_data: ApplicationCreate,
    db: Session = Depends(get_db)
):
    """创建新应用"""
    
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
    
    # 准备融合配置，包含向量检索高级参数和固定Q&A配置
    fusion_config = app_data.fusion_config or {}
    
    # 添加融合策略预设配置（新增）
    fusion_config["strategy"] = {
        "preset": app_data.fusion_strategy_preset,
        "qa_direct_threshold": app_data.qa_direct_threshold,
        "qa_suggest_threshold": app_data.qa_suggest_threshold,
        "qa_min_threshold": app_data.qa_min_threshold,
        "kb_high_confidence_threshold": app_data.kb_high_confidence_threshold,
        "kb_context_threshold": app_data.kb_context_threshold,
        "kb_min_threshold": app_data.kb_min_threshold,
        "web_search_trigger_threshold": app_data.web_search_trigger_threshold,
        "web_search_weight": app_data.web_search_weight,
        "web_search_mode": app_data.web_search_mode,
        # 知识库优先策略参数（新增）
        "kb_absolute_priority_threshold": app_data.kb_absolute_priority_threshold,
        "kb_priority_threshold": app_data.kb_priority_threshold,
        "kb_priority_bonus": app_data.kb_priority_bonus
    }
    
    if app_data.enable_vector_kb:
        # 将向量检索高级配置存入fusion_config
        fusion_config["vector_retrieval"] = {
            "min_similarity_score": app_data.min_similarity_score,
            "max_results": app_data.max_results,
            "rerank_enabled": app_data.rerank_enabled,
            "hybrid_search_enabled": app_data.hybrid_search_enabled
        }
    
    if app_data.enable_fixed_qa:
        # 将固定Q&A智能匹配配置存入fusion_config（保留兼容性）
        fusion_config["fixed_qa"] = {
            "mode": app_data.fixed_qa_mode,
            "direct_match_threshold": app_data.direct_match_threshold,
            "suggest_threshold": app_data.suggest_threshold,
            "max_suggestions": app_data.max_suggestions
        }
    
    # 创建应用
    db_app = Application(
        name=app_data.name,
        description=app_data.description,
        ai_provider=app_data.ai_provider,
        llm_model=app_data.llm_model,
        enable_fixed_qa=app_data.enable_fixed_qa,
        enable_vector_kb=app_data.enable_vector_kb,
        enable_web_search=app_data.enable_web_search,
        enable_context=app_data.enable_context,
        similarity_threshold_high=app_data.similarity_threshold_high,
        similarity_threshold_low=app_data.similarity_threshold_low,
        retrieval_strategy=app_data.retrieval_strategy,
        top_k=app_data.top_k,
        fixed_qa_weight=app_data.fixed_qa_weight,
        vector_kb_weight=app_data.vector_kb_weight,
        web_search_weight=app_data.web_search_weight,
        fusion_strategy=app_data.fusion_strategy,
        fusion_config=fusion_config,
        web_search_domains=app_data.web_search_domains,
        search_channels=app_data.search_channels,
        enable_preprocessing=app_data.enable_preprocessing,
        enable_intent_recognition=app_data.enable_intent_recognition,
        enable_language_detection=app_data.enable_language_detection,
        enable_sensitive_filter=app_data.enable_sensitive_filter,
        sensitive_words=app_data.sensitive_words,
        enable_source_tracking=app_data.enable_source_tracking,
        enable_citation=app_data.enable_citation,
        system_prompt=app_data.system_prompt,
        temperature=app_data.temperature,
        max_tokens=app_data.max_tokens,
        # 🆕 策略模式配置
        strategy_mode=app_data.strategy_mode,
        web_search_auto_threshold=app_data.web_search_auto_threshold,
        enable_custom_no_result_response=app_data.enable_custom_no_result_response,
        custom_no_result_response=app_data.custom_no_result_response,
        enable_llm_polish=app_data.enable_llm_polish,
        api_key=api_key,
        endpoint_path=endpoint_path
    )
    
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    
    # 关联知识库
    if app_data.knowledge_bases:
        for kb_assoc in app_data.knowledge_bases:
            # 验证知识库是否存在
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
    
    logger.info(f"✅ 创建应用: {db_app.name}")
    
    return {
        "id": db_app.id,
        "name": db_app.name,
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
    
    # 获取关联的知识库
    kb_assocs = db.query(ApplicationKnowledgeBase).filter(
        ApplicationKnowledgeBase.application_id == app_id
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
    
    return {
        "id": app.id,
        "name": app.name,
        "description": app.description,
        "ai_provider": app.ai_provider,
        "llm_model": app.llm_model,
        "enable_fixed_qa": app.enable_fixed_qa,
        "enable_vector_kb": app.enable_vector_kb,
        "enable_web_search": app.enable_web_search,
        "enable_context": app.enable_context,
        "similarity_threshold_high": app.similarity_threshold_high,
        "similarity_threshold_low": app.similarity_threshold_low,
        "retrieval_strategy": app.retrieval_strategy,
        "top_k": app.top_k,
        "fixed_qa_weight": app.fixed_qa_weight,
        "vector_kb_weight": app.vector_kb_weight,
        "web_search_weight": app.web_search_weight,
        "fusion_strategy": app.fusion_strategy,
        "fusion_config": app.fusion_config,
        "web_search_domains": app.web_search_domains,
        "search_channels": app.search_channels,
        "enable_preprocessing": app.enable_preprocessing,
        "enable_intent_recognition": app.enable_intent_recognition,
        "enable_language_detection": app.enable_language_detection,
        "enable_sensitive_filter": app.enable_sensitive_filter,
        "sensitive_words": app.sensitive_words,
        "enable_source_tracking": app.enable_source_tracking,
        "enable_citation": app.enable_citation,
        "system_prompt": app.system_prompt,
        "temperature": app.temperature,
        "max_tokens": app.max_tokens,
        "api_key": app.api_key,
        "endpoint_path": app.endpoint_path,
        "endpoint_url": f"/api/apps/{app.endpoint_path}/chat/completions",
        "is_active": app.is_active,
        "total_requests": app.total_requests,
        "total_tokens": app.total_tokens,
        "enable_custom_no_result_response": app.enable_custom_no_result_response,
        "custom_no_result_response": app.custom_no_result_response,
        "enable_llm_polish": app.enable_llm_polish,
        "strategy_mode": app.strategy_mode if hasattr(app, 'strategy_mode') else "safe_priority",
        "web_search_auto_threshold": app.web_search_auto_threshold if hasattr(app, 'web_search_auto_threshold') else 0.50,
        "knowledge_bases": knowledge_bases,
        "created_at": app.created_at.isoformat(),
        "updated_at": app.updated_at.isoformat()
    }


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
    
    # 记录更新的字段（用于调试）
    if update_data:
        logger.info(f"📝 更新应用 [{db_app.name}] 的字段: {list(update_data.keys())}")
        
        # 特别记录search_channels的更新
        if 'search_channels' in update_data:
            logger.info(f"🔍 更新search_channels: {update_data['search_channels']} (类型: {type(update_data['search_channels'])})")
    
    # 🔑 特殊处理：更新融合策略相关参数到 fusion_config 中
    # 包含所有需要存入fusion_config['strategy']的参数
    strategy_params = [
        'fusion_strategy_preset',  # 🔑 关键：添加预设类型
        'web_search_trigger_threshold',
        'web_search_weight',
        'web_search_mode',
        'kb_absolute_priority_threshold',
        'kb_priority_threshold',
        'kb_priority_bonus',
        # 阈值配置
        'qa_direct_threshold',
        'qa_suggest_threshold',
        'qa_min_threshold',
        'kb_high_confidence_threshold',
        'kb_context_threshold',
        'kb_min_threshold'
    ]
    
    # 标记是否修改了 fusion_config
    fusion_config_modified = False
    
    for param in strategy_params:
        if param in update_data:
            value = update_data.pop(param)
            
            # 获取或初始化 fusion_config
            if db_app.fusion_config is None:
                db_app.fusion_config = {}
            if 'strategy' not in db_app.fusion_config:
                db_app.fusion_config['strategy'] = {}
            
            # 🔑 关键：对于preset参数，使用不同的key
            if param == 'fusion_strategy_preset':
                db_app.fusion_config['strategy']['preset'] = value
                logger.info(f"🎯 更新融合策略预设: {value}")
            else:
                # 更新参数
                db_app.fusion_config['strategy'][param] = value
                logger.info(f"🎯 更新融合策略参数 {param}: {value}")
            
            fusion_config_modified = True
    
    # 🔑 关键：标记 fusion_config 为已修改，否则 SQLAlchemy 不会保存 JSON 字段的变化
    if fusion_config_modified:
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(db_app, 'fusion_config')
        logger.info(f"✅ 已标记 fusion_config 为已修改，确保保存到数据库")
    
    for key, value in update_data.items():
        setattr(db_app, key, value)
    
    db.commit()
    db.refresh(db_app)
    
    logger.info(f"✅ 更新应用成功: {db_app.name}")
    
    # 验证保存结果
    if 'search_channels' in update_data:
        logger.info(f"✅ search_channels已保存: {db_app.search_channels}")
    
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
@router.post("/{app_id}/knowledge-bases/{kb_id}/")
async def add_knowledge_base(
    app_id: int,
    kb_id: int,
    priority: int = 1,
    weight: float = 1.0,
    boost_factor: float = 1.0,
    db: Session = Depends(get_db)
):
    """为应用添加知识库"""
    # 验证应用和知识库是否存在
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
@router.post("/{app_id}/regenerate-api-key/")
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


class ApplyPresetRequest(BaseModel):
    preset_name: str  # "safe_priority" 或 "realtime_knowledge"


@router.post("/{app_id}/apply-preset")
@router.post("/{app_id}/apply-preset/")
async def apply_strategy_preset(
    app_id: int, 
    request: ApplyPresetRequest,
    db: Session = Depends(get_db)
):
    """
    应用策略预设到指定应用
    
    Args:
        app_id: 应用ID
        request: 包含预设名称的请求体
    """
    app = db.query(Application).filter(Application.id == app_id).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 验证预设名称
    if request.preset_name not in ["safe_priority", "realtime_knowledge"]:
        raise HTTPException(
            status_code=400, 
            detail=f"无效的预设名称: {request.preset_name}。仅支持 'safe_priority' 或 'realtime_knowledge'"
        )
    
    # 获取预设配置
    preset = get_preset_config(request.preset_name)
    
    # 应用预设到融合配置
    fusion_config = app.fusion_config or {}
    fusion_config = apply_preset_to_config(fusion_config, request.preset_name)
    
    # 更新应用配置（需要标记JSON字段已修改）
    app.fusion_config = fusion_config
    flag_modified(app, "fusion_config")  # 标记JSON字段已修改
    
    # 同时更新strategy_mode字段
    app.strategy_mode = request.preset_name
    
    db.commit()
    db.refresh(app)
    
    logger.info(f"✅ 应用 {app.name} 已应用预设: {preset['name']} (preset={request.preset_name})")
    logger.info(f"📋 更新后的fusion_config: {fusion_config}")
    
    return {
        "message": f"成功应用预设: {preset['name']}",
        "preset": preset,
        "fusion_config": app.fusion_config  # 返回数据库中的最新配置
    }
