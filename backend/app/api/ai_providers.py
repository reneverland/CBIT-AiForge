"""
AI提供商配置管理 API
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger

from app.core.multi_model_engine import multi_model_engine
from app.models.database import get_db, EmbeddingProvider

router = APIRouter()


class ProviderConfig(BaseModel):
    """提供商配置"""
    provider: str
    api_key: str
    base_url: Optional[str] = None


class ProviderVerifyRequest(BaseModel):
    """提供商验证请求"""
    provider: str
    api_key: str
    base_url: Optional[str] = None


class ChatRequest(BaseModel):
    """聊天请求"""
    provider: str
    model: str
    messages: List[Dict[str, str]]
    temperature: float = 0.7
    max_tokens: int = 2000
    stream: bool = False


@router.get("/providers")
async def list_providers():
    """
    获取所有支持的AI提供商列表
    """
    try:
        providers = multi_model_engine.list_providers()
        return {
            "providers": providers,
            "total": len(providers)
        }
    except Exception as e:
        logger.error(f"获取提供商列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/providers/{provider}")
async def get_provider_info(provider: str):
    """
    获取指定提供商的详细信息
    """
    try:
        info = multi_model_engine.get_provider_info(provider)
        if not info:
            raise HTTPException(status_code=404, detail="提供商不存在")
        
        return {
            "provider": provider,
            **info,
            "configured": provider in multi_model_engine.api_keys,
            "has_api_key": provider in multi_model_engine.api_keys  # 添加明确的API密钥状态
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取提供商信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/providers/{provider}/check-config")
async def check_provider_config(provider: str):
    """
    检查指定提供商是否已配置API密钥
    
    返回格式：
    {
        "provider": "openai",
        "configured": true,
        "has_api_key": true,
        "message": "已配置"
    }
    """
    try:
        has_key = provider in multi_model_engine.api_keys
        return {
            "provider": provider,
            "configured": has_key,
            "has_api_key": has_key,
            "message": "已配置" if has_key else "未配置"
        }
    except Exception as e:
        logger.error(f"检查提供商配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/providers/verify")
@router.post("/providers/verify/")
async def verify_provider(request: ProviderVerifyRequest):
    """
    验证AI提供商API密钥
    """
    try:
        # 验证提供商是否存在
        provider_info = multi_model_engine.get_provider_info(request.provider)
        if not provider_info:
            raise HTTPException(status_code=404, detail="不支持的提供商")
        
        # 验证API密钥
        result = await multi_model_engine.verify_api_key(
            request.provider,
            request.api_key,
            request.base_url
        )
        
        if result["valid"]:
            logger.info(f"✅ API验证成功: {request.provider}")
            return {
                "valid": True,
                "message": result["message"],
                "models": result["models"],
                "provider": request.provider
            }
        else:
            logger.warning(f"⚠️  API验证失败: {request.provider} - {result['message']}")
            return {
                "valid": False,
                "message": result["message"],
                "models": [],
                "provider": request.provider
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"验证提供商失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/providers/fetch-models")
@router.post("/providers/fetch-models/")
async def fetch_provider_models(request: ProviderVerifyRequest):
    """
    获取指定AI提供商的可用模型列表（无需预先配置，仅用于探索）
    
    返回格式：
    {
        "valid": true/false,
        "provider": "openai",
        "models": ["gpt-4", "gpt-3.5-turbo", ...],
        "message": "成功/失败信息"
    }
    """
    try:
        logger.info(f"🔍 尝试获取 {request.provider} 的模型列表...")
        
        # 首先尝试验证API密钥并获取模型
        result = await multi_model_engine.verify_api_key(
            request.provider,
            request.api_key,
            request.base_url
        )
        
        if result["valid"] and result.get("models"):
            logger.info(f"✅ 成功获取 {request.provider} 的 {len(result['models'])} 个模型")
            return {
                "valid": True,
                "provider": request.provider,
                "models": result["models"],
                "message": "成功获取模型列表"
            }
        else:
            logger.warning(f"⚠️ API验证失败，返回默认模型列表")
            # 如果验证失败，返回一些常见的默认模型供用户选择
            default_models = _get_default_models(request.provider)
            return {
                "valid": False,
                "provider": request.provider,
                "models": default_models,
                "message": result.get("message", "API验证失败，显示默认模型列表（可手动输入其他模型）")
            }
            
    except Exception as e:
        logger.error(f"❌ 获取模型列表失败: {e}")
        default_models = _get_default_models(request.provider)
        return {
            "valid": False,
            "provider": request.provider,
            "models": default_models,
            "message": f"获取失败: {str(e)}，显示默认模型列表（可手动输入其他模型）"
        }


def _get_default_models(provider: str) -> List[str]:
    """获取默认模型列表"""
    default_models = {
        "openai": [
            "gpt-4-turbo-preview",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-4-1106-preview",
            "gpt-4-0125-preview",
            "gpt-3.5-turbo-16k"
        ],
        "anthropic": [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0"
        ],
        "openrouter": [
            "anthropic/claude-3-opus",
            "anthropic/claude-3-sonnet",
            "openai/gpt-4-turbo-preview",
            "google/gemini-pro",
            "meta-llama/llama-3-70b-instruct"
        ],
        "gemini": [
            "gemini-pro",
            "gemini-pro-vision",
            "gemini-1.5-pro"
        ],
        "deepseek": [
            "deepseek-chat",
            "deepseek-coder"
        ],
        "qwen": [
            "qwen-turbo",
            "qwen-plus",
            "qwen-max",
            "qwen-max-longcontext"
        ],
        "local": [
            "local-model"
        ]
    }
    return default_models.get(provider, [])


@router.post("/providers/configure")
@router.post("/providers/configure/")
async def configure_provider(config: ProviderConfig):
    """
    配置AI提供商（设置API密钥等）
    
    注意：配置前建议先调用 /providers/verify 验证API密钥
    """
    try:
        # 验证提供商是否存在
        provider_info = multi_model_engine.get_provider_info(config.provider)
        if not provider_info:
            raise HTTPException(status_code=404, detail="不支持的提供商")
        
        # 验证API密钥
        verification = await multi_model_engine.verify_api_key(
            config.provider,
            config.api_key,
            config.base_url
        )
        
        if not verification["valid"]:
            raise HTTPException(
                status_code=400,
                detail=f"API密钥验证失败: {verification['message']}"
            )
        
        # 设置API密钥
        multi_model_engine.set_api_key(config.provider, config.api_key)
        
        # 保存可用模型列表
        if verification["models"]:
            multi_model_engine.set_available_models(config.provider, verification["models"])
        
        # 如果有自定义base_url
        if config.base_url:
            multi_model_engine.set_custom_config(
                config.provider,
                {"base_url": config.base_url}
            )
        
        logger.info(f"✅ 已配置提供商: {config.provider}")
        
        return {
            "message": "配置成功",
            "provider": config.provider,
            "configured": True,
            "models": verification["models"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"配置提供商失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/completions")
@router.post("/chat/completions/")
async def chat_completions(request: ChatRequest):
    """
    多提供商统一聊天补全接口
    
    兼容OpenAI格式，支持多个提供商
    """
    try:
        # 检查提供商是否已配置
        if request.provider not in multi_model_engine.api_keys and request.provider != "local":
            raise HTTPException(
                status_code=400,
                detail=f"提供商 {request.provider} 未配置，请先设置API密钥"
            )
        
        # 调用推理引擎
        response = await multi_model_engine.chat_completion(
            provider=request.provider,
            model=request.model,
            messages=request.messages,
            stream=request.stream,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        logger.info(f"✅ 推理完成: {request.provider}/{request.model}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"聊天补全失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/providers/{provider}/models")
async def get_provider_models(provider: str, db: Session = Depends(get_db)):
    """
    获取指定提供商的可用模型列表
    
    Args:
        provider: 提供商名称 (openai, anthropic, gemini等)
    
    Returns:
        {
            "has_config": bool,  # 是否已配置API密钥
            "models": List[str],  # 可用模型列表
            "provider": str
        }
    """
    try:
        # 从数据库查找该提供商的配置
        provider_config = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.provider_type == provider,
            EmbeddingProvider.api_key.isnot(None)
        ).first()
        
        if not provider_config or not provider_config.api_key:
            # 返回默认模型列表
            default_models = _get_default_models(provider)
            return {
                "has_config": False,
                "models": default_models,
                "provider": provider,
                "message": f"未配置 {provider} 的API密钥，显示默认模型列表"
            }
        
        # 已配置，尝试从API获取真实模型列表
        try:
            multi_model_engine.set_api_key(provider, provider_config.api_key)
            if provider_config.base_url:
                multi_model_engine.set_custom_config(provider, {
                    "base_url": provider_config.base_url
                })
            
            # 获取缓存的模型列表
            models = multi_model_engine.available_models.get(provider, [])
            
            # 如果没有缓存，从API获取
            if not models:
                logger.info(f"🔄 从 {provider} API 获取模型列表...")
                verification = await multi_model_engine.verify_api_key(provider, provider_config.api_key)
                if verification["valid"] and verification.get("models"):
                    models = verification["models"]
                    multi_model_engine.set_available_models(provider, models)
                    logger.info(f"✅ 成功获取 {provider} 的 {len(models)} 个模型")
                else:
                    # API验证失败，返回默认模型
                    models = _get_default_models(provider)
                    logger.warning(f"⚠️ {provider} API验证失败，使用默认模型列表")
            
            return {
                "has_config": True,
                "models": models,
                "provider": provider,
                "message": f"已从 {provider} API 获取模型列表"
            }
            
        except Exception as e:
            logger.error(f"❌ 获取 {provider} 模型列表失败: {e}")
            default_models = _get_default_models(provider)
            return {
                "has_config": True,
                "models": default_models,
                "provider": provider,
                "error": str(e),
                "message": f"获取失败，使用默认模型列表"
            }
    
    except Exception as e:
        logger.error(f"❌ 查询 {provider} 配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/providers/models/available")
async def get_available_models(db: Session = Depends(get_db)):
    """
    获取所有已配置提供商的可用模型列表
    
    返回格式：
    {
        "models": [
            {
                "id": "openai/gpt-4-turbo-preview",
                "name": "gpt-4-turbo-preview", 
                "display_name": "GPT-4 Turbo (OpenAI)",
                "provider": "openai",
                "provider_name": "OpenAI"
            },
            ...
        ]
    }
    """
    try:
        all_models = []
        
        # 从数据库加载embedding_providers（包含OpenAI等API配置）
        embedding_providers = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.api_key.isnot(None)
        ).all()
        
        for ep in embedding_providers:
            if ep.provider_type == "openai" and ep.api_key and ep.api_key.strip():
                # 将embedding provider的配置同步到multi_model_engine
                if "openai" not in multi_model_engine.api_keys:
                    multi_model_engine.set_api_key("openai", ep.api_key)
                    logger.info(f"🔄 从数据库加载 OpenAI API密钥")
        
        # 遍历所有已配置的提供商
        for provider, api_key in multi_model_engine.api_keys.items():
            provider_info = multi_model_engine.get_provider_info(provider)
            if not provider_info:
                continue
                
            provider_name = provider_info.get("name", provider)
            
            # 获取该提供商的可用模型列表
            models = multi_model_engine.available_models.get(provider, [])
            
            # 如果没有缓存的模型列表，尝试从API获取
            if not models:
                logger.info(f"🔄 从 {provider} 获取模型列表...")
                try:
                    verification = await multi_model_engine.verify_api_key(provider, api_key)
                    if verification["valid"] and verification["models"]:
                        models = verification["models"]
                        multi_model_engine.set_available_models(provider, models)
                except Exception as e:
                    logger.warning(f"⚠️ 获取 {provider} 模型列表失败: {e}")
                    continue
            
            # 格式化模型列表
            for model in models:
                all_models.append({
                    "id": f"{provider}/{model}",  # 唯一ID
                    "name": model,  # 模型名称
                    "display_name": f"{model} ({provider_name})",  # 显示名称
                    "provider": provider,  # 提供商ID
                    "provider_name": provider_name  # 提供商名称
                })
        
        logger.info(f"📋 返回 {len(all_models)} 个可用模型")
        
        return {
            "models": all_models,
            "total": len(all_models)
        }
        
    except Exception as e:
        logger.error(f"获取可用模型列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/providers/{provider}/config")
async def remove_provider_config(provider: str):
    """
    删除提供商配置
    """
    try:
        if provider in multi_model_engine.api_keys:
            del multi_model_engine.api_keys[provider]
            logger.info(f"✅ 已删除提供商配置: {provider}")
            return {"message": "配置已删除", "provider": provider}
        else:
            raise HTTPException(status_code=404, detail="提供商未配置")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
