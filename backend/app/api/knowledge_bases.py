"""
知识库管理 API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from loguru import logger

from app.models.database import get_db, KnowledgeBase as KnowledgeBaseModel, Document as DocumentModel
from app.core.rag_engine import RAGEngine
from app.core.document_processor import DocumentProcessor
from pathlib import Path

router = APIRouter()
rag_engine = RAGEngine()


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None


class QueryRequest(BaseModel):
    query: str
    n_results: int = 3


@router.post("/")
async def create_knowledge_base(
    kb: KnowledgeBaseCreate,
    db: Session = Depends(get_db)
):
    """
    创建知识库
    """
    try:
        # 检查名称是否已存在
        existing = db.query(KnowledgeBaseModel).filter(
            KnowledgeBaseModel.name == kb.name
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="知识库名称已存在")
        
        # 生成 collection 名称
        collection_name = f"kb_{kb.name.lower().replace(' ', '_')}"
        
        # 创建 ChromaDB 集合
        rag_engine.create_collection(
            collection_name=collection_name,
            metadata={"description": kb.description or ""}
        )
        
        # 创建数据库记录
        knowledge_base = KnowledgeBaseModel(
            name=kb.name,
            description=kb.description,
            collection_name=collection_name
        )
        db.add(knowledge_base)
        db.commit()
        db.refresh(knowledge_base)
        
        logger.info(f"✅ 创建知识库: {kb.name}")
        
        return {
            "id": knowledge_base.id,
            "name": knowledge_base.name,
            "description": knowledge_base.description,
            "document_count": 0,
            "created_at": knowledge_base.created_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"创建知识库失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
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
    
    # 获取统计信息
    stats = rag_engine.get_collection_stats(kb.collection_name)
    
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "document_count": kb.document_count,
        "vector_count": stats.get("document_count", 0),
        "created_at": kb.created_at.isoformat() if kb.created_at else None,
        "updated_at": kb.updated_at.isoformat() if kb.updated_at else None,
    }


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
        
        # 添加到向量数据库
        metadatas = [
            {
                "document_id": doc.id,
                "filename": doc.filename,
                "chunk_index": i
            }
            for i in range(len(chunks))
        ]
        
        rag_engine.add_documents(
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
        
        # 检索
        results = rag_engine.query(
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
        # 删除 ChromaDB 集合
        rag_engine.delete_collection(kb.collection_name)
    except Exception as e:
        logger.warning(f"删除 ChromaDB 集合失败: {e}")
    
    # 删除数据库记录
    db.delete(kb)
    db.commit()
    
    return {"message": "知识库删除成功"}

