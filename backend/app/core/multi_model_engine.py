"""
多模型推理引擎 - 支持多个API提供商
"""

from typing import Optional, Dict, Any, List, Iterator, Union
from loguru import logger
import httpx
import json
from app.core.config import settings


class MultiModelEngine:
    """支持多种模型提供商的推理引擎"""
    
    PROVIDERS = {
        "openai": {
            "name": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "default_model": "gpt-4-turbo-preview",
            "models": []  # 将通过API动态获取
        },
        "openrouter": {
            "name": "OpenRouter",
            "base_url": "https://openrouter.ai/api/v1",
            "default_model": "anthropic/claude-3-opus",
            "models": []  # 将通过API动态获取
        },
        "gemini": {
            "name": "Google Gemini",
            "base_url": "https://generativelanguage.googleapis.com/v1beta",
            "default_model": "gemini-pro",
            "models": []  # 将通过API动态获取
        },
        "anthropic": {
            "name": "Anthropic Claude",
            "base_url": "https://api.anthropic.com/v1",
            "default_model": "claude-3-opus-20240229",
            "models": []  # 将通过API动态获取
        },
        "deepseek": {
            "name": "DeepSeek",
            "base_url": "https://api.deepseek.com/v1",
            "default_model": "deepseek-chat",
            "models": []  # 将通过API动态获取
        },
        "qwen": {
            "name": "Qwen (通义千问)",
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "default_model": "qwen-turbo",
            "models": []  # 将通过API动态获取
        },
        "local": {
            "name": "本地模型",
            "base_url": "http://localhost:8001/v1",
            "default_model": "local-model",
            "models": []  # 将通过API动态获取
        }
    }
    
    def __init__(self):
        self.api_keys: Dict[str, str] = {}
        self.custom_configs: Dict[str, Dict[str, Any]] = {}
        self.available_models: Dict[str, List[str]] = {}  # 存储每个提供商的可用模型
    
    def set_api_key(self, provider: str, api_key: str):
        """设置API密钥"""
        self.api_keys[provider] = api_key
        logger.info(f"已设置 {provider} API密钥")
    
    def set_custom_config(self, provider: str, config: Dict[str, Any]):
        """设置自定义配置"""
        self.custom_configs[provider] = config
        logger.info(f"已设置 {provider} 自定义配置")
    
    def set_available_models(self, provider: str, models: List[str]):
        """设置提供商的可用模型列表"""
        self.available_models[provider] = models
        logger.info(f"已设置 {provider} 可用模型: {len(models)} 个")
    
    async def verify_api_key(self, provider: str, api_key: str, base_url: Optional[str] = None) -> Dict[str, Any]:
        """
        验证API密钥是否有效
        
        Returns:
            {
                "valid": bool,
                "message": str,
                "models": List[str]  # 如果成功，返回可用模型列表
            }
        """
        provider_info = self.PROVIDERS.get(provider, {})
        test_base_url = base_url or provider_info.get("base_url", "")
        
        logger.info(f"🔍 开始验证 {provider} API密钥...")
        logger.info(f"   Base URL: {test_base_url}")
        logger.info(f"   API Key前缀: {api_key[:10]}..." if api_key else "   API Key: 未提供")
        
        try:
            # 尝试获取模型列表
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            # 增加超时时间，支持代理
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                # 对于OpenAI兼容的API，尝试获取模型列表
                if provider in ["openai", "openrouter", "deepseek", "qwen", "local"]:
                    try:
                        logger.info(f"   尝试获取模型列表: {test_base_url}/models")
                        response = await client.get(
                            f"{test_base_url}/models",
                            headers=headers
                        )
                        logger.info(f"   响应状态码: {response.status_code}")
                        
                        if response.status_code == 200:
                            data = response.json()
                            models = [m.get("id") or m.get("name") for m in data.get("data", [])]
                            logger.info(f"   ✅ 成功获取 {len(models)} 个模型")
                            return {
                                "valid": True,
                                "message": "API密钥验证成功",
                                "models": models if models else []
                            }
                        else:
                            logger.warning(f"   获取模型列表失败: {response.status_code} - {response.text[:200]}")
                    except Exception as e:
                        logger.warning(f"   获取模型列表异常: {str(e)}")
                
                # 如果获取模型列表失败，尝试简单的聊天请求
                logger.info(f"   尝试备用验证方式: 发送测试请求")
                test_payload = {
                    "model": provider_info.get("default_model", "gpt-3.5-turbo"),
                    "messages": [{"role": "user", "content": "hi"}],
                    "max_tokens": 5
                }
                
                if provider == "gemini":
                    # Gemini特殊处理
                    url = f"{test_base_url}/models/gemini-pro:generateContent?key={api_key}"
                    test_payload = {
                        "contents": [{"role": "user", "parts": [{"text": "hi"}]}]
                    }
                    logger.info(f"   Gemini请求URL: {url}")
                    response = await client.post(url, json=test_payload)
                elif provider == "anthropic":
                    # Claude特殊处理
                    headers["x-api-key"] = api_key
                    headers["anthropic-version"] = "2023-06-01"
                    del headers["Authorization"]
                    test_payload = {
                        "model": "claude-3-haiku-20240307",
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5
                    }
                    logger.info(f"   Claude请求URL: {test_base_url}/messages")
                    response = await client.post(
                        f"{test_base_url}/messages",
                        headers=headers,
                        json=test_payload
                    )
                else:
                    # OpenAI兼容格式
                    url = f"{test_base_url}/chat/completions"
                    logger.info(f"   请求URL: {url}")
                    response = await client.post(
                        url,
                        headers=headers,
                        json=test_payload
                    )
                
                logger.info(f"   测试请求响应状态码: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    logger.info(f"   ✅ 测试请求成功")
                    return {
                        "valid": True,
                        "message": "API密钥验证成功（通过测试请求）",
                        "models": []  # 模型列表获取失败，但API有效
                    }
                else:
                    error_msg = f"HTTP {response.status_code}: {response.text[:300]}"
                    logger.error(f"   ❌ 验证失败: {error_msg}")
                    return {
                        "valid": False,
                        "message": f"API验证失败 - {error_msg}",
                        "models": []
                    }
                    
        except httpx.TimeoutException as e:
            error_msg = f"请求超时 - 可能需要配置代理或检查网络连接"
            logger.error(f"   ❌ {error_msg}: {str(e)}")
            return {
                "valid": False,
                "message": error_msg,
                "models": []
            }
        except httpx.ConnectError as e:
            error_msg = f"连接失败 - 无法连接到 {test_base_url}"
            logger.error(f"   ❌ {error_msg}: {str(e)}")
            return {
                "valid": False,
                "message": f"{error_msg}。如果在中国大陆使用OpenAI，可能需要配置代理。",
                "models": []
            }
        except Exception as e:
            error_msg = f"验证异常: {type(e).__name__} - {str(e)}"
            logger.error(f"   ❌ {error_msg}")
            return {
                "valid": False,
                "message": error_msg,
                "models": []
            }
    
    def get_provider_info(self, provider: str) -> Dict[str, Any]:
        """获取提供商信息"""
        return self.PROVIDERS.get(provider, {})
    
    def list_providers(self) -> List[Dict[str, Any]]:
        """列出所有支持的提供商"""
        return [
            {
                "id": provider_id,
                "name": info["name"],
                "base_url": info["base_url"],
                "default_model": info["default_model"],
                "models": self.available_models.get(provider_id, []),  # 使用动态获取的模型列表
                "configured": provider_id in self.api_keys
            }
            for provider_id, info in self.PROVIDERS.items()
        ]
    
    async def chat_completion(
        self,
        provider: str,
        model: str,
        messages: List[Dict[str, str]],
        stream: bool = False,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> Union[Dict[str, Any], Iterator[str]]:
        """
        统一的聊天补全接口
        
        Args:
            provider: 提供商ID
            model: 模型名称
            messages: 消息列表
            stream: 是否流式输出
            temperature: 温度参数
            max_tokens: 最大token数
        """
        if provider not in self.PROVIDERS:
            raise ValueError(f"不支持的提供商: {provider}")
        
        # 获取配置
        provider_info = self.PROVIDERS[provider]
        base_url = self.custom_configs.get(provider, {}).get("base_url", provider_info["base_url"])
        api_key = self.api_keys.get(provider, "")
        
        # 特殊处理不同提供商
        if provider == "gemini":
            return await self._gemini_completion(model, messages, api_key, temperature, max_tokens)
        elif provider == "anthropic":
            return await self._anthropic_completion(model, messages, api_key, stream, temperature, max_tokens)
        else:
            # OpenAI兼容格式
            return await self._openai_compatible_completion(
                base_url, api_key, model, messages, stream, temperature, max_tokens
            )
    
    async def _openai_compatible_completion(
        self,
        base_url: str,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        stream: bool,
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """OpenAI兼容格式的API调用"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"API调用失败: {e}")
                raise
    
    async def _gemini_completion(
        self,
        model: str,
        messages: List[Dict[str, str]],
        api_key: str,
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """Google Gemini API调用"""
        # 转换消息格式
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                # 转换为OpenAI格式
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                return {
                    "choices": [{
                        "message": {
                            "role": "assistant",
                            "content": text
                        },
                        "finish_reason": "stop"
                    }],
                    "usage": {
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0
                    }
                }
            except Exception as e:
                logger.error(f"Gemini API调用失败: {e}")
                raise
    
    async def _anthropic_completion(
        self,
        model: str,
        messages: List[Dict[str, str]],
        api_key: str,
        stream: bool,
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """Anthropic Claude API调用"""
        # 提取system消息
        system = ""
        user_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                user_messages.append(msg)
        
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": user_messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        if system:
            payload["system"] = system
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                # 转换为OpenAI格式
                text = data.get("content", [{}])[0].get("text", "")
                return {
                    "choices": [{
                        "message": {
                            "role": "assistant",
                            "content": text
                        },
                        "finish_reason": data.get("stop_reason", "stop")
                    }],
                    "usage": {
                        "prompt_tokens": data.get("usage", {}).get("input_tokens", 0),
                        "completion_tokens": data.get("usage", {}).get("output_tokens", 0),
                        "total_tokens": sum([
                            data.get("usage", {}).get("input_tokens", 0),
                            data.get("usage", {}).get("output_tokens", 0)
                        ])
                    }
                }
            except Exception as e:
                logger.error(f"Claude API调用失败: {e}")
                raise


# 全局实例
multi_model_engine = MultiModelEngine()
