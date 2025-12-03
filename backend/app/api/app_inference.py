"""
应用推理API - OpenAI兼容接口
使用混合检索引擎提供智能问答服务
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger
from datetime import datetime
import time
import uuid
import json
import asyncio
from functools import lru_cache
from cachetools import TTLCache

from app.models.database import get_db, Application, ApplicationKnowledgeBase, KnowledgeBase, FixedQAPair, EmbeddingProvider, RetrievalLog, Conversation
from app.core.hybrid_retrieval_engine import hybrid_retrieval_engine
from app.core.multi_model_engine import multi_model_engine

router = APIRouter()

# 🚀 应用配置内存缓存 (30分钟过期，优化性能)
_app_context_cache = TTLCache(maxsize=500, ttl=1800)


def is_casual_conversation(query: str) -> bool:
    """检测是否为日常对话/闲聊/常规问候"""
    query_lower = query.strip().lower()
    query_len = len(query_lower)
    
    # 日常对话关键词（扩展版）
    casual_patterns = {
        # 中文打招呼
        "greetings": ["你好", "您好", "嗨", "嘿", "哈喽", "hi", "hello", "hey"],
        # 问候语
        "time_greetings": ["早上好", "晚上好", "下午好", "晚安", "早安", "中午好"],
        # 礼貌用语
        "thanks": ["谢谢", "感谢", "多谢", "thank", "thanks", "thx"],
        # 简单闲聊
        "small_talk": ["怎么样", "在吗", "在不在", "how are you", "what's up", "wassup"],
        # 状态询问
        "status": ["忙吗", "忙不忙", "有空吗", "干嘛呢", "在干嘛"],
        # 再见
        "goodbye": ["再见", "拜拜", "bye", "goodbye", "see you"],
    }
    
    # 1. 极短查询（≤15字符）+ 包含任何日常关键词
    if query_len <= 15:
        for category, patterns in casual_patterns.items():
            for pattern in patterns:
                if pattern in query_lower:
                    logger.info(f"💬 检测到日常对话（{category}）: {query}")
                    return True
    
    # 2. 单字或两字查询（可能是"嗨"、"你好"等）
    if query_len <= 2:
        logger.info(f"💬 检测到极短查询（可能是日常对话）: {query}")
        return True
    
    # 3. 常见的完整问候句式
    greeting_sentences = [
        "你好啊", "你好呀", "您好啊", "在吗", "在不在",
        "hello there", "hi there", "hey there",
        "how are you", "how r u", "how do you do",
        "what's up", "whats up", "sup",
    ]
    if query_lower in greeting_sentences:
        logger.info(f"💬 检测到完整问候句式: {query}")
        return True
    
    return False


# Pydantic模型
class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str


class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: bool = False
    skip_fixed_qa: bool = False  # 是否跳过固定Q&A匹配（用户选择"继续思考"时）
    selected_qa_id: Optional[int] = None  # 用户选中的Q&A ID（直接返回答案）
    force_web_search: bool = False  # 是否强制启用联网搜索（用户授权后）


class TestRetrievalRequest(BaseModel):
    query: str
    application_id: int


# 辅助函数
def get_app_by_api_key(api_key: str, db: Session) -> Optional[Application]:
    """通过API密钥获取应用"""
    return db.query(Application).filter(Application.api_key == api_key).first()


def get_app_by_id(app_id: int, db: Session) -> Optional[Application]:
    """通过ID获取应用"""
    return db.query(Application).filter(Application.id == app_id).first()


async def prepare_app_context(app: Application, db: Session, use_cache: bool = True) -> Dict[str, Any]:
    """准备应用上下文（知识库、Q&A等） - v3.0适配版 + 🚀缓存优化"""
    
    # 🚀 检查缓存
    cache_key = f"app_context_{app.id}_{app.updated_at}"
    if use_cache and cache_key in _app_context_cache:
        logger.info(f"✅ 命中应用配置缓存: {app.name} (ID: {app.id})")
        return _app_context_cache[cache_key]
    
    logger.info(f"🔄 加载应用配置: {app.name} (ID: {app.id})")
    
    # 获取完整配置（含默认值）
    full_config = app.get_mode_config_with_defaults()
    
    # v3.0: 根据mode和priority_order判断启用的功能
    priority_order = full_config.get("priority_order", [])
    enable_fixed_qa = any("fixed_qa" in item for item in priority_order)
    enable_vector_kb = "vector_kb" in priority_order
    enable_web_search = full_config.get("allow_web_search", False)
    
    # 获取应用配置（适配v3.0）
    # 🎯 知识库阈值优先级：mode_config.vector_kb_threshold > 模式默认值
    kb_threshold = full_config.get("vector_kb_threshold", full_config.get("recommend_threshold", 0.65))
    
    # 🎯 动态设置策略模式
    # 如果启用了联网搜索，使用 realtime_knowledge 模式自动触发
    # 否则使用 safe_priority 模式需要用户授权
    strategy_mode = "realtime_knowledge" if enable_web_search else "safe_priority"
    
    app_config = {
        "id": app.id,
        "name": app.name,
        "enable_fixed_qa": enable_fixed_qa,
        "enable_vector_kb": enable_vector_kb,
        "enable_web_search": enable_web_search,
        # 策略模式配置
        "strategy_mode": strategy_mode,
        "web_search_auto_threshold": full_config.get("web_search_auto_threshold", 0.50),
        "similarity_threshold_high": full_config.get("fixed_qa_threshold", 0.90),
        "similarity_threshold_low": kb_threshold,  # 使用知识库阈值
        "vector_kb_threshold": kb_threshold,  # 显式设置知识库阈值
        "retrieval_strategy": "priority",
        "top_k": full_config.get("top_k", 5),
        "fixed_qa_weight": 1.0,
        "vector_kb_weight": 1.0,
        "web_search_weight": 1.0,
        "fusion_strategy": "weighted_avg",
        "fusion_config": full_config,  # 使用完整配置
        "web_search_domains": full_config.get("web_search_domains", []),
        "search_channels": full_config.get("search_channels", []),
        "enable_preprocessing": True,
        "enable_intent_recognition": True,
        "enable_language_detection": True,
        "enable_sensitive_filter": False,
        "sensitive_words": [],
        "enable_source_tracking": full_config.get("enable_source_tracking", True),
        "enable_citation": full_config.get("enable_citation", True),
        "system_prompt": full_config.get("system_prompt"),  # 🔧 修复：从配置中读取系统提示词
        "temperature": app.temperature,
        "max_tokens": full_config.get("max_tokens", 2000)
    }
    
    logger.info(f"📊 应用 [{app.name}] 知识库检索阈值: {kb_threshold:.2%}")
    
    # 🔑 关键修复：确保融合策略配置中包含fixed_qa配置
    if "fusion_config" not in app_config or not app_config["fusion_config"]:
        app_config["fusion_config"] = {}
    
    if "fixed_qa" not in app_config["fusion_config"]:
        app_config["fusion_config"]["fixed_qa"] = {}
    
    # 从fusion_config.strategy中读取配置，如果没有则使用默认值
    strategy_config = app_config["fusion_config"].get("strategy", {})
    
    # 将qa阈值配置同步到fixed_qa配置中
    app_config["fusion_config"]["fixed_qa"]["mode"] = strategy_config.get("fixed_qa_mode", "smart")
    app_config["fusion_config"]["fixed_qa"]["direct_match_threshold"] = strategy_config.get("qa_direct_threshold", 0.90)
    app_config["fusion_config"]["fixed_qa"]["suggest_threshold"] = strategy_config.get("qa_suggest_threshold", 0.55)  # 使用策略配置的阈值
    app_config["fusion_config"]["fixed_qa"]["qa_min_threshold"] = strategy_config.get("qa_min_threshold", 0.50)  # 最低匹配阈值
    app_config["fusion_config"]["fixed_qa"]["max_suggestions"] = strategy_config.get("max_suggestions", 3)
    
    # 🔍 调试日志：显示实际使用的 QA 阈值配置
    logger.info(f"📊 应用 [{app.name}] QA阈值配置: 直接匹配={app_config['fusion_config']['fixed_qa']['direct_match_threshold']:.0%}, 建议={app_config['fusion_config']['fixed_qa']['suggest_threshold']:.0%}")
    
    # 获取固定Q&A对
    fixed_qa_pairs = []
    if enable_fixed_qa:  # 🔧 修复：使用局部变量而不是app.enable_fixed_qa
        qa_list = db.query(FixedQAPair).filter(
            FixedQAPair.application_id == app.id,
            FixedQAPair.is_active == True
        ).all()
        
        fixed_qa_pairs = [
            {
                "id": qa.id,
                "question": qa.question,
                "answer": qa.answer,
                "keywords": qa.keywords,
                "embedding_vector": qa.embedding_vector,
                "category": qa.category,
                "priority": qa.priority,
                "is_active": qa.is_active
            }
            for qa in qa_list
        ]
    
    # 获取关联的知识库
    knowledge_bases = []
    if enable_vector_kb:  # 🔧 修复：使用局部变量而不是app.enable_vector_kb
        kb_assocs = db.query(ApplicationKnowledgeBase).filter(
            ApplicationKnowledgeBase.application_id == app.id
        ).order_by(ApplicationKnowledgeBase.priority).all()
        
        logger.info(f"📖 应用 [{app.name}] 查询到 {len(kb_assocs)} 个知识库关联")
        
        for assoc in kb_assocs:
            kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == assoc.knowledge_base_id).first()
            if kb:
                knowledge_bases.append({
                    "id": kb.id,
                    "name": kb.name,
                    "collection_name": kb.collection_name,
                    "embedding_provider_id": kb.embedding_provider_id,  # 🔑 添加 embedding_provider_id
                    "priority": assoc.priority,
                    "weight": assoc.weight,
                    "boost_factor": assoc.boost_factor
                })
                logger.info(f"✅ 添加知识库: {kb.name} (collection: {kb.collection_name}, embedding_provider_id: {kb.embedding_provider_id})")
            else:
                logger.warning(f"⚠️ 知识库ID {assoc.knowledge_base_id} 不存在，跳过")
    
    # 获取Embedding提供商配置
    embedding_provider = db.query(EmbeddingProvider).filter(
        EmbeddingProvider.is_default == True
    ).first()
    
    embedding_provider_config = None
    if embedding_provider:
        embedding_provider_config = {
            "provider_type": embedding_provider.provider_type,
            "model_name": embedding_provider.model_name,
            "api_key": embedding_provider.api_key,
            "base_url": embedding_provider.base_url
        }
    
    context = {
        "app_config": app_config,
        "fixed_qa_pairs": fixed_qa_pairs,
        "knowledge_bases": knowledge_bases,
        "embedding_provider_config": embedding_provider_config
    }
    
    # 🚀 存入缓存
    if use_cache:
        _app_context_cache[cache_key] = context
        logger.info(f"💾 应用配置已缓存: {app.name} (缓存大小: {len(_app_context_cache)})")
    
    return context


# 流式响应生成器
async def stream_chat_completion(app: Application, request: ChatCompletionRequest, db: Session):
    """流式聊天完成生成器（SSE格式）"""
    try:
        # 🔧 修复：提取最后一条用户查询（支持对话上下文）
        user_messages = [msg for msg in request.messages if msg.role == "user"]
        if not user_messages:
            yield f"data: {json.dumps({'error': '请求中没有用户消息'})}\n\n"
            return
        
        query = user_messages[-1].content  # 获取最后一条用户消息
        logger.info(f"🔍 [流式] 提取查询 - 对话中共有 {len(user_messages)} 条用户消息，当前查询: {query}")
        start_time = time.time()
        
        # 🔧 特殊处理：用户直接选择了某个Q&A（与非流式版本一致）
        if request.selected_qa_id:
            qa = db.query(FixedQAPair).filter(
                FixedQAPair.id == request.selected_qa_id,
                FixedQAPair.application_id == app.id
            ).first()
            
            if qa:
                # 更新点击统计
                qa.hit_count += 1
                qa.last_hit_at = datetime.utcnow()
                db.commit()
                
                logger.info(f"✅ [流式] 用户直接选择固定Q&A: {qa.question}")
                
                # 以流式方式返回Q&A答案（模拟打字效果）
                answer_chars = qa.answer
                
                # 逐字符发送（可以调整chunk_size来控制速度）
                chunk_size = 5  # 每次发送5个字符
                for i in range(0, len(answer_chars), chunk_size):
                    chunk = answer_chars[i:i+chunk_size]
                    yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]})}\n\n"
                    await asyncio.sleep(0.01)  # 10ms延迟，模拟打字效果
                
                # 发送元数据
                metadata = {
                    "metadata": {
                        "source": "fixed_qa",
                        "qa_id": qa.id,
                        "question": qa.question,
                        "confidence": 1.0
                    },
                    "cbit_metadata": {
                        "source": "fixed_qa",
                        "matched_fixed_qa": True,
                        "retrieval_time_ms": 0,
                        "total_time_ms": (time.time() - start_time) * 1000
                    }
                }
                yield f"data: {json.dumps(metadata)}\n\n"
                yield "data: [DONE]\n\n"
                return
        
        # 准备上下文（与非流式版本相同的逻辑）
        context = await prepare_app_context(app, db)
        
        logger.info(f"🎯 [流式] 应用 [{app.name}] 收到查询: {query}")
        
        # 🔧 如果用户选择"继续思考"，临时禁用固定Q&A
        if request.skip_fixed_qa:
            original_enable_fixed_qa = context["app_config"].get("enable_fixed_qa", True)
            context["app_config"]["enable_fixed_qa"] = False
            context["fixed_qa_pairs"] = []
            logger.info("⏭️ [流式] 用户选择继续思考，跳过固定Q&A检索")
        
        # 执行检索
        retrieval_result = await hybrid_retrieval_engine.retrieve(
            query=query,
            app_config=context["app_config"],
            fixed_qa_pairs=context["fixed_qa_pairs"],
            knowledge_bases=context["knowledge_bases"],
            embedding_provider_config=context["embedding_provider_config"]
        )
        
        retrieval_time = retrieval_result["timing"]["total_ms"]
        
        # 🔧 关键修复：如果用户选择"继续思考"，过滤掉所有固定Q&A引用
        if request.skip_fixed_qa:
            original_ref_count = len(retrieval_result.get("references", []))
            retrieval_result["references"] = [
                ref for ref in retrieval_result.get("references", [])
                if ref.get("source_type") != "fixed_qa"
            ]
            filtered_count = original_ref_count - len(retrieval_result.get("references", []))
            if filtered_count > 0:
                logger.info(f"🗑️ [流式] 已过滤 {filtered_count} 个固定Q&A引用（继续思考模式）")
            # 恢复原始配置
            context["app_config"]["enable_fixed_qa"] = original_enable_fixed_qa
        
        # 🔧 检查Q&A匹配情况（区分直接返回和建议确认）
        original_enable_fixed_qa = context["app_config"].get("enable_fixed_qa", True)
        direct_qa_match = None  # 高相似度直接匹配
        suggested_questions_for_confirmation = []  # 中等相似度建议
        
        for ref in retrieval_result.get("references", []):
            if ref.get("source_type") == "fixed_qa":
                match_type = ref.get("match_type", "suggest")
                
                # 🎯 优先检查是否有直接匹配（相似度≥0.90）
                if match_type == "direct" and not direct_qa_match:
                    direct_qa_match = ref
                    logger.info(f"🎯 [流式] 检测到直接Q&A匹配: {ref.get('question', '')} (相似度: {ref.get('similarity', 0):.2%})")
                
                # 收集建议问题（相似度0.55-0.90）
                if match_type == "suggest":
                    suggested_questions_for_confirmation.append({
                        "question": ref.get("question", ""),
                        "similarity": round(ref.get("similarity", 0), 4),
                        "qa_id": ref.get("id")
                    })
        
        logger.info(f"🔍 [流式] Q&A检查: direct_match={direct_qa_match is not None}, suggested_questions={len(suggested_questions_for_confirmation)}, skip_fixed_qa={request.skip_fixed_qa}, original_enable_fixed_qa={original_enable_fixed_qa}")
        
        # 🎯 场景1: 有直接匹配的Q&A，直接返回（最高优先级）
        if direct_qa_match and not request.skip_fixed_qa and not request.selected_qa_id and not request.force_web_search and original_enable_fixed_qa:
            logger.info(f"✅ [流式] 直接返回Q&A答案: {direct_qa_match.get('question', '')}")
            
            # 以流式方式返回Q&A答案
            answer_text = direct_qa_match.get("answer", "")
            
            # 逐字符发送（模拟打字效果）
            chunk_size = 5
            for i in range(0, len(answer_text), chunk_size):
                chunk = answer_text[i:i+chunk_size]
                yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]})}\n\n"
                await asyncio.sleep(0.01)
            
            # 发送元数据
            metadata = {
                "metadata": {
                    "source": "fixed_qa",
                    "qa_id": direct_qa_match.get("id"),
                    "question": direct_qa_match.get("question"),
                    "similarity": direct_qa_match.get("similarity"),
                    "match_type": "direct"
                },
                "cbit_metadata": {
                    "source": "fixed_qa",
                    "matched_fixed_qa": True,
                    "match_type": "direct",
                    "references": [direct_qa_match],
                    "retrieval_time_ms": retrieval_time,
                    "total_time_ms": (time.time() - start_time) * 1000
                }
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        # 🔔 场景2: 没有直接匹配，但有建议问题，先发送建议卡片，然后继续生成AI回答
        has_suggested_questions = False
        if suggested_questions_for_confirmation and not request.skip_fixed_qa and not request.selected_qa_id and not request.force_web_search and original_enable_fixed_qa:
            # 检查最高相似度是否达到建议阈值
            max_similarity = max([q.get('similarity', 0) for q in suggested_questions_for_confirmation]) if suggested_questions_for_confirmation else 0
            
            # 从fusion_config获取固定Q&A配置
            fusion_config = context["app_config"].get("fusion_config", {})
            fixed_qa_config = fusion_config.get("fixed_qa", {})
            suggest_threshold = fixed_qa_config.get("suggest_threshold", 0.55)
            
            # 如果相似度达到建议阈值，先发送建议事件（但不结束流式输出，继续生成AI回答）
            if max_similarity >= suggest_threshold:
                logger.info(f"💡 [流式] 检测到 {len(suggested_questions_for_confirmation)} 个相关Q&A（最高相似度: {max_similarity:.2%}），发送建议卡片并继续生成AI回答")
                
                # 发送Q&A建议事件
                confirmation_data = {
                    "choices": [{
                        "delta": {
                            "content": ""
                        }
                    }],
                    "metadata": {
                        "needs_confirmation": True,
                        "source": "fixed_qa_suggestion"
                    },
                    "cbit_metadata": {
                        "needs_confirmation": True,
                        "suggested_questions": suggested_questions_for_confirmation[:3],
                        "retrieval_time_ms": retrieval_time,
                        "total_time_ms": (time.time() - start_time) * 1000
                    }
                }
                yield f"data: {json.dumps(confirmation_data)}\n\n"
                has_suggested_questions = True
                # 注意：这里不再 return，继续往下执行生成AI回答
        
        confidence = retrieval_result.get("confidence_score", 0)
        is_casual = is_casual_conversation(query)
        
        # 对于非LLM生成的情况（日常对话、低置信度等），直接返回完整答案
        min_threshold = context["app_config"].get("similarity_threshold_low", 0.3)
        
        # 构建LLM请求
        system_prompt = context["app_config"].get("system_prompt") or "你是一个有帮助的AI助手。"
        
        if not is_casual and retrieval_result.get("answer"):
            context_text = f"\n\n相关信息：\n{retrieval_result['answer']}"
            system_prompt += context_text
        
        enhanced_messages = [
            {"role": "system", "content": system_prompt}
        ] + [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # 从数据库加载AI提供商配置
        ai_provider_obj = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.provider_type == app.ai_provider
        ).first()
        
        if not ai_provider_obj or not ai_provider_obj.api_key:
            yield f"data: {json.dumps({'error': f'AI提供商 {app.ai_provider} 未配置'})}\n\n"
            return
        
        multi_model_engine.set_api_key(app.ai_provider, ai_provider_obj.api_key)
        if ai_provider_obj.base_url:
            multi_model_engine.set_custom_config(app.ai_provider, {
                "base_url": ai_provider_obj.base_url
            })
        
        # 🚀 调用LLM流式生成
        logger.info(f"🤖 [流式] 开始LLM生成")
        
        async for chunk in multi_model_engine.chat_completion_stream(
            provider=app.ai_provider,
            model=app.llm_model,
            messages=enhanced_messages,
            temperature=request.temperature or app.temperature,
            max_tokens=request.max_tokens or context["app_config"].get("max_tokens", 2000)
        ):
            content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
            if content:
                yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]})}\n\n"
                await asyncio.sleep(0)  # 让出控制权
        
        # 发送元数据
        metadata = {
            "metadata": retrieval_result.get("_strategy_info") or {},
            "cbit_metadata": {
                "retrieval_sources": {
                    "fixed_qa": context["app_config"]["enable_fixed_qa"],
                    "vector_kb": context["app_config"]["enable_vector_kb"],
                    "web_search": context["app_config"]["enable_web_search"]
                },
                "timing": {
                    "total_ms": (time.time() - start_time) * 1000
                }
            }
        }
        yield f"data: {json.dumps(metadata)}\n\n"
        yield "data: [DONE]\n\n"
        
        logger.info(f"✅ [流式] 响应完成")
        
    except Exception as e:
        logger.error(f"❌ [流式] 生成失败: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


# API端点
@router.post("/test-retrieval")
@router.post("/test-retrieval/")
async def test_retrieval(
    request: TestRetrievalRequest,
    db: Session = Depends(get_db)
):
    """
    测试检索功能（不调用LLM，仅返回检索结果）
    用于调试和验证检索效果
    """
    # 获取应用
    app = get_app_by_id(request.application_id, db)
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    if not app.is_active:
        raise HTTPException(status_code=403, detail="应用未激活")
    
    # 准备上下文
    context = await prepare_app_context(app, db)
    
    # 执行检索
    retrieval_result = await hybrid_retrieval_engine.retrieve(
        query=request.query,
        app_config=context["app_config"],
        fixed_qa_pairs=context["fixed_qa_pairs"],
        knowledge_bases=context["knowledge_bases"],
        embedding_provider_config=context["embedding_provider_config"]
    )
    
    # 记录检索日志
    if context["app_config"]["enable_source_tracking"]:
        log = RetrievalLog(
            application_id=app.id,
            query=request.query,
            matched_source=retrieval_result.get("matched_source"),
            confidence_score=retrieval_result.get("confidence_score"),
            references=retrieval_result.get("references"),
            final_answer=retrieval_result.get("answer"),
            retrieval_path=retrieval_result.get("retrieval_path"),
            preprocessing_info=retrieval_result.get("preprocessing_info"),
            fusion_details=retrieval_result.get("fusion_details"),
            preprocessing_time_ms=retrieval_result["timing"]["preprocessing_ms"],
            retrieval_time_ms=retrieval_result["timing"]["retrieval_ms"],
            generation_time_ms=0,
            total_time_ms=retrieval_result["timing"]["total_ms"],
            has_suggestions=retrieval_result.get("has_suggestions", False),
            suggestions=retrieval_result.get("suggestions")
        )
        db.add(log)
        db.commit()
    
    return {
        "application": {
            "id": app.id,
            "name": app.name
        },
        "retrieval_result": retrieval_result
    }


@router.post("/apps/{endpoint_path}/chat/completions")
async def app_chat_completion(
    endpoint_path: str,
    request: ChatCompletionRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    应用级聊天补全API（OpenAI兼容）
    使用混合检索+LLM生成答案
    支持流式输出（stream=true）
    """
    # 验证API密钥
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供有效的API密钥")
    
    api_key = authorization.replace("Bearer ", "")
    
    # 获取应用
    app = db.query(Application).filter(
        Application.endpoint_path == endpoint_path,
        Application.api_key == api_key
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在或API密钥无效")
    
    if not app.is_active:
        raise HTTPException(status_code=403, detail="应用未激活")
    
    # 🚀 流式输出支持
    if request.stream:
        return StreamingResponse(
            stream_chat_completion(app, request, db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # 禁用nginx缓冲
            }
        )
    
    # 🔧 修复：提取最后一条用户查询（支持对话上下文）
    user_messages = [msg for msg in request.messages if msg.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="请求中没有用户消息")
    
    query = user_messages[-1].content  # 获取最后一条用户消息
    logger.info(f"🔍 提取查询 - 对话中共有 {len(user_messages)} 条用户消息，当前查询: {query}")
    start_time = time.time()
    
    # 初始化响应变量
    answer = None
    source = None
    tokens_used = 0
    generation_time = 0
    
    # 特殊处理：用户直接选择了某个Q&A
    if request.selected_qa_id:
        qa = db.query(FixedQAPair).filter(
            FixedQAPair.id == request.selected_qa_id,
            FixedQAPair.application_id == app.id
        ).first()
        
        if qa:
            # 更新点击统计
            qa.hit_count += 1
            qa.last_hit_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"✅ 用户直接选择固定Q&A: {qa.question}")
            
            # 直接返回Q&A答案
            return {
                "id": f"app-{app.id}-qa-{qa.id}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": app.llm_model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": qa.answer,
                        "metadata": {
                            "source": "fixed_qa",
                            "qa_id": qa.id,
                            "question": qa.question,
                            "confidence": 1.0
                        }
                    },
                    "finish_reason": "stop"
                }],
                "usage": {"total_tokens": 0},
                "cbit_metadata": {
                    "source": "fixed_qa",
                    "retrieval_time_ms": 0,
                    "total_time_ms": (time.time() - start_time) * 1000
                }
            }
    
    # 准备上下文
    context = await prepare_app_context(app, db)
    
    logger.info(f"🎯 应用 [{app.name}] (模式: {app.mode}) 收到查询: {query}")
    logger.info(f"📊 应用配置 - 固定Q&A: {context['app_config']['enable_fixed_qa']}, 向量检索: {context['app_config']['enable_vector_kb']}, 联网搜索: {context['app_config']['enable_web_search']}")
    logger.info(f"📚 关联知识库数量: {len(context['knowledge_bases'])}")
    if context['knowledge_bases']:
        kb_names = [kb['name'] for kb in context['knowledge_bases']]
        logger.info(f"📚 知识库列表: {', '.join(kb_names)}")
    
    # 执行检索（如果用户选择跳过固定Q&A，则不检索固定Q&A）
    retrieval_start = time.time()
    
    # 如果用户选择"继续思考"，临时禁用固定Q&A
    original_enable_fixed_qa = context["app_config"]["enable_fixed_qa"]
    original_enable_web_search = context["app_config"]["enable_web_search"]
    
    if request.skip_fixed_qa:
        context["app_config"]["enable_fixed_qa"] = False
        context["fixed_qa_pairs"] = []
        logger.info("⏭️ 用户选择继续思考，跳过固定Q&A检索")
    
    # 🌐 如果用户授权联网搜索，强制启用
    if request.force_web_search:
        context["app_config"]["enable_web_search"] = True
        # 降低联网触发阈值，确保会使用联网结果
        if "fusion_config" not in context["app_config"]:
            context["app_config"]["fusion_config"] = {}
        if "strategy" not in context["app_config"]["fusion_config"]:
            context["app_config"]["fusion_config"]["strategy"] = {}
        context["app_config"]["fusion_config"]["strategy"]["web_search_trigger_threshold"] = 0.0
        logger.info("🌐 用户授权联网搜索，强制启用并降低触发阈值")
    
    retrieval_result = await hybrid_retrieval_engine.retrieve(
        query=query,
        app_config=context["app_config"],
        fixed_qa_pairs=context["fixed_qa_pairs"],
        knowledge_bases=context["knowledge_bases"],
        embedding_provider_config=context["embedding_provider_config"]
    )
    retrieval_time = (time.time() - retrieval_start) * 1000
    
    # 🔧 关键修复：如果用户选择"继续思考"，过滤掉所有固定Q&A引用
    if request.skip_fixed_qa:
        original_ref_count = len(retrieval_result.get("references", []))
        retrieval_result["references"] = [
            ref for ref in retrieval_result.get("references", [])
            if ref.get("source_type") != "fixed_qa"
        ]
        filtered_count = original_ref_count - len(retrieval_result.get("references", []))
        if filtered_count > 0:
            logger.info(f"🗑️ 已过滤 {filtered_count} 个固定Q&A引用（继续思考模式）")
    
    # 恢复原始配置
    if request.skip_fixed_qa:
        context["app_config"]["enable_fixed_qa"] = original_enable_fixed_qa
    if request.force_web_search:
        context["app_config"]["enable_web_search"] = original_enable_web_search
    
    # ⚠️ 重要：Q&A确认逻辑必须在高置信度返回之前！
    # 检查是否需要用户确认Q&A（新逻辑）
    # 直接从references中提取固定Q&A建议
    suggested_questions_for_confirmation = []
    for ref in retrieval_result.get("references", []):
        if ref.get("source_type") == "fixed_qa":
            suggested_questions_for_confirmation.append({
                "question": ref.get("question", ""),
                "similarity": round(ref.get("similarity", 0), 4),
                "qa_id": ref.get("id")
            })
    
    logger.info(f"🔍 确认检查: suggested_questions={len(suggested_questions_for_confirmation)}, skip_fixed_qa={request.skip_fixed_qa}, selected_qa_id={request.selected_qa_id}, force_web_search={request.force_web_search}, original_enable_fixed_qa={original_enable_fixed_qa}")
    
    # 只有在原始固定Q&A启用且有建议时才确认
    # 🌐 重要：如果用户已授权联网搜索，跳过Q&A确认
    if suggested_questions_for_confirmation and not request.skip_fixed_qa and not request.selected_qa_id and not request.force_web_search and original_enable_fixed_qa:
        # 检查最高相似度是否达到建议阈值
        max_similarity = max([q.get('similarity', 0) for q in suggested_questions_for_confirmation]) if suggested_questions_for_confirmation else 0
        
        # 从fusion_config获取固定Q&A配置（v3.0适配）
        fusion_config = context["app_config"].get("fusion_config", {})
        fixed_qa_config = fusion_config.get("fixed_qa", {})
        suggest_threshold = fixed_qa_config.get("suggest_threshold", 0.55)  # 默认0.55
        
        # 如果相似度达到建议阈值，显示确认界面
        if max_similarity >= suggest_threshold:
            logger.info(f"💡 检测到 {len(suggested_questions_for_confirmation)} 个相关Q&A（最高相似度: {max_similarity:.2%}），等待用户确认")
            
            return {
                "id": f"app-{app.id}-confirmation",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": app.llm_model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "",  # 空内容，表示需要用户确认
                        "metadata": {
                            "needs_confirmation": True,
                            "source": "fixed_qa_suggestion"
                        }
                    },
                    "finish_reason": "stop"
                }],
                "usage": {"total_tokens": 0},
                "cbit_metadata": {
                    "needs_confirmation": True,
                    "suggested_questions": suggested_questions_for_confirmation[:3],  # 最多3个
                    "retrieval_time_ms": retrieval_time,
                    "total_time_ms": (time.time() - start_time) * 1000
                }
            }
    
    # ============ 优化的阈值判断系统 ============
    # 获取配置的阈值（v3.0适配）
    min_threshold = context["app_config"].get("similarity_threshold_low", 0.3)  # 最低阈值
    high_threshold = context["app_config"].get("similarity_threshold_high", 0.9)  # 高阈值
    confidence = retrieval_result.get("confidence_score", 0)
    enable_polish = context["app_config"].get("fusion_config", {}).get("enable_llm_polish", True)  # 默认启用润色
    
    logger.info(f"🎯 置信度评估: {confidence:.2%} (最低阈值: {min_threshold:.2%}, 高阈值: {high_threshold:.2%}, LLM润色: {'✅' if enable_polish else '❌'})")
    
    # 💬 特殊处理：日常对话检测（优先级最高）
    is_casual = is_casual_conversation(query)
    
    # 如果是日常对话，直接使用LLM回答，不显示低置信提示
    if is_casual:
        logger.info(f"💬 检测到日常对话，跳过置信度检查，直接使用LLM自然回答")
        # 继续到下面的"场景1.5"处理
    
    # 场景1：极低置信度 - 根据策略模式处理
    # 但如果是日常对话，则跳过此逻辑
    elif confidence < min_threshold:
        # 🆕 获取策略模式
        strategy_mode = context["app_config"].get("strategy_mode", "safe_priority")
        
        # 🛡️ 安全优先模式 - 提示用户授权联网（仅在用户未授权时）
        if strategy_mode == "safe_priority" and context["app_config"]["enable_web_search"] and not request.force_web_search:
            logger.info(f"🛡️ 安全优先模式 + 低置信度 ({confidence:.2%} < {min_threshold:.2%})，提示用户授权联网")
            return {
                "id": f"app-{app.id}-web-search-auth",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": app.llm_model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "⚠️ 这个问题不在我的知识范围内，是否愿意开启联网模块进行问题回答？\n\n📢 提示：联网搜索结果来源于网络，仅供参考。",
                        "web_search_prompt": True  # 特殊标记，前端可以显示"尝试联网搜索"按钮
                    },
                    "finish_reason": "web_search_auth_required"
                }],
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0
                },
                "metadata": {
                    "confidence": round(confidence, 4),
                    "source": "low_confidence_prompt",
                    "strategy_mode": strategy_mode,
                    "requires_web_search_auth": True
                }
            }
        
        # 🌐 实时知识模式 - 直接拒绝回答
        elif strategy_mode == "realtime_knowledge":
            logger.info(f"🌐 实时知识模式 + 低置信度 ({confidence:.2%} < {min_threshold:.2%})，直接拒绝回答")
            answer = "🚫 抱歉，我无法准确回答这个问题。"
            source = "auto_reject"
        
        # 用户已授权联网但搜索失败 - 提供明确反馈
        elif request.force_web_search:
            logger.info(f"🌐 用户已授权联网但未找到结果，提供明确反馈")
            answer = "🔍 很抱歉，我在知识库和网络搜索中都未能找到相关信息。\n\n💡 建议：\n• 尝试换个方式提问\n• 联系人工客服获取帮助"
            source = "web_search_no_result"
        
        # 其他情况：使用fallback消息或默认提示（v3.0适配）
        else:
            fallback_message = context["app_config"].get("fusion_config", {}).get("fallback_message")
            if fallback_message:
                logger.info(f"📢 置信度过低 ({confidence:.2%} < {min_threshold:.2%})，返回fallback消息")
                answer = fallback_message
            else:
                # 未配置fallback消息，使用默认提示
                logger.warning(f"⚠️ 置信度过低但未配置fallback消息，使用默认提示")
                answer = "抱歉，我无法准确回答这个问题。建议您联系人工客服获取帮助。"
            source = "no_result"
        tokens_used = 0
        generation_time = 0
    
    # 场景1.5：日常对话 - 让LLM自然回答（不使用知识库）
    if is_casual:
        logger.info(f"💬 检测到日常对话，使用LLM自然回答")
        generation_start = time.time()
        
        # 使用简单的系统prompt，不添加知识库上下文
        system_prompt = "你是一个友好、自然的AI助手，像真人一样与用户交流。"
        
        enhanced_messages = [
            ChatMessage(role="system", content=system_prompt)
        ] + request.messages
        
        try:
            # 从数据库加载AI提供商的API密钥
            ai_provider_obj = db.query(EmbeddingProvider).filter(
                EmbeddingProvider.provider_type == app.ai_provider
            ).first()
            
            if not ai_provider_obj or not ai_provider_obj.api_key:
                raise HTTPException(
                    status_code=400, 
                    detail=f"应用配置的AI提供商 '{app.ai_provider}' 未设置API密钥"
                )
            
            multi_model_engine.set_api_key(app.ai_provider, ai_provider_obj.api_key)
            if ai_provider_obj.base_url:
                multi_model_engine.set_custom_config(app.ai_provider, {
                    "base_url": ai_provider_obj.base_url
                })
            
            llm_response = await multi_model_engine.chat_completion(
                provider=app.ai_provider,
                model=app.llm_model,
                messages=[{"role": msg.role, "content": msg.content} for msg in enhanced_messages],
                stream=request.stream,
                temperature=request.temperature or app.temperature or 0.7,
                max_tokens=request.max_tokens or context["app_config"].get("max_tokens", 2000)
            )
            
            answer = llm_response["choices"][0]["message"]["content"]
            tokens_used = llm_response.get("usage", {}).get("total_tokens", 0)
            source = "llm_casual"
            generation_time = (time.time() - generation_start) * 1000
            logger.info(f"✅ 日常对话LLM生成成功")
            
        except Exception as e:
            logger.error(f"❌ LLM生成失败: {e}")
            answer = "你好！我是AI助手，很高兴为您服务。😊"
            source = "llm_casual"
            tokens_used = 0
            generation_time = (time.time() - generation_start) * 1000
    
    # 场景2：极高置信度 + 禁用润色 = 直接返回检索结果（更像真人知识分享）
    elif confidence >= high_threshold and not enable_polish and retrieval_result.get("answer"):
        logger.info(f"📊 极高置信度 ({confidence:.2%} >= {high_threshold:.2%}) 且禁用润色，直接返回检索结果")
        answer = retrieval_result["answer"]
        source = "retrieval"
        tokens_used = 0
        generation_time = 0
    
    # 场景3：其他情况（包括启用润色或中等置信度）- LLM+知识库结合输出
    # 但如果answer已经被设置（如联网搜索失败），则跳过LLM生成
    elif not answer:
        if enable_polish:
            logger.info(f"🤖 启用LLM润色模式，调用LLM结合知识库生成更自然的答案（置信度: {confidence:.2%}）")
        else:
            logger.info(f"🤖 中等置信度 ({min_threshold:.2%} <= {confidence:.2%} < {high_threshold:.2%})，调用LLM结合知识库生成答案")
        generation_start = time.time()
        
        # 构建增强的prompt（v3.0适配）
        system_prompt = context["app_config"].get("system_prompt") or "你是一个有帮助的AI助手。"
        
        # 添加检索到的上下文
        context_text = ""
        if retrieval_result.get("answer"):
            context_text = f"\n\n相关信息：\n{retrieval_result['answer']}"
            logger.info(f"📝 传递给LLM的上下文长度: {len(retrieval_result['answer'])} 字符")
            logger.debug(f"📝 上下文内容预览: {retrieval_result['answer'][:200]}...")
        
        if retrieval_result.get("references"):
            context_text += "\n\n参考来源："
            for i, ref in enumerate(retrieval_result["references"][:3], 1):
                if ref["source_type"] == "fixed_qa":
                    context_text += f"\n{i}. [固定Q&A] {ref.get('question', '')}"
                elif ref["source_type"] == "kb":
                    context_text += f"\n{i}. [知识库: {ref.get('kb_name', '')}]"
                    logger.info(f"📚 来源{i}: 知识库 {ref.get('kb_name', 'unknown')}")
        
        # 添加指导性提示，避免编造
        # 使用更合理的阈值: min_threshold + 0.2 * (high_threshold - min_threshold)
        # 即60% + 0.2 * 35% = 67%
        cautious_threshold = min_threshold + 0.2 * (high_threshold - min_threshold)
        if confidence < cautious_threshold:  # 置信度很低时才加警告
            guidance = "\n\n注意：基于上述提供的信息尽力回答，如果信息明显不足以准确回答问题，请告知用户。"
            logger.info(f"⚠️ 置信度 {confidence:.2%} < {cautious_threshold:.2%}，使用保守提示")
        else:
            # 置信度中等或较高时，鼓励LLM基于上下文回答
            guidance = "\n\n请基于上述信息，用自然、友好的语言回答用户的问题。"
            logger.info(f"✅ 置信度 {confidence:.2%} >= {cautious_threshold:.2%}，使用鼓励性提示")
        
        context_text += guidance
        final_system_prompt = system_prompt + context_text
        
        logger.info(f"📄 完整System Prompt长度: {len(final_system_prompt)} 字符")
        logger.info(f"📄 基础System Prompt长度: {len(system_prompt)} 字符, 上下文长度: {len(context_text)} 字符")
        logger.debug(f"📄 System Prompt内容:\n{final_system_prompt}")
        
        enhanced_messages = [
            ChatMessage(role="system", content=final_system_prompt)
        ] + request.messages
        
        # 调用LLM前，先加载API密钥
        try:
            # 从数据库加载AI提供商的API密钥（存储在EmbeddingProvider表中）
            ai_provider_obj = db.query(EmbeddingProvider).filter(
                EmbeddingProvider.provider_type == app.ai_provider
            ).first()
            
            if not ai_provider_obj or not ai_provider_obj.api_key:
                logger.error(f"❌ 应用配置的AI提供商 '{app.ai_provider}' 未设置API密钥")
                raise HTTPException(
                    status_code=400, 
                    detail=f"应用配置的AI提供商 '{app.ai_provider}' 未设置API密钥，请先在系统设置中配置。"
                )
            
            # 设置API密钥到multi_model_engine
            multi_model_engine.set_api_key(app.ai_provider, ai_provider_obj.api_key)
            if ai_provider_obj.base_url:
                multi_model_engine.set_custom_config(app.ai_provider, {
                    "base_url": ai_provider_obj.base_url
                })
            
            logger.info(f"🔑 已加载 {app.ai_provider} API密钥")
            
            llm_response = await multi_model_engine.chat_completion(
                provider=app.ai_provider,
                model=app.llm_model,
                messages=[{"role": msg.role, "content": msg.content} for msg in enhanced_messages],
                stream=request.stream,
                temperature=request.temperature or app.temperature,
                max_tokens=request.max_tokens or context["app_config"].get("max_tokens", 2000)
            )
            
            answer = llm_response["choices"][0]["message"]["content"]
            tokens_used = llm_response.get("usage", {}).get("total_tokens", 0)
            source = "llm"
            logger.info(f"✅ LLM生成成功")
            
        except Exception as e:
            logger.error(f"❌ LLM生成失败: {e}")
            
            # LLM失败时的降级策略（v3.0适配）
            # 优先级：检索结果 > fallback+检索结果 > fallback消息 > 默认提示
            if retrieval_result.get("answer"):
                # 有检索结果，直接使用或添加前缀
                logger.info(f"📋 LLM失败，使用检索结果（置信度: {confidence:.2%}）")
                fallback_message = context["app_config"].get("fusion_config", {}).get("fallback_message")
                if fallback_message and confidence < high_threshold:
                    # 置信度不够高，添加前缀说明
                    answer = f"{fallback_message}\n\n{retrieval_result['answer']}"
                else:
                    # 置信度够高，直接使用检索结果
                    answer = retrieval_result["answer"]
                source = retrieval_result.get("matched_source", "retrieval")
            else:
                # 没有检索结果，使用fallback消息或默认提示
                fallback_message = context["app_config"].get("fusion_config", {}).get("fallback_message")
                if fallback_message:
                    logger.info(f"📢 LLM失败且无检索结果，使用fallback消息")
                    answer = fallback_message
                else:
                    logger.warning(f"⚠️ LLM失败且无可用结果")
                    answer = "抱歉，我暂时无法回答这个问题。请稍后重试或联系人工客服。"
                source = "no_result"
            
            tokens_used = 0
        
        generation_time = (time.time() - generation_start) * 1000
    
    total_time = (time.time() - start_time) * 1000
    
    # 更新应用统计
    app.total_requests += 1
    app.total_tokens += tokens_used if 'tokens_used' in locals() else 0
    db.commit()
    
    # 记录检索日志（v3.0适配）
    if context["app_config"].get("enable_source_tracking", True):
        log = RetrievalLog(
            application_id=app.id,
            query=query,
            matched_source=retrieval_result.get("matched_source"),
            confidence_score=confidence,
            references=retrieval_result.get("references"),
            final_answer=answer,
            retrieval_path=retrieval_result.get("retrieval_path"),
            preprocessing_info=retrieval_result.get("preprocessing_info"),
            fusion_details=retrieval_result.get("fusion_details"),
            preprocessing_time_ms=retrieval_result["timing"]["preprocessing_ms"],
            retrieval_time_ms=retrieval_time,
            generation_time_ms=generation_time if 'generation_time' in locals() else 0,
            total_time_ms=total_time,
            tokens_used=tokens_used if 'tokens_used' in locals() else 0,
            has_suggestions=retrieval_result.get("has_suggestions", False),
            suggestions=retrieval_result.get("suggestions")
        )
        db.add(log)
        db.commit()
    
    # 提取固定Q&A建议问题
    suggested_questions = []
    matched_fixed_qa = False
    match_confidence = 0.0
    
    # 检查检索结果中的固定Q&A
    for result in retrieval_result.get("retrieval_path", []):
        if result.get("source") == "fixed_qa":
            matched_fixed_qa = True
            break
    
    # 从references中提取建议问题
    for ref in retrieval_result.get("references", []):
        if ref.get("source_type") == "fixed_qa":
            match_confidence = max(match_confidence, ref.get("similarity", 0))
            # 检查是否是建议类型（可以从检索结果的metadata中获取）
            suggested_questions.append({
                "question": ref.get("question", ""),
                "similarity": round(ref.get("similarity", 0), 4),
                "qa_id": ref.get("id")
            })
    
    # OpenAI兼容格式响应
    response = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": app.llm_model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": answer
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": tokens_used if 'tokens_used' in locals() else 0
        },
        # CBIT Forge扩展字段（供外部前端使用）
        "cbit_metadata": {
            "matched_fixed_qa": matched_fixed_qa,
            "match_confidence": round(match_confidence, 4),
            "suggested_questions": suggested_questions[:3],  # 最多3个建议
            "retrieval_sources": {
                "fixed_qa": context["app_config"]["enable_fixed_qa"] and matched_fixed_qa,
                "vector_kb": context["app_config"]["enable_vector_kb"] and retrieval_result.get("matched_source") == "kb",
                "web_search": context["app_config"]["enable_web_search"]
            },
            "timing": {
                "retrieval_ms": round(retrieval_time, 2),
                "generation_ms": round(generation_time, 2) if 'generation_time' in locals() else 0,
                "total_ms": round(total_time, 2)
            }
        }
    }
    
    # 如果启用来源追溯，添加额外的内部metadata
    if context["app_config"].get("enable_source_tracking", True):  # v3.0适配
        # 确定主要来源的显示名称
        source_display_map = {
            "retrieval": "检索结果",
            "llm": "AI生成",
            "llm_casual": "日常对话",  # 新增：日常对话标记
            "fallback": "回退机制",
            "no_result": "未达阈值"
        }
        
        # 🔑 关键：如果是日常对话，清空所有引用信息
        if source == "llm_casual":
            logger.info("💬 日常对话：清空引用来源和策略信息")
            response["choices"][0]["message"]["metadata"] = {
                "source": source,
                "source_display": "日常对话",
                "retrieval_confidence": None,  # 不显示置信度
                "matched_source": None,
                "matched_source_display": None,
                "retrieval_path": [],
                "references": [],  # 清空引用
                "suggestions": [],
                "_strategy_info": None  # 不传递策略信息
            }
        else:
            # 非日常对话：正常处理
            matched_source = retrieval_result.get("matched_source")
            matched_source_display = {
                "fixed_qa": "固定Q&A",
                "kb": "向量知识库",
                "web": "联网搜索",
                "tavily_answer": "Cbit AI 搜索",
                "tavily_web": "Cbit AI 搜索",
                None: "未匹配"
            }.get(matched_source, matched_source or "未知")
            
            # 只有非日常对话才传递策略信息
            strategy_info = retrieval_result.get("_strategy_info")
            
            response["choices"][0]["message"]["metadata"] = {
                "source": source,
                "source_display": source_display_map.get(source, source),
                "retrieval_confidence": confidence,
                "matched_source": matched_source,
                "matched_source_display": matched_source_display,
                "retrieval_path": retrieval_result.get("retrieval_path", []),
                "references": retrieval_result.get("references") if context["app_config"].get("enable_citation", True) else [],
                "suggestions": retrieval_result.get("suggestions") if retrieval_result.get("has_suggestions") else [],
                "_strategy_info": strategy_info
            }
        
        # 在cbit_metadata中也添加更详细的来源信息
        # 但如果是日常对话，简化信息
        if source == "llm_casual":
            response["cbit_metadata"]["source_info"] = {
                "primary_source": "日常对话",
                "retrieval_source": None,
                "confidence": None,
                "confidence_level": None
            }
        else:
            response["cbit_metadata"]["source_info"] = {
                "primary_source": source_display_map.get(source, source),
                "retrieval_source": matched_source_display,
                "confidence": round(confidence, 4),
                "confidence_level": _get_confidence_level_display(confidence)
            }
    
    # ========== 保存对话记录 ==========
    try:
        conversation = Conversation(
            application_id=app.id,
            user_message=query,
            ai_response=answer,
            conversation_metadata={
                "matched_source": retrieval_result.get("matched_source"),
                "confidence": round(confidence, 4),
                "source": source,
                "is_casual": is_casual if 'is_casual' in locals() else False,
                "references": retrieval_result.get("references", [])[:3]  # 只保存前3个引用
            },
            tokens_used=tokens_used if 'tokens_used' in locals() else None,
            latency_ms=round(total_time, 2)
        )
        db.add(conversation)
        db.commit()
        logger.debug(f"💾 对话已保存到数据库 (ID: {conversation.id})")
    except Exception as e:
        logger.warning(f"⚠️ 保存对话失败: {e}")
        # 不影响主流程，继续返回响应
    
    return response


def _get_confidence_level_display(confidence: float) -> str:
    """根据置信度返回显示文本"""
    if confidence >= 0.90:
        return "极高"
    elif confidence >= 0.80:
        return "高"
    elif confidence >= 0.70:
        return "中等"
    elif confidence >= 0.60:
        return "较低"
    else:
        return "低"
