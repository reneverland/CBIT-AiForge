"""
RAG 检索增强生成引擎
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Optional
from loguru import logger
from sentence_transformers import SentenceTransformer
from app.core.config import settings


class RAGEngine:
    """RAG 引擎"""
    
    def __init__(self):
        # 初始化 ChromaDB 客户端
        settings.CHROMA_DB_PATH.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(settings.CHROMA_DB_PATH),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        # 初始化 Embedding 模型
        logger.info(f"加载 Embedding 模型: {settings.EMBEDDING_MODEL}")
        self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("✅ Embedding 模型加载完成")
    
    def create_collection(self, collection_name: str, metadata: Optional[Dict] = None):
        """创建知识库集合"""
        try:
            collection = self.client.create_collection(
                name=collection_name,
                metadata=metadata or {}
            )
            logger.info(f"✅ 创建知识库集合: {collection_name}")
            return collection
        except Exception as e:
            logger.error(f"创建集合失败: {e}")
            raise
    
    def get_collection(self, collection_name: str):
        """获取知识库集合"""
        try:
            return self.client.get_collection(name=collection_name)
        except Exception as e:
            logger.error(f"获取集合失败: {e}")
            return None
    
    def delete_collection(self, collection_name: str):
        """删除知识库集合"""
        try:
            self.client.delete_collection(name=collection_name)
            logger.info(f"✅ 删除知识库集合: {collection_name}")
        except Exception as e:
            logger.error(f"删除集合失败: {e}")
            raise
    
    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None
    ):
        """向知识库添加文档"""
        try:
            collection = self.get_collection(collection_name)
            if not collection:
                raise ValueError(f"知识库不存在: {collection_name}")
            
            # 生成 embeddings
            embeddings = self.embedding_model.encode(documents).tolist()
            
            # 生成 IDs
            if not ids:
                import uuid
                ids = [str(uuid.uuid4()) for _ in documents]
            
            # 添加到集合
            collection.add(
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas or [{}] * len(documents),
                ids=ids
            )
            
            logger.info(f"✅ 添加 {len(documents)} 个文档到知识库: {collection_name}")
            return ids
            
        except Exception as e:
            logger.error(f"添加文档失败: {e}")
            raise
    
    def query(
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
            collection = self.get_collection(collection_name)
            if not collection:
                raise ValueError(f"知识库不存在: {collection_name}")
            
            # 生成查询 embedding
            query_embedding = self.embedding_model.encode([query_text]).tolist()
            
            # 查询
            results = collection.query(
                query_embeddings=query_embedding,
                n_results=n_results
            )
            
            logger.info(f"✅ 检索完成，找到 {len(results['documents'][0])} 个相关文档")
            
            return {
                "documents": results["documents"][0],
                "distances": results["distances"][0],
                "metadatas": results["metadatas"][0]
            }
            
        except Exception as e:
            logger.error(f"检索失败: {e}")
            raise
    
    def get_collection_stats(self, collection_name: str) -> Dict:
        """获取知识库统计信息"""
        try:
            collection = self.get_collection(collection_name)
            if not collection:
                return {}
            
            count = collection.count()
            return {
                "collection_name": collection_name,
                "document_count": count,
            }
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}

