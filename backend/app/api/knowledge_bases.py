"""
知识库管理 API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from loguru import logger

from app.models.database import (
    get_db, 
    KnowledgeBase as KnowledgeBaseModel, 
    Document as DocumentModel,
    EmbeddingProvider,
    VectorDBProvider
)
from app.core.rag_engine import RAGEngine
from app.core.document_processor import DocumentProcessor
from pathlib import Path

router = APIRouter()


def get_default_embedding_provider(db: Session) -> Optional[dict]:
    """获取默认的 Embedding 提供商配置"""
    try:
        provider = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.is_default == True
        ).first()
        
        if provider:
            return {
                "name": provider.name,
                "provider_type": provider.provider_type,
                "model_name": provider.model_name,
                "api_key": provider.api_key,
                "base_url": provider.base_url,
                "dimension": provider.dimension
            }
        return None
    except Exception as e:
        logger.warning(f"获取默认 Embedding 提供商失败: {e}")
        return None


def get_vector_db_provider_config(db: Session, provider_id: Optional[int] = None) -> Optional[dict]:
    """获取向量数据库提供商配置"""
    try:
        if provider_id:
            provider = db.query(VectorDBProvider).filter(
                VectorDBProvider.id == provider_id
            ).first()
        else:
            # 获取默认的向量数据库提供商
            provider = db.query(VectorDBProvider).filter(
                VectorDBProvider.is_default == True
            ).first()
        
        if provider:
            config = {
                "name": provider.name,
                "provider_type": provider.provider_type,
                "host": provider.host,
                "port": provider.port
            }
            
            # 添加 API key（如果有）
            if provider.api_key:
                config["api_key"] = provider.api_key
            
            # 判断是否使用 HTTPS
            if provider.provider_type == "qdrant" and ('qdrant.io' in (provider.host or '') or provider.port in [443, 6334]):
                config["https"] = True
            
            return config
        return None
    except Exception as e:
        logger.warning(f"获取向量数据库提供商失败: {e}")
        return None


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    vector_db_provider_id: Optional[int] = None  # 选择的向量数据库提供商ID


class QueryRequest(BaseModel):
    query: str
    n_results: int = 3


class AddTextRequest(BaseModel):
    texts: List[str]
    metadata: Optional[dict] = None


class SmartSplitRequest(BaseModel):
    """智能拆分请求"""
    text: str
    strategy: str = "paragraph"  # paragraph, semantic, fixed, smart
    provider: Optional[str] = None  # AI提供商（语义拆分时需要）
    model: Optional[str] = None  # 模型名称
    api_key: Optional[str] = None  # API密钥
    base_url: Optional[str] = None  # 自定义API地址
    chunk_size: int = 500  # 固定长度拆分时的片段大小
    overlap: int = 50  # 固定长度拆分时的重叠字符数
    min_chars: int = 50  # 段落拆分时的最小字符数


class BatchAddTextRequest(BaseModel):
    """批量添加文本请求"""
    chunks: List[Dict]  # 经过预览确认的文本片段列表
    metadata: Optional[dict] = None


@router.post("/", status_code=201)
@router.post("", status_code=201)
async def create_knowledge_base(
    kb: KnowledgeBaseCreate,
    db: Session = Depends(get_db)
):
    """
    创建知识库（带智能同步检测）
    """
    try:
        # 1. 检查名称是否已存在
        existing = db.query(KnowledgeBaseModel).filter(
            KnowledgeBaseModel.name == kb.name
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="知识库名称已存在")
        
        # 2. 生成 collection 名称
        collection_name = f"kb_{kb.name.lower().replace(' ', '_').replace('-', '_')}"
        
        # 3. 检查collection名称是否已被使用
        existing_collection = db.query(KnowledgeBaseModel).filter(
            KnowledgeBaseModel.collection_name == collection_name
        ).first()
        
        if existing_collection:
            raise HTTPException(
                status_code=400, 
                detail=f"Collection名称冲突：{collection_name} 已被知识库 '{existing_collection.name}' 使用"
            )
        
        # 4. 获取向量数据库配置
        vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
        
        if not vector_db_config:
            raise HTTPException(
                status_code=400,
                detail="未找到向量数据库提供商配置，请先配置向量数据库"
            )
        
        # 5. 获取 Embedding 配置以确定向量维度
        embedding_config = get_default_embedding_provider(db)
        
        if not embedding_config:
            logger.warning(f"未找到 Embedding 提供商配置，将使用本地模型默认维度: 512")
            dimension = 512
        else:
            dimension = embedding_config.get("dimension", 1536)
            logger.info(f"使用 Embedding 配置: {embedding_config.get('name')}, 维度: {dimension}")
        
        # 6. 创建向量数据库集合
        rag_engine = RAGEngine(vector_db_provider_config=vector_db_config)
        
        # 7. 智能检查并处理已存在的 collection
        collection_exists = False
        try:
            collection_exists = rag_engine.collection_exists(collection_name)
        except Exception as e:
            logger.warning(f"检查 collection 存在性时出错: {e}")
            # 如果是403错误，说明API key有问题
            if "403" in str(e) or "Forbidden" in str(e) or "forbidden" in str(e):
                raise HTTPException(
                    status_code=403,
                    detail="向量数据库访问被拒绝，请检查API密钥权限是否正确"
                )
            # 其他错误，尝试继续
        
        if collection_exists:
            logger.warning(f"⚠️ 检测到孤儿 collection '{collection_name}' 存在于云端但本地数据库没有记录")
            # 尝试删除孤儿collection
            try:
                logger.info(f"正在删除孤儿 collection: {collection_name}")
                rag_engine.delete_collection(collection_name)
                logger.info(f"✅ 成功删除孤儿 collection: {collection_name}")
            except Exception as del_e:
                logger.error(f"删除孤儿 collection 失败: {del_e}")
                raise HTTPException(
                    status_code=409,
                    detail=f"Collection '{collection_name}' 已存在于云端但无法删除。请先手动清理或使用同步功能。错误: {str(del_e)}"
                )
        
        # 8. 创建新的 collection
        try:
            rag_engine.create_collection(
                collection_name=collection_name,
                dimension=dimension,
                metadata={"description": kb.description or "", "kb_name": kb.name}
            )
            logger.info(f"✅ 创建向量数据库集合成功: {collection_name}")
        except Exception as create_e:
            logger.error(f"创建 collection 失败: {create_e}", exc_info=True)
            # 更详细的错误信息
            error_msg = str(create_e)
            if "403" in error_msg or "Forbidden" in error_msg or "forbidden" in error_msg:
                raise HTTPException(
                    status_code=403,
                    detail="向量数据库访问被拒绝。请检查：1) API密钥是否正确 2) API密钥是否有创建collection的权限"
                )
            elif "401" in error_msg or "Unauthorized" in error_msg:
                raise HTTPException(
                    status_code=401,
                    detail="向量数据库认证失败，请检查API密钥是否正确"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"创建向量数据库集合失败: {error_msg}"
                )
        
        # 9. 创建数据库记录
        knowledge_base = KnowledgeBaseModel(
            name=kb.name,
            description=kb.description,
            collection_name=collection_name,
            vector_db_provider_id=kb.vector_db_provider_id
        )
        db.add(knowledge_base)
        db.commit()
        db.refresh(knowledge_base)
        
        logger.info(f"✅ 创建知识库成功: {kb.name} (Collection: {collection_name})")
        
        return {
            "id": knowledge_base.id,
            "name": knowledge_base.name,
            "description": knowledge_base.description,
            "collection_name": collection_name,
            "document_count": 0,
            "created_at": knowledge_base.created_at.isoformat()
        }
        
    except HTTPException:
        # 直接抛出 HTTPException
        raise
    except Exception as e:
        logger.error(f"创建知识库失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"创建知识库失败: {str(e)}")


@router.get("/")
@router.get("")
async def list_knowledge_bases(
    db: Session = Depends(get_db)
):
    """获取知识库列表"""
    knowledge_bases = db.query(KnowledgeBaseModel).all()
    
    return {
        "total": len(knowledge_bases),
        "knowledge_bases": [
            {
                "id": kb.id,
                "name": kb.name,
                "description": kb.description,
                "document_count": kb.document_count,
                "vector_db_provider_id": kb.vector_db_provider_id,
                "collection_name": kb.collection_name,
                "created_at": kb.created_at.isoformat() if kb.created_at else None,
                "updated_at": kb.updated_at.isoformat() if kb.updated_at else None,
            }
            for kb in knowledge_bases
        ]
    }


@router.get("/{kb_id}")
async def get_knowledge_base(
    kb_id: int,
    db: Session = Depends(get_db)
):
    """获取知识库详情"""
    kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 获取向量数据库配置
    vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
    
    # 获取统计信息
    rag_engine = RAGEngine(vector_db_provider_config=vector_db_config)
    stats = rag_engine.get_collection_stats(kb.collection_name)
    
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "document_count": kb.document_count,
        "vector_count": stats.get("document_count", 0),
        "vector_db_provider_id": kb.vector_db_provider_id,
        "created_at": kb.created_at.isoformat() if kb.created_at else None,
        "updated_at": kb.updated_at.isoformat() if kb.updated_at else None,
    }


@router.post("/{kb_id}/texts")
async def add_texts_to_kb(
    kb_id: int,
    request: AddTextRequest,
    db: Session = Depends(get_db)
):
    """
    手动添加文本到知识库
    """
    from app.models.database import KnowledgeBaseText
    
    try:
        # 获取知识库
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 获取默认 Embedding 提供商
        embedding_config = get_default_embedding_provider(db)
        
        # 如果没有配置，使用本地模型
        if not embedding_config:
            logger.warning(f"未找到 Embedding 提供商配置，将使用本地模型")
            embedding_config = {
                "provider_type": "local",
                "model_name": "BAAI/bge-small-zh-v1.5",
                "dimension": 512
            }
        
        # 获取向量数据库配置
        vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
        
        # 初始化 RAGEngine
        rag_engine = RAGEngine(
            embedding_provider_config=embedding_config,
            vector_db_provider_config=vector_db_config
        )
        
        # 准备元数据
        metadatas = [
            {
                **{"source": "manual_text", "kb_id": kb_id},
                **(request.metadata or {})
            }
            for _ in request.texts
        ]
        
        # 添加到向量数据库（返回向量ID）
        vector_ids = await rag_engine.add_documents(
            collection_name=kb.collection_name,
            documents=request.texts,
            metadatas=metadatas
        )
        
        # 保存文本到数据库
        text_records = []
        for i, text in enumerate(request.texts):
            text_record = KnowledgeBaseText(
                knowledge_base_id=kb_id,
                content=text,
                vector_id=vector_ids[i] if vector_ids else None,
                text_metadata=request.metadata,
                source="manual",
                char_count=len(text),
                word_count=len(text.split())
            )
            db.add(text_record)
            text_records.append(text_record)
        
        db.commit()
        
        logger.info(f"✅ 手动添加 {len(request.texts)} 条文本到知识库: {kb.name}")
        
        return {
            "message": f"成功添加 {len(request.texts)} 条文本到知识库",
            "knowledge_base_id": kb_id,
            "texts_added": len(request.texts),
            "text_ids": [t.id for t in text_records]
        }
        
    except Exception as e:
        logger.error(f"添加文本到知识库失败: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{kb_id}/documents/{document_id}")
async def add_document_to_kb(
    kb_id: int,
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    将文档添加到知识库（向量化）
    """
    try:
        # 获取知识库
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 获取文档
        doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        # 处理文档（如果还未处理）
        if doc.status != "completed":
            file_path = Path(doc.original_path)
            result = DocumentProcessor.process_document(file_path)
            chunks = result["chunks"]
            
            doc.status = "completed"
            doc.chunk_count = len(chunks)
            doc.metadata = result["metadata"]
        else:
            # 重新读取并分块
            file_path = Path(doc.original_path)
            result = DocumentProcessor.process_document(file_path)
            chunks = result["chunks"]
        
        # 获取默认 Embedding 提供商
        embedding_config = get_default_embedding_provider(db)
        
        # 获取向量数据库配置
        vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
        
        # 初始化 RAGEngine
        rag_engine = RAGEngine(
            embedding_provider_config=embedding_config,
            vector_db_provider_config=vector_db_config
        )
        
        # 添加到向量数据库
        metadatas = [
            {
                "document_id": doc.id,
                "filename": doc.filename,
                "chunk_index": i
            }
            for i in range(len(chunks))
        ]
        
        await rag_engine.add_documents(
            collection_name=kb.collection_name,
            documents=chunks,
            metadatas=metadatas
        )
        
        # 更新关联和计数
        doc.knowledge_base_id = kb_id
        kb.document_count = db.query(DocumentModel).filter(
            DocumentModel.knowledge_base_id == kb_id
        ).count()
        
        db.commit()
        
        logger.info(f"✅ 文档已添加到知识库: {doc.filename} -> {kb.name}")
        
        return {
            "message": "文档已添加到知识库",
            "document_id": doc.id,
            "knowledge_base_id": kb_id,
            "chunks_added": len(chunks)
        }
        
    except Exception as e:
        logger.error(f"添加文档到知识库失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{kb_id}/query")
