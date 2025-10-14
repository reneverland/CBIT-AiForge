"""
统一的向量数据库接口
支持 ChromaDB, Qdrant, Pinecone, Weaviate, Milvus 等
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from loguru import logger
import uuid


class VectorDBInterface(ABC):
    """向量数据库统一接口"""
    
    @abstractmethod
    def create_collection(self, collection_name: str, dimension: int, metadata: Optional[Dict] = None):
        """创建集合"""
        pass
    
    @abstractmethod
    def delete_collection(self, collection_name: str):
        """删除集合"""
        pass
    
    @abstractmethod
    def collection_exists(self, collection_name: str) -> bool:
        """检查集合是否存在"""
        pass
    
    @abstractmethod
    async def add_documents(
        self,
        collection_name: str,
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """添加文档向量"""
        pass
    
    @abstractmethod
    async def query(
        self,
        collection_name: str,
        query_embedding: List[float],
        n_results: int = 3
    ) -> Dict:
        """查询相似文档"""
        pass
    
    @abstractmethod
    def get_collection_stats(self, collection_name: str) -> Dict:
        """获取集合统计信息"""
        pass
    
    @abstractmethod
    async def delete_documents(self, collection_name: str, ids: List[str]):
        """删除文档"""
        pass


class ChromaDBAdapter(VectorDBInterface):
    """ChromaDB 适配器 - 本地向量数据库"""
    
    def __init__(self, persist_directory: str):
        import chromadb
        from chromadb.config import Settings as ChromaSettings
        from pathlib import Path
        
        persist_path = Path(persist_directory)
        persist_path.mkdir(parents=True, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=str(persist_path),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        logger.info(f"✅ ChromaDB 适配器初始化完成: {persist_directory}")
    
    def create_collection(self, collection_name: str, dimension: int, metadata: Optional[Dict] = None):
        """创建集合"""
        try:
            collection = self.client.create_collection(
                name=collection_name,
                metadata=metadata or {}
            )
            logger.info(f"✅ ChromaDB 创建集合: {collection_name}")
            return collection
        except Exception as e:
            logger.error(f"ChromaDB 创建集合失败: {e}")
            raise
    
    def delete_collection(self, collection_name: str):
        """删除集合"""
        try:
            self.client.delete_collection(name=collection_name)
            logger.info(f"✅ ChromaDB 删除集合: {collection_name}")
        except Exception as e:
            logger.error(f"ChromaDB 删除集合失败: {e}")
            raise
    
    def collection_exists(self, collection_name: str) -> bool:
        """检查集合是否存在"""
        try:
            self.client.get_collection(name=collection_name)
            return True
        except:
            return False
    
    def get_collection_dimension(self, collection_name: str) -> Optional[int]:
        """获取集合的向量维度"""
        try:
            collection = self.client.get_collection(name=collection_name)
            # ChromaDB不直接存储维度信息，需要从集合中获取一个样本向量
            # 如果集合为空，返回None
            count = collection.count()
            if count == 0:
                logger.info(f"📏 ChromaDB 集合 {collection_name} 为空，无法获取维度")
                return None
            
            # 获取第一个向量的维度
            result = collection.get(limit=1, include=["embeddings"])
            if result and result.get("embeddings") and len(result["embeddings"]) > 0:
                dimension = len(result["embeddings"][0])
                logger.info(f"📏 ChromaDB 集合 {collection_name} 维度: {dimension}")
                return dimension
            return None
        except Exception as e:
            logger.warning(f"⚠️ 获取 ChromaDB 集合维度失败: {e}")
            return None
    
    async def add_documents(
        self,
        collection_name: str,
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """添加文档向量"""
        try:
            collection = self.client.get_collection(name=collection_name)
            
            if not ids:
                ids = [str(uuid.uuid4()) for _ in documents]
            
            collection.add(
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas or [{}] * len(documents),
                ids=ids
            )
            
            logger.info(f"✅ ChromaDB 添加 {len(documents)} 个文档到 {collection_name}")
            return ids
        except Exception as e:
            logger.error(f"ChromaDB 添加文档失败: {e}")
            raise
    
    async def query(
        self,
        collection_name: str,
        query_embedding: List[float],
        n_results: int = 3
    ) -> Dict:
        """查询相似文档"""
        try:
            collection = self.client.get_collection(name=collection_name)
            
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )
            
            return {
                "documents": results["documents"][0],
                "distances": results["distances"][0],
                "metadatas": results["metadatas"][0]
            }
        except Exception as e:
            logger.error(f"ChromaDB 查询失败: {e}")
            raise
    
    def get_collection_stats(self, collection_name: str) -> Dict:
        """获取集合统计信息"""
        try:
            collection = self.client.get_collection(name=collection_name)
            count = collection.count()
            return {
                "collection_name": collection_name,
                "document_count": count,
                "type": "chromadb"
            }
        except Exception as e:
            logger.error(f"ChromaDB 获取统计信息失败: {e}")
            return {}
    
    async def delete_documents(self, collection_name: str, ids: List[str]):
        """删除文档"""
        try:
            collection = self.client.get_collection(name=collection_name)
            collection.delete(ids=ids)
            logger.info(f"✅ ChromaDB 删除 {len(ids)} 个文档从 {collection_name}")
        except Exception as e:
            logger.error(f"ChromaDB 删除文档失败: {e}")
            raise


class QdrantAdapter(VectorDBInterface):
    """Qdrant 适配器 - 云端向量数据库"""
    
    def __init__(self, host: str, port: int = 6333, api_key: Optional[str] = None, https: bool = False):
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams
        
        # 判断是否使用 HTTPS（Qdrant Cloud）
        # Qdrant Cloud 的URL格式：xxx.qdrant.io（不需要端口号）
        if https or 'qdrant.io' in host:
            # 对于 Qdrant Cloud，不添加端口号
            url = f"https://{host}"
        elif port in [443, 6334]:
            url = f"https://{host}:{port}"
        else:
            url = f"http://{host}:{port}"
        
        logger.info(f"🔧 初始化 Qdrant 客户端: {url}")
        logger.info(f"🔑 API密钥长度: {len(api_key) if api_key else 0}, 前缀: {api_key[:50] if api_key else 'None'}...")
        
        self.client = QdrantClient(
            url=url,
            api_key=api_key,
            timeout=60
        )
        self.Distance = Distance
        self.VectorParams = VectorParams
        logger.info(f"✅ Qdrant 适配器初始化完成: {url}")
    
    def create_collection(self, collection_name: str, dimension: int, metadata: Optional[Dict] = None):
        """创建集合"""
        try:
            from qdrant_client.models import Distance, VectorParams
            
            logger.info(f"🔧 正在 Qdrant 创建集合: {collection_name} (维度: {dimension})")
            
            # 尝试检查是否已存在（某些情况下检查会失败，直接尝试创建）
            try:
                if self.collection_exists(collection_name):
                    logger.warning(f"⚠️ Qdrant 集合已存在，跳过创建: {collection_name}")
                    return
            except Exception as check_err:
                # 检查失败时，尝试直接创建（可能是权限问题或时序问题）
                logger.warning(f"⚠️ 检查集合存在性失败，尝试直接创建: {check_err}")
            
            # 尝试创建集合
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=dimension,
                    distance=Distance.COSINE
                )
            )
            logger.info(f"✅ Qdrant 创建集合成功: {collection_name} (维度: {dimension})")
                
        except Exception as e:
            error_msg = str(e)
            # 如果是"已存在"错误，不算失败
            if 'already exists' in error_msg.lower() or 'conflict' in error_msg.lower():
                logger.info(f"✅ Qdrant 集合已存在（正常）: {collection_name}")
                return
            
            logger.error(f"❌ Qdrant 创建集合失败: {e}", exc_info=True)
            raise
    
    def delete_collection(self, collection_name: str):
        """删除集合"""
        try:
            self.client.delete_collection(collection_name=collection_name)
            logger.info(f"✅ Qdrant 删除集合: {collection_name}")
        except Exception as e:
            logger.error(f"Qdrant 删除集合失败: {e}")
            raise
    
    def collection_exists(self, collection_name: str) -> bool:
        """检查集合是否存在 - 直接尝试获取集合信息"""
        try:
            logger.info(f"🔍 检查 Qdrant 集合是否存在: {collection_name}")
            
            # 直接尝试获取集合信息，如果不存在会抛出异常
            try:
                self.client.get_collection(collection_name=collection_name)
                logger.info(f"✅ Qdrant 集合存在: {collection_name}")
                return True
            except Exception as get_err:
                # 检查是否是404错误（集合不存在）
                error_msg = str(get_err)
                if '404' in error_msg or 'Not found' in error_msg or 'not found' in error_msg.lower():
                    logger.info(f"⚠️ Qdrant 集合不存在: {collection_name}")
                    return False
                elif '403' in error_msg or 'Forbidden' in error_msg or 'forbidden' in error_msg.lower():
                    # 403错误说明认证问题，需要抛出以便上层处理
                    logger.error(f"❌ Qdrant 访问被拒绝（403 Forbidden）: {collection_name}")
                    raise Exception(f"403 Forbidden: 访问被拒绝，请检查API密钥权限")
                else:
                    # 其他错误则抛出
                    logger.error(f"❌ Qdrant 检查集合出错: {error_msg}")
                    raise
            
        except Exception as e:
            error_str = str(e)
            # 如果是我们主动抛出的403错误，继续向上抛
            if '403' in error_str or 'Forbidden' in error_str:
                raise
            logger.error(f"❌ 检查 Qdrant 集合失败: {collection_name}, 错误: {error_str}")
            # 其他未知错误，假设集合不存在
            return False
    
    def get_collection_dimension(self, collection_name: str) -> Optional[int]:
        """获取集合的向量维度"""
        try:
            collection_info = self.client.get_collection(collection_name=collection_name)
            # Qdrant的collection info中包含vectors_config
            if hasattr(collection_info, 'config') and hasattr(collection_info.config, 'params'):
                if hasattr(collection_info.config.params, 'vectors'):
                    vectors_config = collection_info.config.params.vectors
                    if hasattr(vectors_config, 'size'):
                        dimension = vectors_config.size
                        logger.info(f"📏 Qdrant 集合 {collection_name} 维度: {dimension}")
                        return dimension
            return None
        except Exception as e:
            logger.warning(f"⚠️ 获取 Qdrant 集合维度失败: {e}")
            return None
    
    async def add_documents(
        self,
        collection_name: str,
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """添加文档向量"""
        try:
            from qdrant_client.models import PointStruct
            
            if not ids:
                ids = [str(uuid.uuid4()) for _ in documents]
            
            points = []
            for i, (id_, embedding, document) in enumerate(zip(ids, embeddings, documents)):
                payload = {
                    "text": document,
                    **(metadatas[i] if metadatas else {})
                }
                points.append(PointStruct(
                    id=id_,
                    vector=embedding,
                    payload=payload
                ))
            
            self.client.upsert(
                collection_name=collection_name,
                points=points
            )
            
            logger.info(f"✅ Qdrant 添加 {len(documents)} 个文档到 {collection_name}")
            return ids
        except Exception as e:
            logger.error(f"Qdrant 添加文档失败: {e}")
            raise
    
    async def query(
        self,
        collection_name: str,
        query_embedding: List[float],
        n_results: int = 3
    ) -> Dict:
        """查询相似文档"""
        try:
            search_result = self.client.search(
                collection_name=collection_name,
                query_vector=query_embedding,
                limit=n_results
            )
            
            documents = []
            distances = []
            metadatas = []
            
            for hit in search_result:
                documents.append(hit.payload.get("text", ""))
                distances.append(1 - hit.score)  # 转换为距离（越小越相似）
                # 移除 text 字段，保留其他元数据
                metadata = {k: v for k, v in hit.payload.items() if k != "text"}
                metadatas.append(metadata)
            
            return {
                "documents": documents,
                "distances": distances,
                "metadatas": metadatas
            }
        except Exception as e:
            logger.error(f"Qdrant 查询失败: {e}")
            raise
    
    def get_collection_stats(self, collection_name: str) -> Dict:
        """获取集合统计信息"""
        try:
            # 使用 count() 方法获取点数，避免解析整个 collection info
            count_result = self.client.count(
                collection_name=collection_name,
                exact=True
            )
            
            return {
                "collection_name": collection_name,
                "document_count": count_result.count if hasattr(count_result, 'count') else count_result,
                "type": "qdrant"
            }
        except Exception as e:
            logger.error(f"Qdrant 获取统计信息失败: {e}")
            return {
                "collection_name": collection_name,
                "document_count": 0,
                "type": "qdrant"
            }
    
    async def delete_documents(self, collection_name: str, ids: List[str]):
        """删除文档"""
        try:
            self.client.delete(
                collection_name=collection_name,
                points_selector=ids
            )
            logger.info(f"✅ Qdrant 删除 {len(ids)} 个文档从 {collection_name}")
        except Exception as e:
            logger.error(f"Qdrant 删除文档失败: {e}")
            raise


def create_vector_db_adapter(provider_config: Optional[Dict[str, Any]] = None) -> VectorDBInterface:
    """
    工厂函数：根据配置创建向量数据库适配器
    
    Args:
        provider_config: 向量数据库提供商配置
        
    Returns:
        VectorDBInterface 实例
    """
    if not provider_config:
        # 默认使用本地 ChromaDB
        from app.core.config import settings
        return ChromaDBAdapter(persist_directory=str(settings.CHROMA_DB_PATH))
    
    provider_type = provider_config.get("provider_type", "chromadb")
    
    if provider_type == "chromadb":
        from app.core.config import settings
        return ChromaDBAdapter(persist_directory=str(settings.CHROMA_DB_PATH))
    
    elif provider_type == "qdrant":
        return QdrantAdapter(
            host=provider_config.get("host", "localhost"),
            port=provider_config.get("port", 6333),
            api_key=provider_config.get("api_key"),
            https=provider_config.get("https", False)
        )
    
    else:
        logger.warning(f"不支持的向量数据库类型: {provider_type}，使用默认 ChromaDB")
        from app.core.config import settings
        return ChromaDBAdapter(persist_directory=str(settings.CHROMA_DB_PATH))
