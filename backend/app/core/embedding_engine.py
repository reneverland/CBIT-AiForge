"""
Embedding向量化引擎 - 支持多种提供商
"""

from typing import List, Dict, Any, Optional
from loguru import logger
import httpx
import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingEngine:
    """统一的Embedding向量化引擎"""
    
    def __init__(self):
        self._local_models: Dict[str, SentenceTransformer] = {}
        self._default_provider: Optional[Dict[str, Any]] = None
    
    def set_default_provider(self, provider_config: Dict[str, Any]):
        """设置默认Embedding提供商"""
        self._default_provider = provider_config
        logger.info(f"设置默认Embedding提供商: {provider_config.get('name')}")
    
    def _get_local_model(self, model_name: str) -> SentenceTransformer:
        """获取或加载本地模型（延迟加载+缓存）"""
        if model_name not in self._local_models:
            logger.info(f"正在加载本地Embedding模型: {model_name}")
            self._local_models[model_name] = SentenceTransformer(model_name)
            logger.info(f"✅ 本地Embedding模型加载完成: {model_name}")
        return self._local_models[model_name]
    
    async def embed_texts(
        self,
        texts: List[str],
        provider_config: Optional[Dict[str, Any]] = None
    ) -> List[List[float]]:
        """
        向量化文本列表
        
        Args:
            texts: 文本列表
            provider_config: 提供商配置，如果为None则使用默认提供商
        
        Returns:
            向量列表
        """
        config = provider_config or self._default_provider
        
        if not config:
            raise ValueError("未配置Embedding提供商，请先设置默认提供商或传入provider_config")
        
        provider_type = config.get("provider_type")
        
        if provider_type == "openai":
            return await self._embed_openai(texts, config)
        elif provider_type == "local":
            return self._embed_local(texts, config)
        elif provider_type == "custom":
            return await self._embed_custom(texts, config)
        else:
            raise ValueError(f"不支持的提供商类型: {provider_type}")
    
    async def embed_text(
        self,
        text: str,
        provider_config: Optional[Dict[str, Any]] = None
    ) -> List[float]:
        """向量化单个文本"""
        vectors = await self.embed_texts([text], provider_config)
        return vectors[0]
    
    async def _embed_openai(
        self,
        texts: List[str],
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """使用OpenAI API进行向量化"""
        api_key = config.get("api_key")
        # 确保 base_url 不为空字符串，使用默认值
        base_url = config.get("base_url") or "https://api.openai.com/v1"
        if base_url and isinstance(base_url, str):
            base_url = base_url.strip() or "https://api.openai.com/v1"
        model_name = config.get("model_name", "text-embedding-3-small")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": texts,
            "model": model_name
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/embeddings",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                # OpenAI返回格式: {"data": [{"embedding": [...]}, ...]}
                embeddings = [item["embedding"] for item in data["data"]]
                logger.info(f"✅ OpenAI Embedding完成: {len(texts)}个文本")
                return embeddings
                
            except Exception as e:
                logger.error(f"OpenAI Embedding失败: {e}")
                raise
    
    def _embed_local(
        self,
        texts: List[str],
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """使用本地模型进行向量化"""
        model_name = config.get("model_name")
        model = self._get_local_model(model_name)
        
        try:
            # sentence-transformers返回numpy数组
            embeddings = model.encode(texts, convert_to_numpy=True)
            # 转换为列表格式
            embeddings_list = embeddings.tolist()
            logger.info(f"✅ 本地Embedding完成: {len(texts)}个文本")
            return embeddings_list
            
        except Exception as e:
            logger.error(f"本地Embedding失败: {e}")
            raise
    
    async def _embed_custom(
        self,
        texts: List[str],
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """使用自定义API进行向量化"""
        # 确保 base_url 不为空
        base_url = config.get("base_url")
        if not base_url or (isinstance(base_url, str) and not base_url.strip()):
            raise ValueError("自定义API需要配置有效的 base_url")
        base_url = base_url.strip() if isinstance(base_url, str) else base_url
        api_key = config.get("api_key")
        model_name = config.get("model_name")
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        # 尝试OpenAI兼容格式
        payload = {
            "input": texts,
            "model": model_name
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/embeddings",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                # 尝试解析OpenAI格式
                if "data" in data:
                    embeddings = [item["embedding"] for item in data["data"]]
                elif "embeddings" in data:
                    embeddings = data["embeddings"]
                else:
                    raise ValueError(f"无法解析自定义API响应格式: {data}")
                
                logger.info(f"✅ 自定义API Embedding完成: {len(texts)}个文本")
                return embeddings
                
            except Exception as e:
                logger.error(f"自定义API Embedding失败: {e}")
                raise
    
    def compute_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """计算余弦相似度"""
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        # 余弦相似度
        dot_product = np.dot(vec1_np, vec2_np)
        norm1 = np.linalg.norm(vec1_np)
        norm2 = np.linalg.norm(vec2_np)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        return float(similarity)
    
    def get_dimension(self, provider_config: Dict[str, Any]) -> int:
        """获取向量维度"""
        provider_type = provider_config.get("provider_type")
        
        # 如果配置中有维度，直接返回
        if provider_config.get("dimension"):
            return provider_config["dimension"]
        
        # 否则根据模型名称推断
        model_name = provider_config.get("model_name", "")
        
        # OpenAI模型维度
        if provider_type == "openai":
            if "text-embedding-3-small" in model_name:
                return 1536
            elif "text-embedding-3-large" in model_name:
                return 3072
            elif "text-embedding-ada-002" in model_name:
                return 1536
        
        # 本地模型维度（需要加载模型才能获取）
        if provider_type == "local":
            try:
                model = self._get_local_model(model_name)
                return model.get_sentence_embedding_dimension()
            except:
                pass
        
        # 默认值
        return 768


# 全局实例
embedding_engine = EmbeddingEngine()
