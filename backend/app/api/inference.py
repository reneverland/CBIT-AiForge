"""
推理服务 API - 兼容 OpenAI 格式
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger
import json
import time
from datetime import datetime

from app.models.database import get_db, Model as ModelModel, InferenceLog
from app.core.rag_engine import RAGEngine
from app.models.database import KnowledgeBase as KnowledgeBaseModel
from app.core.multi_model_engine import multi_model_engine

router = APIRouter()
rag_engine = RAGEngine()


class Message(BaseModel):
    role: str  # system, user, assistant
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: float = 0.7
    max_tokens: int = 2000
    stream: bool = False
    knowledge_base: Optional[str] = None  # 知识库名称（可选）
    n_results: int = 3  # RAG 检索数量
    provider: Optional[str] = None  # AI提供商（openai, deepseek等）


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]


@router.post("/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    db: Session = Depends(get_db)
):
    """
    OpenAI 兼容的聊天补全接口
    
    支持：
    - 普通模型推理
    - RAG 检索增强（指定 knowledge_base）
    - 流式输出（stream=true）
    """
    try:
        start_time = time.time()
        
        # 获取用户消息
        if not request.messages:
            raise HTTPException(status_code=400, detail="消息列表不能为空")
        
        user_message = request.messages[-1].content
        
        # RAG 检索（如果指定了知识库）
        context = ""
        if request.knowledge_base:
            kb = db.query(KnowledgeBaseModel).filter(
                KnowledgeBaseModel.name == request.knowledge_base
            ).first()
            
            if kb:
                results = rag_engine.query(
                    collection_name=kb.collection_name,
                    query_text=user_message,
                    n_results=request.n_results
                )
                
                # 构建上下文
                context = "\n\n".join([
                    f"参考文档 {i+1}:\n{doc}"
                    for i, doc in enumerate(results["documents"])
                ])
                
                # 将上下文插入到系统提示中
                system_prompt = f"""你是一个专业的AI助手。请根据以下参考文档回答用户的问题。

参考文档：
{context}

请基于以上文档回答问题。如果文档中没有相关信息，请明确说明。"""
                
                request.messages = [
                    Message(role="system", content=system_prompt),
                    Message(role="user", content=user_message)
                ]
        
        # 使用多模型引擎进行推理
        if request.provider and request.provider in multi_model_engine.api_keys:
            # 使用指定的AI提供商
            logger.info(f"🚀 使用 {request.provider} 提供商进行推理: {request.model}")
            
            # 转换消息格式
            messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
            
            try:
                ai_response = await multi_model_engine.chat_completion(
                    provider=request.provider,
                    model=request.model,
                    messages=messages_dict,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    stream=False
                )
                
                response_text = ai_response["choices"][0]["message"]["content"]
                logger.info(f"✅ 推理成功: {len(response_text)} 字符")
                
            except Exception as e:
                logger.error(f"❌ AI提供商推理失败: {e}")
                # 回退到模拟响应
                response_text = f"""[推理失败]

抱歉，调用 {request.provider} API 时出现错误：{str(e)}

请检查：
1. API密钥是否有效
2. 模型名称是否正确
3. API额度是否充足"""
        else:
            # 模拟推理（用于本地模型或未配置提供商）
            logger.info(f"📋 使用模拟响应: {request.model}")
            response_text = f"""[cbitXForge 模拟响应]

问题: {user_message}

这是一个模拟的回复。在实际部署中，这里会调用：
- 微调后的模型（如 {request.model}）
- 或基座模型进行推理

{'使用了 RAG 检索增强，基于相关文档生成回答。' if request.knowledge_base else '直接使用模型生成回答。'}

提示：请在"AI提供商配置"页面配置API密钥，然后选择对应的模型即可进行真实推理。

版权所有 © 2025 Reneverland, CBIT, CUHK"""
        
        # 记录推理日志
        log = InferenceLog(
            prompt=user_message,
            response=response_text,
            tokens_used=len(user_message) + len(response_text),
            latency_ms=(time.time() - start_time) * 1000,
            metadata={
                "model": request.model,
                "provider": request.provider,
                "knowledge_base": request.knowledge_base,
                "temperature": request.temperature,
            }
        )
        db.add(log)
        db.commit()
        
        # 构建响应
        response = ChatCompletionResponse(
            id=f"chatcmpl-{int(time.time())}",
            created=int(time.time()),
            model=request.model,
            choices=[
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "finish_reason": "stop"
                }
            ],
            usage={
                "prompt_tokens": len(user_message) // 4,
                "completion_tokens": len(response_text) // 4,
                "total_tokens": (len(user_message) + len(response_text)) // 4
            }
        )
        
        if request.stream:
            # 流式输出
            async def generate():
                for chunk in response_text.split():
                    yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk + ' '}}]})}\n\n"
                yield "data: [DONE]\n\n"
            
            return StreamingResponse(generate(), media_type="text/event-stream")
        
        return response
        
    except Exception as e:
        logger.error(f"推理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_available_models(db: Session = Depends(get_db)):
    """列出可用的模型（OpenAI 兼容）"""
    models = db.query(ModelModel).filter(ModelModel.status == "active").all()
    
    return {
        "object": "list",
        "data": [
            {
                "id": model.name,
                "object": "model",
                "created": int(model.created_at.timestamp()) if model.created_at else 0,
                "owned_by": "cbit_forge"
            }
            for model in models
        ]
    }


@router.get("/health")
async def inference_health():
    """推理服务健康检查"""
    return {
        "status": "healthy",
        "service": "inference",
        "timestamp": datetime.utcnow().isoformat()
    }

