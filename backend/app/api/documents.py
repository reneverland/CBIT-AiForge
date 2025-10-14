"""
文档管理 API
"""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import shutil
from datetime import datetime
from loguru import logger

from app.models.database import (
    get_db, 
    Document as DocumentModel,
    EmbeddingProvider,
    VectorDBProvider,
    KnowledgeBase as KnowledgeBaseModel
)
from app.core.document_processor import DocumentProcessor
from app.core.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    knowledge_base_id: Optional[int] = Form(None),
    auto_process: bool = Form(True),
    use_qa_format: bool = Form(False),
    chunk_mode: str = Form("auto"),  # 新增：分块模式 (auto, faq, standard)
    db: Session = Depends(get_db)
):
    """
    上传文档
    
    - 支持格式: PDF, DOCX, XLSX, TXT, MD
    - 自动解析和清洗
    - 如果指定knowledge_base_id，自动添加到知识库并向量化
    """
    try:
        logger.info(f"收到文档上传请求: 文件={file.filename}, knowledge_base_id={knowledge_base_id}, auto_process={auto_process}")
        
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
        
        result = {
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "status": doc.status,
            "message": "文档上传成功"
        }
        
        # 如果指定了知识库且auto_process=True，自动处理并添加到知识库
        if knowledge_base_id and auto_process:
            logger.info(f"开始自动处理: knowledge_base_id={knowledge_base_id}, auto_process={auto_process}")
            try:
                from app.core.rag_engine import RAGEngine
                
                # 获取知识库
                kb = db.query(KnowledgeBaseModel).filter(
                    KnowledgeBaseModel.id == knowledge_base_id
                ).first()
                
                if kb:
                    logger.info(f"找到知识库: {kb.name}, collection_name={kb.collection_name}, vector_db_provider_id={kb.vector_db_provider_id}")
                    # 处理文档
                    doc.status = "processing"
                    db.commit()
                    logger.info(f"开始处理文档: {file_path}, 分块模式: {chunk_mode}")
                    
                    processed_result = DocumentProcessor.process_document(Path(file_path), chunk_mode=chunk_mode)
                    chunks = processed_result["chunks"]
                    actual_mode = processed_result["metadata"].get("chunk_mode", chunk_mode)
                    logger.info(f"文档处理完成，生成 {len(chunks)} 个文本块（模式: {actual_mode}）")
                    
                    # 获取默认 Embedding 提供商配置（用于向量化和QA生成）
                    embedding_config = None
                    try:
                        provider = db.query(EmbeddingProvider).filter(
                            EmbeddingProvider.is_default == True
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
                            logger.info(f"使用默认 Embedding 提供商: {provider.name} ({provider.provider_type})")
                        else:
                            logger.warning("未找到默认 Embedding 提供商，将使用本地模型")
                    except Exception as e:
                        logger.warning(f"获取默认 Embedding 提供商失败: {e}")
                    
                    # 如果启用QA格式，转换文本块为问答对
                    if use_qa_format:
                        try:
                            # 检查是否已经是FAQ格式（通过actual_mode判断）
                            if actual_mode == "faq":
                                logger.info(f"📋 文档已是FAQ格式，包含 {len(chunks)} 个问答对，直接使用无需AI转换")
                                # FAQ格式的chunk已经是Q&A格式，直接使用，无需OpenAI转换
                            else:
                                # 普通文档，需要用OpenAI生成QA对
                                from app.core.qa_generator import QAGenerator
                                
                                # 使用 Embedding 配置中的 OpenAI API 进行 QA 转换
                                qa_api_key = None
                                qa_base_url = None
                                qa_model = "gpt-3.5-turbo"
                                
                                if embedding_config and embedding_config.get('api_key'):
                                    qa_api_key = embedding_config['api_key']
                                    qa_base_url = embedding_config.get('base_url', 'https://api.openai.com/v1')
                                    logger.info(f"🤖 使用 OpenAI API 进行 QA 格式转换")
                                else:
                                    logger.warning("⚠️ 未配置 OpenAI API，无法进行 QA 转换")
                                
                                qa_gen = QAGenerator(
                                    api_key=qa_api_key,
                                    base_url=qa_base_url,
                                    model=qa_model
                                )
                                
                                # 为每个chunk生成问答对
                                qa_chunks = []
                                # 移除20个限制，但对超大文档做适当控制
                                total_chunks = len(chunks)
                                if total_chunks > 100:
                                    logger.warning(f"⚠️ 文档包含 {total_chunks} 个文本块，将处理前100个")
                                    total_chunks = 100
                                logger.info(f"📚 开始为 {total_chunks} 个文本块生成问答对...")
                                
                                for i, chunk in enumerate(chunks[:total_chunks]):
                                    chunk_words = len(chunk.split())
                                    # 根据chunk大小动态调整问题数量
                                    num_questions = min(8, max(3, chunk_words // 100))  # 每100词生成1个问题，最少3个，最多8个
                                    
                                    logger.info(f"  [{i+1}/{total_chunks}] 处理文本块（{chunk_words}词）→ 生成{num_questions}个问答对...")
                                    qa_pairs = await qa_gen.generate_qa_pairs(
                                        chunk,
                                        num_questions=num_questions,
                                        domain="教育招生"
                                    )
                                    
                                    # 将问答对转换为文本格式存储
                                    if qa_pairs:
                                        for qa in qa_pairs:
                                            qa_text = f"Q: {qa['question']}\nA: {qa['answer']}"
                                            qa_chunks.append(qa_text)
                                        logger.info(f"  ✅ 成功生成 {len(qa_pairs)} 个问答对")
                                    else:
                                        logger.warning(f"  ⚠️ 第 {i+1} 个文本块未生成问答对")
                                
                                if qa_chunks:
                                    original_count = len(chunks)
                                    chunks = qa_chunks
                                    logger.info(f"✅ QA格式转换完成：{original_count} 个文本块 → {len(chunks)} 个问答对")
                                else:
                                    logger.warning("⚠️ QA格式转换未生成任何问答对，使用原始chunks")
                        except Exception as e:
                            logger.error(f"❌ QA格式转换失败，使用原始chunks: {e}", exc_info=True)
                    
                    # 获取向量数据库配置
                    vector_db_config = None
                    try:
                        if kb.vector_db_provider_id:
                            vdb_provider = db.query(VectorDBProvider).filter(
                                VectorDBProvider.id == kb.vector_db_provider_id
                            ).first()
                            if vdb_provider:
                                vector_db_config = {
                                    "name": vdb_provider.name,
                                    "provider_type": vdb_provider.provider_type,
                                    "host": vdb_provider.host,
                                    "port": vdb_provider.port,
                                    "api_key": vdb_provider.api_key
                                }
                                logger.info(f"使用向量数据库: {vdb_provider.name} ({vdb_provider.provider_type})")
                    except Exception as e:
                        logger.warning(f"获取向量数据库配置失败: {e}")
                    
                    # 向量化并添加到知识库
                    logger.info(f"开始向量化并添加到知识库...")
                    rag_engine = RAGEngine(embedding_config, vector_db_config)
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
                    
                    # 更新文档状态
                    doc.status = "completed"
                    doc.chunk_count = len(chunks)
                    doc.doc_metadata = processed_result["metadata"]
                    doc.processed_at = datetime.utcnow()
                    db.commit()
                    logger.info(f"✅ 文档状态已更新: {file.filename} -> completed ({len(chunks)} chunks)")
                    
                    # 重新查询知识库并更新文档计数
                    kb_refresh = db.query(KnowledgeBaseModel).filter(
                        KnowledgeBaseModel.id == knowledge_base_id
                    ).first()
                    if kb_refresh:
                        kb_refresh.document_count = db.query(DocumentModel).filter(
                            DocumentModel.knowledge_base_id == knowledge_base_id,
                            DocumentModel.status == "completed"
                        ).count()
                        db.commit()
                        logger.info(f"✅ 知识库文档数量已更新: {kb_refresh.name} -> {kb_refresh.document_count} 个文档")
                    
                    result["status"] = "completed"
                    result["chunk_count"] = len(chunks)
                    result["chunk_mode"] = actual_mode
                    result["qa_format_used"] = use_qa_format
                    
                    mode_desc = {
                        "faq": "🎯 FAQ问答格式",
                        "standard": "📄 标准分块",
                        "auto": "🤖 自动识别"
                    }.get(actual_mode, actual_mode)
                    
                    result["message"] = f"✅ 文档上传成功！已自动添加到知识库并向量化\n\n📊 分块信息：\n- 文本块数量：{len(chunks)} 个\n- 分块模式：{mode_desc}\n- QA转换：{'已启用' if use_qa_format else '未启用'}"
                    
                    logger.info(f"✅ 文档已自动添加到知识库: {file.filename} -> {kb.name}")
                else:
                    logger.warning(f"未找到知识库 ID: {knowledge_base_id}")
                    
            except Exception as e:
                error_msg = str(e)
                # 尝试提取更有意义的错误信息
                if 'status' in error_msg and 'error' in error_msg:
                    try:
                        import json
                        # 尝试解析 Qdrant 错误响应
                        if 'Raw response content' in error_msg:
                            json_str = error_msg.split('Raw response content:')[1].strip()
                            error_data = json.loads(json_str.replace("b'", "").replace("'", ""))
                            if 'status' in error_data and 'error' in error_data['status']:
                                error_msg = error_data['status']['error']
                    except:
                        pass
                
                logger.error(f"自动添加到知识库失败: {error_msg}", exc_info=True)
                doc.status = "failed"
                doc.error_message = error_msg
                db.commit()
                result["message"] = f"文档上传成功，但自动添加到知识库失败: {error_msg}"
        else:
            logger.info(f"跳过自动处理: knowledge_base_id={knowledge_base_id}, auto_process={auto_process}")
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        # 尝试提取更有意义的错误信息
        if 'status' in error_msg and 'error' in error_msg:
            try:
                import json
                # 尝试解析 Qdrant 错误响应
                if 'Raw response content' in error_msg:
                    json_str = error_msg.split('Raw response content:')[1].strip()
                    error_data = json.loads(json_str.replace("b'", "").replace("'", ""))
                    if 'status' in error_data and 'error' in error_data['status']:
                        error_msg = error_data['status']['error']
            except:
                pass
        
        logger.error(f"文档上传失败: {error_msg}", exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)


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
@router.get("")
async def list_documents(
    skip: int = 0,
    limit: int = 100,  # 增加默认限制
    knowledge_base_id: int = None,
    db: Session = Depends(get_db)
):
    """获取文档列表"""
    query = db.query(DocumentModel)
    
    if knowledge_base_id:
        query = query.filter(DocumentModel.knowledge_base_id == knowledge_base_id)
    
    # 先获取总数，再分页
    total = query.count()
    documents = query.order_by(DocumentModel.created_at.desc()).offset(skip).limit(limit).all()
    
    logger.info(f"📋 查询文档列表: knowledge_base_id={knowledge_base_id}, 总数={total}, 返回={len(documents)}")
    
    return {
        "total": total,
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "status": doc.status,
                "chunk_count": doc.chunk_count,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "error_message": doc.error_message if doc.status == "failed" else None,
            }
            for doc in documents
        ]
    }


@router.post("/generate-qa-preview")
async def generate_qa_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    生成问答格式预览（用于上传前预览）
    """
    try:
        # 临时保存文件
        temp_path = settings.UPLOAD_DIR / f"temp_{datetime.now().timestamp()}_{file.filename}"
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # 处理文档获取chunks
        processed_result = DocumentProcessor.process_document(Path(temp_path))
        chunks = processed_result["chunks"][:3]  # 只处理前3个chunk作为预览
        
        # 删除临时文件
        temp_path.unlink(missing_ok=True)
        
        if not chunks:
            return {"success": False, "message": "文档处理失败，未提取到文本内容"}
        
        # 获取默认 Embedding 提供商（用于获取OpenAI API配置）
        embedding_provider = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.is_default == True
        ).first()
        
        logger.info(f"🔍 检查Embedding提供商: provider={embedding_provider.name if embedding_provider else 'None'}, has_key={bool(embedding_provider and embedding_provider.api_key and embedding_provider.api_key.strip()) if embedding_provider else False}")
        
        if not embedding_provider or not embedding_provider.api_key or not embedding_provider.api_key.strip():
            # 返回示例预览
            logger.warning("⚠️ 未配置有效的OpenAI API密钥，返回示例预览")
            preview = []
            for i, chunk in enumerate(chunks):
                preview.append({
                    "chunk": chunk[:200] + "..." if len(chunk) > 200 else chunk,
                    "qa_pairs": [
                        {
                            "question": f"示例问题 {i+1}-1（需配置OpenAI API才能生成真实问答对）",
                            "answer": "示例答案..."
                        },
                        {
                            "question": f"示例问题 {i+1}-2（需配置OpenAI API才能生成真实问答对）",
                            "answer": "示例答案..."
                        }
                    ]
                })
            return {
                "success": True,
                "preview": preview,
                "is_mock": True,
                "message": "这是示例预览，配置OpenAI API后可生成真实问答对"
            }
        
        # 使用OpenAI API生成真实问答对
        from app.core.qa_generator import QAGenerator
        
        qa_generator = QAGenerator(
            api_key=embedding_provider.api_key,
            base_url=embedding_provider.base_url or "https://api.openai.com/v1",
            model="gpt-3.5-turbo"
        )
        preview = []
        
        for i, chunk in enumerate(chunks):
            logger.info(f"QA预览：正在为第 {i+1}/{len(chunks)} 个文本块生成问答对...")
            qa_pairs = await qa_generator.generate_qa_pairs(
                chunk,
                num_questions=2,
                domain="通用"
            )
            
            preview.append({
                "chunk": chunk[:200] + "..." if len(chunk) > 200 else chunk,
                "qa_pairs": qa_pairs if qa_pairs else [
                    {"question": f"AI生成失败，使用示例问题 {i+1}", "answer": "示例答案..."}
                ]
            })
            logger.info(f"  生成了 {len(qa_pairs)} 个问答对")
        
        return {
            "success": True,
            "preview": preview,
            "is_mock": False,
            "message": f"成功生成{len(preview)}个文本块的问答对预览"
        }
        
    except Exception as e:
        logger.error(f"生成QA预览失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}")
async def get_document_detail(
    document_id: int,
    db: Session = Depends(get_db)
):
    """获取文档详细信息"""
    try:
        doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        return {
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "status": doc.status,
            "chunk_count": doc.chunk_count,
            "error_message": doc.error_message,
            "doc_metadata": doc.doc_metadata,
            "knowledge_base_id": doc.knowledge_base_id,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "processed_at": doc.processed_at.isoformat() if doc.processed_at else None,
        }
    except Exception as e:
        logger.error(f"获取文档详情失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/chunks")
async def get_document_chunks(
    document_id: int,
    db: Session = Depends(get_db)
):
    """获取文档的切分片段"""
    try:
        doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        # 重新处理文档以获取chunks
        file_path = Path(doc.original_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文档文件不存在")
        
        logger.info(f"📄 正在加载文档chunks: {doc.filename}")
        # 使用auto模式重新处理，自动识别FAQ格式
        processed_result = DocumentProcessor.process_document(file_path, chunk_mode="auto")
        chunks = processed_result["chunks"]
        actual_mode = processed_result["metadata"].get("chunk_mode", "standard")
        
        logger.info(f"✅ 成功加载 {len(chunks)} 个chunks（模式: {actual_mode}）")
        
        return {
            "document_id": doc.id,
            "filename": doc.filename,
            "total_chars": processed_result["metadata"]["char_count"],
            "total_chunks": len(chunks),
            "chunks": [
                {
                    "index": i,
                    "content": chunk,
                    "word_count": len(chunk.split()),
                    "char_count": len(chunk)
                }
                for i, chunk in enumerate(chunks)
            ]
        }
    except Exception as e:
        logger.error(f"获取文档切分片段失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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