async def query_knowledge_base(
    kb_id: int,
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    """
    查询知识库（RAG 检索）
    """
    try:
        # 获取知识库
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 优先使用知识库创建时的 Embedding 提供商（保证维度一致）
        embedding_config = None
        if kb.embedding_provider_id:
            provider = db.query(EmbeddingProvider).filter(
                EmbeddingProvider.id == kb.embedding_provider_id
            ).first()
            if provider:
                embedding_config = {
                    "name": provider.name,
                    "provider_type": provider.provider_type,
                    "model_name": provider.model_name,
                    "api_key": provider.api_key,
                    "base_url": provider.base_url,
                    "dimension": provider.dimension
                }
                logger.info(f"📌 使用知识库关联的 Embedding: {provider.name} (维度: {provider.dimension})")
        
        # 如果知识库没有关联，使用默认提供商
        if not embedding_config:
            embedding_config = get_default_embedding_provider(db)
            if embedding_config:
                logger.info(f"使用默认 Embedding 提供商")
        
        # 如果仍然没有配置，使用本地模型
        if not embedding_config:
            logger.warning(f"未找到 Embedding 提供商配置，将使用本地模型")
            embedding_config = {
                "provider_type": "local",
                "model_name": "BAAI/bge-small-zh-v1.5",
                "dimension": 512
            }
        
        # 获取向量数据库配置
        vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
        
        # 初始化 RAGEngine
        rag_engine = RAGEngine(
            embedding_provider_config=embedding_config,
            vector_db_provider_config=vector_db_config
        )
        
        # 检索
        results = await rag_engine.query(
            collection_name=kb.collection_name,
            query_text=request.query,
            n_results=request.n_results
        )
        
        return {
            "query": request.query,
            "results": [
                {
                    "content": doc,
                    "distance": dist,
                    "metadata": meta
                }
                for doc, dist, meta in zip(
                    results["documents"],
                    results["distances"],
                    results["metadatas"]
                )
            ]
        }
        
    except Exception as e:
        logger.error(f"查询知识库失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{kb_id}/texts")
async def list_texts(
    kb_id: int,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取知识库中手动添加的文本列表
    支持搜索功能
    """
    from app.models.database import KnowledgeBaseText
    
    # 验证知识库存在
    kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 构建基础查询
    query = db.query(KnowledgeBaseText).filter(
        KnowledgeBaseText.knowledge_base_id == kb_id
    )
    
    # 添加搜索条件
    if search:
        query = query.filter(KnowledgeBaseText.content.contains(search))
    
    # 获取总数
    total = query.count()
    
    # 查询文本（分页）
    texts = query.order_by(
        KnowledgeBaseText.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return {
        "knowledge_base_id": kb_id,
        "total": total,
        "texts": [
            {
                "id": text.id,
                "content": text.content,
                "vector_id": text.vector_id,
                "metadata": text.text_metadata,
                "source": text.source,
                "char_count": text.char_count,
                "word_count": text.word_count,
                "created_at": text.created_at.isoformat() if text.created_at else None,
                "updated_at": text.updated_at.isoformat() if text.updated_at else None
            }
            for text in texts
        ]
    }


class UpdateTextRequest(BaseModel):
    content: str


@router.put("/{kb_id}/texts/{text_id}")
async def update_text(
    kb_id: int,
    text_id: int,
    request: UpdateTextRequest,
    db: Session = Depends(get_db)
):
    """
    更新文本内容并同步到向量数据库
    """
    from app.models.database import KnowledgeBaseText
    
    content = request.content
    
    # 获取知识库
    kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 获取文本记录
    text = db.query(KnowledgeBaseText).filter(
        KnowledgeBaseText.id == text_id,
        KnowledgeBaseText.knowledge_base_id == kb_id
    ).first()
    
    if not text:
        raise HTTPException(status_code=404, detail="文本不存在")
    
    try:
        # 获取配置
        embedding_config = get_default_embedding_provider(db)
        if not embedding_config:
            embedding_config = {
                "provider_type": "local",
                "model_name": "BAAI/bge-small-zh-v1.5",
                "dimension": 512
            }
        
        vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
        
        # 初始化 RAGEngine
        rag_engine = RAGEngine(
            embedding_provider_config=embedding_config,
            vector_db_provider_config=vector_db_config
        )
        
        # 如果有旧的向量ID，先删除旧向量
        if text.vector_id:
            try:
                await rag_engine.vector_db.delete_documents(
                    collection_name=kb.collection_name,
                    ids=[text.vector_id]
                )
                logger.info(f"删除旧向量: {text.vector_id}")
            except Exception as e:
                logger.warning(f"删除旧向量失败: {e}")
        
        # 添加新向量
        metadatas = [{
            "source": "manual_text",
            "kb_id": kb_id,
            "text_id": text_id
        }]
        
        vector_ids = await rag_engine.add_documents(
            collection_name=kb.collection_name,
            documents=[content],
            metadatas=metadatas
        )
        
        # 更新数据库记录
        text.content = content
        text.vector_id = vector_ids[0] if vector_ids else None
        text.char_count = len(content)
        text.word_count = len(content.split())
        
        db.commit()
        db.refresh(text)
        
        logger.info(f"✅ 更新文本: {text_id}, 新向量ID: {text.vector_id}")
        
        return {
            "message": "文本更新成功",
            "text": {
                "id": text.id,
                "content": text.content,
                "vector_id": text.vector_id,
                "char_count": text.char_count,
                "word_count": text.word_count,
                "updated_at": text.updated_at.isoformat() if text.updated_at else None
            }
        }
        
    except Exception as e:
        logger.error(f"更新文本失败: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{kb_id}/texts/{text_id}")
async def delete_text(
    kb_id: int,
    text_id: int,
    db: Session = Depends(get_db)
):
    """
    删除文本并从向量数据库中移除
    """
    from app.models.database import KnowledgeBaseText
    
    # 获取知识库
    kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 获取文本记录
    text = db.query(KnowledgeBaseText).filter(
        KnowledgeBaseText.id == text_id,
        KnowledgeBaseText.knowledge_base_id == kb_id
    ).first()
    
    if not text:
        raise HTTPException(status_code=404, detail="文本不存在")
    
    try:
        # 从向量数据库中删除
        if text.vector_id:
            vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
            rag_engine = RAGEngine(vector_db_provider_config=vector_db_config)
            
            try:
                await rag_engine.vector_db.delete_documents(
                    collection_name=kb.collection_name,
                    ids=[text.vector_id]
                )
                logger.info(f"从向量数据库删除: {text.vector_id}")
            except Exception as e:
                logger.warning(f"从向量数据库删除失败: {e}")
        
        # 从数据库删除
        db.delete(text)
        db.commit()
        
        logger.info(f"✅ 删除文本: {text_id}")
        
        return {"message": "文本删除成功"}
        
    except Exception as e:
        logger.error(f"删除文本失败: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{kb_id}/texts/smart-split")
async def smart_split_text(
    kb_id: int,
    request: SmartSplitRequest,
    db: Session = Depends(get_db)
):
    """
    智能文本拆分预览
    
    使用LLM或规则对长文本进行智能拆分，返回拆分预览结果供用户确认
    """
    try:
        # 验证知识库存在
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 如果需要使用LLM但没有提供API密钥，从multi_model_engine获取
        api_key = request.api_key
        base_url = request.base_url
        
        if request.strategy in ['semantic', 'smart'] and not api_key:
            # 从multi_model_engine获取已配置的API密钥
            from app.core.multi_model_engine import multi_model_engine
            
            if request.provider and request.provider in multi_model_engine.api_keys:
                api_key = multi_model_engine.api_keys[request.provider]
                logger.info(f"使用已配置的 {request.provider} API密钥")
            else:
                # 尝试从数据库获取默认的AI提供商配置
                embedding_provider = db.query(EmbeddingProvider).filter(
                    EmbeddingProvider.provider_type == "openai",
                    EmbeddingProvider.is_default == True
                ).first()
                
                if embedding_provider and embedding_provider.api_key:
                    api_key = embedding_provider.api_key
                    base_url = embedding_provider.base_url or base_url
                    logger.info(f"使用数据库中的默认 OpenAI API密钥")
                else:
                    raise HTTPException(
                        status_code=400, 
                        detail="未找到可用的AI提供商配置，请先在系统中配置AI Provider"
                    )
        
        # 导入文本拆分器
        from app.core.text_splitter import TextSplitter
        
        splitter = TextSplitter()
        
        # 执行拆分
        chunks, metadata = await splitter.split(
            text=request.text,
            strategy=request.strategy,
            provider=request.provider,
            model=request.model,
            api_key=api_key,
            base_url=base_url,
            chunk_size=request.chunk_size,
            overlap=request.overlap,
            min_chars=request.min_chars
        )
        
        logger.info(f"✅ 智能拆分完成: 策略={request.strategy}, 生成 {len(chunks)} 个片段")
        
        return {
            "success": True,
            "knowledge_base_id": kb_id,
            "chunks": chunks,
            "metadata": metadata,
            "message": f"成功拆分为 {len(chunks)} 个片段"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"智能拆分失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"智能拆分失败: {str(e)}")


@router.post("/{kb_id}/texts/batch")
async def batch_add_texts(
    kb_id: int,
    request: BatchAddTextRequest,
    db: Session = Depends(get_db)
):
    """
    批量添加文本片段到知识库
    
    用于添加经过智能拆分和用户确认的文本片段
    """
    from app.models.database import KnowledgeBaseText
    
    try:
        # 获取知识库
        kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        if not request.chunks:
            raise HTTPException(status_code=400, detail="文本片段列表为空")
        
        # 提取文本内容
        texts = [chunk.get("content", "") for chunk in request.chunks]
        
        # 获取默认 Embedding 提供商
        embedding_config = get_default_embedding_provider(db)
        
        # 如果没有配置，使用本地模型
        if not embedding_config:
            logger.warning(f"未找到 Embedding 提供商配置，将使用本地模型")
            embedding_config = {
                "provider_type": "local",
                "model_name": "BAAI/bge-small-zh-v1.5",
                "dimension": 512
            }
        
        # 获取向量数据库配置
        vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
        
        # 初始化 RAGEngine
        rag_engine = RAGEngine(
            embedding_provider_config=embedding_config,
            vector_db_provider_config=vector_db_config
        )
        
        # 准备元数据
        metadatas = []
        for i, chunk in enumerate(request.chunks):
            chunk_metadata = {
                "source": "smart_split",
                "kb_id": kb_id,
                "chunk_index": i,
                "strategy": chunk.get("metadata", {}).get("strategy", "unknown"),
            }
            # 如果有标题和摘要，也添加进去
            if chunk.get("title"):
                chunk_metadata["title"] = chunk["title"]
            if chunk.get("summary"):
                chunk_metadata["summary"] = chunk["summary"]
            
            # 合并用户提供的元数据
            if request.metadata:
                chunk_metadata.update(request.metadata)
            
            metadatas.append(chunk_metadata)
        
        # 添加到向量数据库（返回向量ID）
        vector_ids = await rag_engine.add_documents(
            collection_name=kb.collection_name,
            documents=texts,
            metadatas=metadatas
        )
        
        # 保存文本到数据库
        text_records = []
        for i, (chunk, text) in enumerate(zip(request.chunks, texts)):
            text_record = KnowledgeBaseText(
                knowledge_base_id=kb_id,
                content=text,
                vector_id=vector_ids[i] if vector_ids else None,
                text_metadata={
                    **chunk.get("metadata", {}),
                    "title": chunk.get("title"),
                    "summary": chunk.get("summary")
                },
                source="smart_split",
                char_count=len(text),
                word_count=len(text.split())
            )
            db.add(text_record)
            text_records.append(text_record)
        
        db.commit()
        
        logger.info(f"✅ 批量添加 {len(texts)} 条文本到知识库: {kb.name}")
        
        return {
            "success": True,
            "message": f"成功添加 {len(texts)} 条文本到知识库",
            "knowledge_base_id": kb_id,
            "texts_added": len(texts),
            "text_ids": [t.id for t in text_records]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量添加文本失败: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"批量添加文本失败: {str(e)}")


@router.delete("/{kb_id}")
async def delete_knowledge_base(
    kb_id: int,
    db: Session = Depends(get_db)
):
    """删除知识库"""
    kb = db.query(KnowledgeBaseModel).filter(KnowledgeBaseModel.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    try:
        # 获取向量数据库配置
        vector_db_config = get_vector_db_provider_config(db, kb.vector_db_provider_id)
        
        # 删除向量数据库集合
        rag_engine = RAGEngine(vector_db_provider_config=vector_db_config)
        rag_engine.delete_collection(kb.collection_name)
    except Exception as e:
        logger.warning(f"删除向量数据库集合失败: {e}")
    
    # 删除数据库记录
    db.delete(kb)
    db.commit()
    
    return {"message": "知识库删除成功"}

