"""
文档管理 API
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
import shutil
from datetime import datetime
from loguru import logger

from app.models.database import get_db, Document as DocumentModel
from app.core.document_processor import DocumentProcessor
from app.core.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    knowledge_base_id: int = None,
    db: Session = Depends(get_db)
):
    """
    上传文档
    
    - 支持格式: PDF, DOCX, XLSX, TXT, MD
    - 自动解析和清洗
    """
    try:
        # 检查文件大小
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制 ({settings.MAX_UPLOAD_SIZE_MB}MB)"
            )
        
        # 保存文件
        file_path = settings.UPLOAD_DIR / f"{datetime.now().timestamp()}_{file.filename}"
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 获取文件类型
        file_type = file_path.suffix.lower()
        
        # 创建数据库记录
        doc = DocumentModel(
            filename=file.filename,
            original_path=str(file_path),
            file_type=file_type,
            file_size=file_size,
            knowledge_base_id=knowledge_base_id,
            status="uploaded"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        logger.info(f"✅ 文档上传成功: {file.filename}")
        
        return {
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "status": doc.status,
            "message": "文档上传成功，可以开始处理"
        }
        
    except Exception as e:
        logger.error(f"文档上传失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/process")
async def process_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    处理文档（解析、清洗、分块）
    """
    try:
        # 获取文档记录
        doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        # 更新状态
        doc.status = "processing"
        db.commit()
        
        # 处理文档
        file_path = Path(doc.original_path)
        result = DocumentProcessor.process_document(file_path)
        
        # 更新记录
        doc.status = "completed"
        doc.chunk_count = len(result["chunks"])
        doc.metadata = result["metadata"]
        doc.processed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"✅ 文档处理成功: {doc.filename}")
        
        return {
            "id": doc.id,
            "filename": doc.filename,
            "status": doc.status,
            "chunk_count": doc.chunk_count,
            "chunks": result["chunks"],
            "metadata": result["metadata"]
        }
        
    except Exception as e:
        # 更新失败状态
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()
        
        logger.error(f"文档处理失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    knowledge_base_id: int = None,
    db: Session = Depends(get_db)
):
    """获取文档列表"""
    query = db.query(DocumentModel)
    
    if knowledge_base_id:
        query = query.filter(DocumentModel.knowledge_base_id == knowledge_base_id)
    
    documents = query.offset(skip).limit(limit).all()
    
    return {
        "total": query.count(),
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "status": doc.status,
                "chunk_count": doc.chunk_count,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
            for doc in documents
        ]
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """删除文档"""
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    # 删除文件
    try:
        Path(doc.original_path).unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"删除文件失败: {e}")
    
    # 删除数据库记录
    db.delete(doc)
    db.commit()
    
    return {"message": "文档删除成功"}

