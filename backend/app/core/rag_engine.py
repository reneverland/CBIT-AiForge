"""
RAG 检索增强生成引擎 - 支持多种向量数据库和 Embedding 提供商
"""

from typing import List, Dict, Optional
from loguru import logger
from sentence_transformers import SentenceTransformer
from app.core.config import settings
from app.core.vector_db_interface import VectorDBInterface, create_vector_db_adapter


class RAGEngine:
    """RAG 引擎 - 支持多种向量数据库和 Embedding 提供商"""
    
    def __init__(
        self, 
        embedding_provider_config: Optional[Dict] = None,
        vector_db_provider_config: Optional[Dict] = None
    ):
        # 初始化向量数据库适配器
        self.vector_db: VectorDBInterface = create_vector_db_adapter(vector_db_provider_config)
        
        # Embedding 提供商配置
        self.embedding_provider_config = embedding_provider_config
        
        # 向量数据库配置（用于获取维度等信息）
        self.vector_db_config = vector_db_provider_config
        
        # 本地模型缓存（只在使用本地模型时加载）
        self._embedding_model = None
        logger.info("✅ RAG 引擎初始化完成（Embedding 模型将在首次使用时加载）")
    
    def set_embedding_provider(self, provider_config: Dict):
        """设置 Embedding 提供商配置"""
        self.embedding_provider_config = provider_config
        logger.info(f"设置 Embedding 提供商: {provider_config.get('name')}")
    
    @property
    def embedding_model(self):
        """懒加载本地 Embedding 模型（仅用于本地模型）"""
        if self._embedding_model is None:
            logger.info(f"正在加载 Embedding 模型: {settings.EMBEDDING_MODEL}")
            self._embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("✅ Embedding 模型加载完成")
        return self._embedding_model
    
    def create_collection(self, collection_name: str, dimension: int = 1536, metadata: Optional[Dict] = None):
        """创建知识库集合"""
        try:
            self.vector_db.create_collection(
                collection_name=collection_name,
                dimension=dimension,
                metadata=metadata or {}
            )
            logger.info(f"✅ 创建知识库集合: {collection_name} (维度: {dimension})")
        except Exception as e:
            logger.error(f"创建集合失败: {e}")
            raise
    
    def collection_exists(self, collection_name: str) -> bool:
        """检查集合是否存在"""
        try:
            return self.vector_db.collection_exists(collection_name)
        except Exception as e:
            logger.error(f"检查集合失败: {e}")
            return False
    
    def delete_collection(self, collection_name: str):
        """删除知识库集合"""
        try:
            self.vector_db.delete_collection(collection_name)
            logger.info(f"✅ 删除知识库集合: {collection_name}")
        except Exception as e:
            logger.error(f"删除集合失败: {e}")
            raise
    
    async def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None
    ):
        """向知识库添加文档"""
        try:
            logger.info(f"📝 准备添加 {len(documents)} 个文档到集合: {collection_name}")
            logger.info(f"🔍 使用向量数据库: {self.vector_db.__class__.__name__}")
            
            # 生成 embeddings - 先生成向量，以便获取维度信息
            if self.embedding_provider_config:
                from app.core.embedding_engine import embedding_engine
                embeddings = await embedding_engine.embed_texts(
                    documents,
                    self.embedding_provider_config
                )
                logger.info(f"使用 {self.embedding_provider_config.get('name')} 进行向量化")
            else:
                # 回退到本地模型
                embeddings = self.embedding_model.encode(documents).tolist()
                logger.info("使用本地模型进行向量化")
            
            # 获取向量维度
            dimension = len(embeddings[0]) if embeddings else 512
            logger.info(f"向量维度: {dimension}")
            
            # 检查集合是否存在，并验证维度
            try:
                exists = self.collection_exists(collection_name)
                logger.info(f"🔍 集合 {collection_name} 存在性检查结果: {exists}")
                
                if exists:
                    # 集合存在，检查维度是否匹配
                    if hasattr(self.vector_db, 'get_collection_dimension'):
                        existing_dimension = self.vector_db.get_collection_dimension(collection_name)
                        if existing_dimension and existing_dimension != dimension:
                            logger.warning(f"⚠️ 维度不匹配！集合维度: {existing_dimension}, 当前embedding维度: {dimension}")
                            logger.warning(f"🗑️ 删除旧集合并重新创建...")
                            
                            # 删除旧集合
                            try:
                                self.delete_collection(collection_name)
                                logger.info(f"✅ 已删除旧集合: {collection_name}")
                            except Exception as del_err:
                                logger.error(f"❌ 删除旧集合失败: {del_err}")
                                raise Exception(f"维度不匹配且无法删除旧集合: {del_err}")
                            
                            # 创建新集合
                            self.create_collection(collection_name, dimension)
                            logger.info(f"✅ 已使用新维度 {dimension} 重新创建集合: {collection_name}")
                        else:
                            logger.info(f"✅ 集合维度匹配: {dimension}")
                else:
                    # 集合不存在，创建新集合
                    logger.warning(f"⚠️ 集合不存在，尝试自动创建: {collection_name}")
                    self.create_collection(collection_name, dimension)
                    logger.info(f"✅ 集合创建成功: {collection_name}")
            except Exception as check_err:
                logger.warning(f"⚠️ 检查/创建集合失败: {check_err}，尝试直接添加文档")
            
            # 使用向量数据库适配器添加文档
            try:
                ids = await self.vector_db.add_documents(
                    collection_name=collection_name,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                
                logger.info(f"✅ 添加 {len(documents)} 个文档到知识库: {collection_name}")
                return ids
                
            except Exception as add_err:
                error_msg = str(add_err)
                # 检查是否是维度不匹配错误
                if 'dimension error' in error_msg.lower() or 'expected dim' in error_msg.lower():
                    logger.warning(f"⚠️ 检测到维度不匹配错误，尝试重建集合...")
                    logger.warning(f"   错误详情: {error_msg[:200]}")
                    
                    # 删除旧集合
                    try:
                        logger.info(f"🗑️ 删除旧集合: {collection_name}")
                        self.delete_collection(collection_name)
                        logger.info(f"✅ 旧集合已删除")
                    except Exception as del_err:
                        logger.warning(f"⚠️ 删除集合时出现警告: {del_err}")
                    
                    # 重新创建集合
                    logger.info(f"🔧 使用正确维度 {dimension} 重新创建集合: {collection_name}")
                    self.create_collection(collection_name, dimension)
                    logger.info(f"✅ 集合重建完成")
                    
                    # 重试添加文档
                    logger.info(f"🔄 重试添加 {len(documents)} 个文档...")
                    ids = await self.vector_db.add_documents(
                        collection_name=collection_name,
                        embeddings=embeddings,
                        documents=documents,
                        metadatas=metadatas,
                        ids=ids
                    )
                    
                    logger.info(f"✅ 添加 {len(documents)} 个文档到知识库: {collection_name} (重建后)")
                    return ids
                else:
                    # 不是维度错误，直接抛出
                    raise
            
        except Exception as e:
            logger.error(f"添加文档失败: {e}", exc_info=True)
            raise
    
    async def query(
        self,
        collection_name: str,
        query_text: str,
        n_results: int = 3
    ) -> Dict:
        """
        检索相关文档
        
        Returns:
            {
                "documents": List[str],  # 检索到的文档
                "distances": List[float],  # 相似度距离
                "metadatas": List[Dict]  # 元数据
            }
        """
        try:
            # 检查集合是否存在（Qdrant Cloud可能有时序问题或权限限制）
            try:
                if not self.collection_exists(collection_name):
                    logger.warning(f"⚠️ 检查显示集合不存在: {collection_name}，但可能是时序问题，尝试继续查询")
            except Exception as check_err:
                # 403权限错误不影响查询，直接继续
                if "403" in str(check_err) or "Forbidden" in str(check_err):
                    logger.info(f"ℹ️ 跳过集合存在性检查（权限限制），直接进行查询: {collection_name}")
                else:
                    logger.warning(f"⚠️ 检查集合存在性失败: {check_err}，假设collection存在并继续")
            
            # 生成查询 embedding
            if self.embedding_provider_config and self.embedding_provider_config.get('provider_type') != 'local':
                # 使用配置的云端提供商（OpenAI等）
                from app.core.embedding_engine import embedding_engine
                try:
                    query_embeddings = await embedding_engine.embed_texts(
                        [query_text],
                        self.embedding_provider_config
                    )
                    query_embedding = query_embeddings[0]
                    provider_name = self.embedding_provider_config.get('name', self.embedding_provider_config.get('provider_type', '未知'))
                    logger.info(f"✅ 使用 {provider_name} 进行查询向量化 (维度: {len(query_embedding)})")
                except Exception as e:
                    logger.error(f"❌ OpenAI Embedding API调用失败: {e}")
                    raise Exception(f"向量化失败: {str(e)}。请检查API配置或使用本地模型。")
            else:
                # 使用本地模型
                query_embedding = self.embedding_model.encode([query_text]).tolist()[0]
                logger.info(f"使用本地模型进行查询向量化 (维度: {len(query_embedding)})")
            
            # 使用向量数据库适配器查询
            results = await self.vector_db.query(
                collection_name=collection_name,
                query_embedding=query_embedding,
                n_results=n_results
            )
            
            logger.info(f"✅ 检索完成，找到 {len(results['documents'])} 个相关文档")
            
            return results
            
        except Exception as e:
            logger.error(f"检索失败: {e}")
            raise
    
    def get_collection_stats(self, collection_name: str) -> Dict:
        """获取知识库统计信息"""
        try:
            return self.vector_db.get_collection_stats(collection_name)
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}
    
    async def delete_documents(self, collection_name: str, ids: List[str]):
        """删除文档"""
        try:
            await self.vector_db.delete_documents(collection_name, ids)
            logger.info(f"✅ 删除 {len(ids)} 个文档从知识库: {collection_name}")
        except Exception as e:
            logger.error(f"删除文档失败: {e}")
            raise


# 全局实例
rag_engine = RAGEngine()

