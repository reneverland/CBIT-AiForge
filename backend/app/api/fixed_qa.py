"""
固定Q&A对管理API
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger
import json
import csv
import io
from datetime import datetime
import docx
import PyPDF2

from app.models.database import get_db, FixedQAPair, Application, EmbeddingProvider
from app.core.embedding_engine import embedding_engine
from app.core.multi_model_engine import multi_model_engine

router = APIRouter()


# Pydantic模型
class FixedQACreate(BaseModel):
    question: str
    answer: str
    keywords: Optional[List[str]] = None
    category: Optional[str] = None
    priority: int = 0


class FixedQABatchCreate(BaseModel):
    qa_pairs: List[FixedQACreate]


class FixedQAUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    keywords: Optional[List[str]] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class FixedQASearchRequest(BaseModel):
    query: str
    top_k: int = 5
    threshold: float = 0.75


# API端点
@router.get("/")
@router.get("")
async def list_fixed_qa(
    application_id: int,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """列出应用的固定Q&A对"""
    # 验证应用是否存在
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 构建查询
    query = db.query(FixedQAPair).filter(FixedQAPair.application_id == application_id)
    
    if category:
        query = query.filter(FixedQAPair.category == category)
    if is_active is not None:
        query = query.filter(FixedQAPair.is_active == is_active)
    
    total = query.count()
    qa_pairs = query.order_by(FixedQAPair.priority.desc()).offset(skip).limit(limit).all()
    
    # 获取所有分类
    categories = db.query(FixedQAPair.category).filter(
        FixedQAPair.application_id == application_id,
        FixedQAPair.category.isnot(None)
    ).distinct().all()
    categories = [c[0] for c in categories]
    
    return {
        "total": total,
        "categories": categories,
        "qa_pairs": [
            {
                "id": qa.id,
                "question": qa.question,
                "answer": qa.answer,
                "keywords": qa.keywords,
                "category": qa.category,
                "priority": qa.priority,
                "is_active": qa.is_active,
                "hit_count": qa.hit_count,
                "last_hit_at": qa.last_hit_at.isoformat() if qa.last_hit_at else None,
                "created_at": qa.created_at.isoformat()
            }
            for qa in qa_pairs
        ]
    }


@router.post("/", status_code=201)
@router.post("", status_code=201)
async def create_fixed_qa(
    application_id: int,
    qa_data: FixedQACreate,
    db: Session = Depends(get_db)
):
    """创建单个固定Q&A对"""
    # 验证应用是否存在
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 生成问题的embedding
    embedding_vector = None
    try:
        # 获取默认embedding提供商
        default_provider = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.is_default == True
        ).first()
        
        if default_provider:
            provider_config = {
                "provider_type": default_provider.provider_type,
                "model_name": default_provider.model_name,
                "api_key": default_provider.api_key,
                "base_url": default_provider.base_url
            }
            vector = await embedding_engine.embed_text(qa_data.question, provider_config)
            embedding_vector = vector
            logger.info(f"✅ 生成问题embedding: 维度 {len(vector)}")
    except Exception as e:
        logger.warning(f"生成embedding失败: {e}，将不使用语义匹配")
    
    # 创建Q&A对
    db_qa = FixedQAPair(
        application_id=application_id,
        question=qa_data.question,
        answer=qa_data.answer,
        keywords=qa_data.keywords,
        embedding_vector=embedding_vector,
        category=qa_data.category,
        priority=qa_data.priority
    )
    
    db.add(db_qa)
    db.commit()
    db.refresh(db_qa)
    
    logger.info(f"✅ 创建固定Q&A: {qa_data.question[:50]}...")
    
    return {
        "id": db_qa.id,
        "question": db_qa.question,
        "message": "创建成功"
    }


@router.post("/batch", status_code=201)
@router.post("/batch/", status_code=201)
async def create_batch_fixed_qa(
    application_id: int,
    batch_data: FixedQABatchCreate,
    db: Session = Depends(get_db)
):
    """批量创建固定Q&A对"""
    # 验证应用是否存在
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 获取默认embedding提供商
    default_provider = db.query(EmbeddingProvider).filter(
        EmbeddingProvider.is_default == True
    ).first()
    
    provider_config = None
    if default_provider:
        provider_config = {
            "provider_type": default_provider.provider_type,
            "model_name": default_provider.model_name,
            "api_key": default_provider.api_key,
            "base_url": default_provider.base_url
        }
    
    # 批量生成embeddings
    questions = [qa.question for qa in batch_data.qa_pairs]
    embeddings = []
    
    if provider_config:
        try:
            embeddings = await embedding_engine.embed_texts(questions, provider_config)
            logger.info(f"✅ 批量生成embedding: {len(embeddings)}个")
        except Exception as e:
            logger.warning(f"批量生成embedding失败: {e}")
            embeddings = [None] * len(questions)
    else:
        embeddings = [None] * len(questions)
    
    # 批量创建
    created_count = 0
    for qa_data, embedding in zip(batch_data.qa_pairs, embeddings):
        db_qa = FixedQAPair(
            application_id=application_id,
            question=qa_data.question,
            answer=qa_data.answer,
            keywords=qa_data.keywords,
            embedding_vector=embedding,
            category=qa_data.category,
            priority=qa_data.priority
        )
        db.add(db_qa)
        created_count += 1
    
    db.commit()
    
    logger.info(f"✅ 批量创建固定Q&A: {created_count}条")
    
    return {
        "created_count": created_count,
        "message": "批量创建成功"
    }


@router.post("/import")
@router.post("/import/")
async def import_fixed_qa(
    application_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """从文件导入固定Q&A对（支持CSV和JSON）"""
    # 验证应用是否存在
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 读取文件内容
    content = await file.read()
    
    qa_pairs = []
    
    try:
        # 尝试解析为JSON
        if file.filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, list):
                for item in data:
                    qa_pairs.append(FixedQACreate(
                        question=item.get('question', ''),
                        answer=item.get('answer', ''),
                        keywords=item.get('keywords'),
                        category=item.get('category'),
                        priority=item.get('priority', 0)
                    ))
        
        # 尝试解析为CSV
        elif file.filename.endswith('.csv'):
            csv_content = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            for row in csv_reader:
                keywords = row.get('keywords', '').split(',') if row.get('keywords') else None
                qa_pairs.append(FixedQACreate(
                    question=row.get('question', ''),
                    answer=row.get('answer', ''),
                    keywords=[k.strip() for k in keywords] if keywords else None,
                    category=row.get('category'),
                    priority=int(row.get('priority', 0))
                ))
        else:
            raise HTTPException(status_code=400, detail="不支持的文件格式，请使用JSON或CSV")
        
    except Exception as e:
        logger.error(f"解析文件失败: {e}")
        raise HTTPException(status_code=400, detail=f"解析文件失败: {str(e)}")
    
    if not qa_pairs:
        raise HTTPException(status_code=400, detail="文件中没有有效的Q&A对")
    
    # 批量创建
    batch_result = await create_batch_fixed_qa(
        application_id,
        FixedQABatchCreate(qa_pairs=qa_pairs),
        db
    )
    
    logger.info(f"✅ 从文件导入固定Q&A: {batch_result['created_count']}条")
    
    return batch_result


@router.get("/{qa_id}")
async def get_fixed_qa(
    application_id: int,
    qa_id: int,
    db: Session = Depends(get_db)
):
    """获取固定Q&A详情"""
    qa = db.query(FixedQAPair).filter(
        FixedQAPair.id == qa_id,
        FixedQAPair.application_id == application_id
    ).first()
    
    if not qa:
        raise HTTPException(status_code=404, detail="Q&A对不存在")
    
    return {
        "id": qa.id,
        "question": qa.question,
        "answer": qa.answer,
        "keywords": qa.keywords,
        "category": qa.category,
        "priority": qa.priority,
        "is_active": qa.is_active,
        "hit_count": qa.hit_count,
        "last_hit_at": qa.last_hit_at.isoformat() if qa.last_hit_at else None,
        "has_embedding": qa.embedding_vector is not None,
        "created_at": qa.created_at.isoformat(),
        "updated_at": qa.updated_at.isoformat()
    }


@router.put("/{qa_id}")
async def update_fixed_qa(
    application_id: int,
    qa_id: int,
    qa_update: FixedQAUpdate,
    db: Session = Depends(get_db)
):
    """更新固定Q&A"""
    qa = db.query(FixedQAPair).filter(
        FixedQAPair.id == qa_id,
        FixedQAPair.application_id == application_id
    ).first()
    
    if not qa:
        raise HTTPException(status_code=404, detail="Q&A对不存在")
    
    # 如果问题被修改，重新生成embedding
    if qa_update.question and qa_update.question != qa.question:
        try:
            default_provider = db.query(EmbeddingProvider).filter(
                EmbeddingProvider.is_default == True
            ).first()
            
            if default_provider:
                provider_config = {
                    "provider_type": default_provider.provider_type,
                    "model_name": default_provider.model_name,
                    "api_key": default_provider.api_key,
                    "base_url": default_provider.base_url
                }
                vector = await embedding_engine.embed_text(qa_update.question, provider_config)
                qa.embedding_vector = vector
                logger.info(f"✅ 重新生成问题embedding")
        except Exception as e:
            logger.warning(f"重新生成embedding失败: {e}")
    
    # 更新其他字段
    update_data = qa_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(qa, key):
            setattr(qa, key, value)
    
    db.commit()
    db.refresh(qa)
    
    logger.info(f"✅ 更新固定Q&A: {qa_id}")
    
    return {
        "id": qa.id,
        "message": "更新成功"
    }


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    qa_ids: List[int]


@router.post("/batch-delete")
@router.post("/batch-delete/")
async def batch_delete_fixed_qa(
    application_id: int,
    request: BatchDeleteRequest,
    db: Session = Depends(get_db)
):
    """批量删除固定Q&A"""
    if not request.qa_ids:
        raise HTTPException(status_code=400, detail="未提供要删除的Q&A ID列表")
    
    deleted_count = db.query(FixedQAPair).filter(
        FixedQAPair.application_id == application_id,
        FixedQAPair.id.in_(request.qa_ids)
    ).delete(synchronize_session=False)
    
    db.commit()
    
    logger.info(f"✅ 批量删除固定Q&A: {deleted_count}条")
    
    return {
        "deleted_count": deleted_count,
        "message": f"成功删除{deleted_count}条Q&A"
    }


@router.delete("/all")
@router.delete("/all/")
async def delete_all_fixed_qa(
    application_id: int,
    db: Session = Depends(get_db)
):
    """删除应用下所有固定Q&A"""
    deleted_count = db.query(FixedQAPair).filter(
        FixedQAPair.application_id == application_id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    logger.info(f"✅ 删除应用{application_id}的所有固定Q&A: {deleted_count}条")
    
    return {
        "deleted_count": deleted_count,
        "message": f"成功删除全部{deleted_count}条Q&A"
    }


@router.delete("/{qa_id}")
async def delete_fixed_qa(
    application_id: int,
    qa_id: int,
    db: Session = Depends(get_db)
):
    """删除固定Q&A"""
    qa = db.query(FixedQAPair).filter(
        FixedQAPair.id == qa_id,
        FixedQAPair.application_id == application_id
    ).first()
    
    if not qa:
        raise HTTPException(status_code=404, detail="Q&A对不存在")
    
    db.delete(qa)
    db.commit()
    
    logger.info(f"✅ 删除固定Q&A: {qa_id}")
    
    return {"message": "删除成功"}


@router.post("/search")
@router.post("/search/")
async def search_fixed_qa(
    application_id: int,
    search_request: FixedQASearchRequest,
    db: Session = Depends(get_db)
):
    """
    语义搜索固定Q&A
    使用embedding向量进行相似度匹配
    """
    # 验证应用是否存在
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 获取所有激活的Q&A对
    qa_pairs = db.query(FixedQAPair).filter(
        FixedQAPair.application_id == application_id,
        FixedQAPair.is_active == True,
        FixedQAPair.embedding_vector.isnot(None)
    ).all()
    
    if not qa_pairs:
        return {
            "query": search_request.query,
            "matches": [],
            "message": "没有可用的固定Q&A对"
        }
    
    # 生成查询的embedding
    try:
        default_provider = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.is_default == True
        ).first()
        
        if not default_provider:
            raise HTTPException(status_code=500, detail="未配置默认Embedding提供商")
        
        provider_config = {
            "provider_type": default_provider.provider_type,
            "model_name": default_provider.model_name,
            "api_key": default_provider.api_key,
            "base_url": default_provider.base_url
        }
        
        query_vector = await embedding_engine.embed_text(search_request.query, provider_config)
        
    except Exception as e:
        logger.error(f"生成查询embedding失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成查询embedding失败: {str(e)}")
    
    # 计算相似度并排序
    matches = []
    for qa in qa_pairs:
        if qa.embedding_vector:
            similarity = embedding_engine.compute_similarity(query_vector, qa.embedding_vector)
            if similarity >= search_request.threshold:
                matches.append({
                    "id": qa.id,
                    "question": qa.question,
                    "answer": qa.answer,
                    "category": qa.category,
                    "similarity": round(similarity, 4),
                    "hit_count": qa.hit_count
                })
    
    # 按相似度排序并限制返回数量
    matches.sort(key=lambda x: x["similarity"], reverse=True)
    matches = matches[:search_request.top_k]
    
    return {
        "query": search_request.query,
        "threshold": search_request.threshold,
        "total_matches": len(matches),
        "matches": matches
    }


@router.post("/{qa_id}/regenerate-embedding")
@router.post("/{qa_id}/regenerate-embedding/")
async def regenerate_embedding(
    application_id: int,
    qa_id: int,
    db: Session = Depends(get_db)
):
    """重新生成Q&A的embedding向量"""
    qa = db.query(FixedQAPair).filter(
        FixedQAPair.id == qa_id,
        FixedQAPair.application_id == application_id
    ).first()
    
    if not qa:
        raise HTTPException(status_code=404, detail="Q&A对不存在")
    
    try:
        default_provider = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.is_default == True
        ).first()
        
        if not default_provider:
            raise HTTPException(status_code=500, detail="未配置默认Embedding提供商")
        
        provider_config = {
            "provider_type": default_provider.provider_type,
            "model_name": default_provider.model_name,
            "api_key": default_provider.api_key,
            "base_url": default_provider.base_url
        }
        
        vector = await embedding_engine.embed_text(qa.question, provider_config)
        qa.embedding_vector = vector
        
        db.commit()
        
        logger.info(f"✅ 重新生成Q&A embedding: {qa_id}")
        
        return {
            "message": "Embedding重新生成成功",
            "dimension": len(vector)
        }
        
    except Exception as e:
        logger.error(f"重新生成embedding失败: {e}")
        raise HTTPException(status_code=500, detail=f"重新生成embedding失败: {str(e)}")


@router.post("/generate-from-file")
@router.post("/generate-from-file/")
async def generate_qa_from_file(
    application_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    从文件自动生成Q&A对
    使用LLM将文档内容转化为Q&A格式
    """
    # 验证应用是否存在
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    
    # 读取文件内容
    content_text = ""
    
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        # 根据文件类型提取文本
        if filename.endswith('.txt'):
            content_text = content.decode('utf-8', errors='ignore')
        
        elif filename.endswith('.docx'):
            try:
                doc = docx.Document(io.BytesIO(content))
                content_text = '\n'.join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
            except Exception as e:
                logger.error(f"解析DOCX失败: {e}")
                raise HTTPException(status_code=400, detail=f"解析Word文档失败: {str(e)}")
        
        elif filename.endswith('.pdf'):
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                content_text = '\n'.join([page.extract_text() for page in pdf_reader.pages])
            except Exception as e:
                logger.error(f"解析PDF失败: {e}")
                raise HTTPException(status_code=400, detail=f"解析PDF文档失败: {str(e)}")
        
        else:
            raise HTTPException(status_code=400, detail="不支持的文件格式，请使用TXT、DOCX或PDF")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"读取文件失败: {e}")
        raise HTTPException(status_code=400, detail=f"读取文件失败: {str(e)}")
    
    if not content_text or len(content_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="文件内容太少，无法生成Q&A")
    
    # ========== 新增：智能识别Q&A格式 ==========
    # 尝试直接解析已有的Q&A格式
    def try_parse_existing_qa(text: str):
        """
        尝试识别并解析文本中已有的Q&A格式
        支持格式：
        1. 问题::答案
        2. Q: 问题 A: 答案
        3. 问：问题 答：答案
        """
        qa_pairs = []
        lines = text.strip().split('\n')
        
        # 格式1: 问题::答案
        for line in lines:
            line = line.strip()
            if '::' in line:
                parts = line.split('::', 1)
                if len(parts) == 2:
                    q = parts[0].strip()
                    a = parts[1].strip()
                    if q and a and len(q) > 3 and len(a) > 5:
                        qa_pairs.append({
                            "question": q,
                            "answer": a,
                            "category": None,
                            "priority": 5
                        })
        
        # 如果成功解析到足够多的Q&A，直接返回
        if len(qa_pairs) >= 5:
            logger.info(f"✅ 直接解析已有Q&A格式，共{len(qa_pairs)}对")
            return qa_pairs
        
        return None
    
    # 尝试直接解析
    parsed_qa = try_parse_existing_qa(content_text)
    if parsed_qa:
        return {
            "success": True,
            "count": len(parsed_qa),
            "qa_pairs": parsed_qa,  # 返回全部解析结果
            "message": f"成功解析文件中的 {len(parsed_qa)} 个Q&A对"
        }
    
    # 智能分块处理长文档
    max_chars_per_chunk = 5000  # 每块最大字符数
    content_chunks = []
    
    if len(content_text) > max_chars_per_chunk:
        # 按段落分割（优先按双换行符，其次按单换行符）
        paragraphs = content_text.split('\n\n')
        if len(paragraphs) == 1:
            paragraphs = content_text.split('\n')
        
        current_chunk = ""
        for para in paragraphs:
            if len(current_chunk) + len(para) < max_chars_per_chunk:
                current_chunk += para + "\n"
            else:
                if current_chunk:
                    content_chunks.append(current_chunk.strip())
                current_chunk = para + "\n"
        
        if current_chunk:
            content_chunks.append(current_chunk.strip())
        
        logger.info(f"文档较长，已分为{len(content_chunks)}个块进行处理")
    else:
        content_chunks = [content_text]
    
    # 使用应用配置的LLM生成Q&A
    try:
        # 从数据库加载AI提供商的API密钥（存储在EmbeddingProvider表中）
        # OpenAI等提供商既提供embedding也提供chat completion
        ai_provider_obj = db.query(EmbeddingProvider).filter(
            EmbeddingProvider.provider_type == app.ai_provider
        ).first()
        
        if not ai_provider_obj or not ai_provider_obj.api_key:
            raise HTTPException(
                status_code=400, 
                detail=f"应用配置的AI提供商 '{app.ai_provider}' 未设置API密钥，请先在系统设置中配置。当前提供商: {app.ai_provider}"
            )
        
        # 设置API密钥到multi_model_engine
        multi_model_engine.set_api_key(app.ai_provider, ai_provider_obj.api_key)
        if ai_provider_obj.base_url:
            multi_model_engine.set_custom_config(app.ai_provider, {
                "base_url": ai_provider_obj.base_url
            })
        
        logger.info(f"使用AI提供商: {app.ai_provider}, 模型: {app.llm_model}")
        
        # 构建优化后的prompt
        system_prompt = """你是一个专业的Q&A知识库构建专家。你的任务是从文档中提炼出精准、实用的问答对。

核心要求：
1. **问题设计**：
   - 使用用户的真实提问方式（例如："如何..."、"什么是..."、"是否可以..."）
   - 问题要具体明确，避免模糊笼统
   - 每个问题聚焦一个核心知识点

2. **答案撰写**：
   - 直接回答问题，不要重复问题内容
   - 答案要完整、准确，包含所有必要细节
   - 如有步骤、条件、要求，用结构化方式呈现
   - 保留原文中的关键数据、时间、联系方式等重要信息

3. **分类与优先级**：
   - category: 根据主题归类（如："招生"、"学费"、"课程"、"毕业"等）
   - priority: 1-10，越重要/常见的问题优先级越高

4. **输出格式**：
返回JSON数组，每个元素格式如下：
[
  {
    "question": "2025年本科招生在哪些省份？",
    "answer": "香港中文大学（深圳）2025年拟在内地21个省（市）投放招生计划，分别为：北京、天津、重庆、河北、辽宁、黑龙江、江苏、浙江、上海、安徽、福建、江西、山东、河南、湖北、湖南、广东、四川、贵州、云南、陕西。",
    "category": "招生政策",
    "priority": 8
  }
]

请确保返回有效的JSON数组。"""

        # 处理所有块，生成Q&A
        all_generated_qas = []
        
        for idx, chunk in enumerate(content_chunks):
            logger.info(f"正在处理第 {idx+1}/{len(content_chunks)} 块...")
            
            user_prompt = f"""请从以下文档片段中提取关键信息，生成8-15个高质量的Q&A对：

{chunk}

注意：
- 优先提取用户最关心的核心问题
- 每个Q&A要独立完整，不要相互依赖
- 答案要基于原文，不要添加原文没有的信息
- 如果原文中有多个相关子问题，可以分别生成多个Q&A"""

            try:
                # 调用LLM
                response = await multi_model_engine.chat_completion(
                    provider=app.ai_provider,
                    model=app.llm_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.3,  # 降低随机性，提高稳定性
                    max_tokens=4000
                )
                
                llm_response = response["choices"][0]["message"]["content"]
                logger.info(f"第{idx+1}块LLM响应: {llm_response[:200]}...")
                
                # 尝试从markdown代码块中提取JSON
                if "```json" in llm_response:
                    llm_response = llm_response.split("```json")[1].split("```")[0].strip()
                elif "```" in llm_response:
                    llm_response = llm_response.split("```")[1].split("```")[0].strip()
                
                # 解析LLM返回的JSON
                try:
                    qa_list = json.loads(llm_response)
                except json.JSONDecodeError as e:
                    logger.warning(f"第{idx+1}块JSON解析失败: {e}")
                    continue
                
                if not isinstance(qa_list, list):
                    logger.warning(f"第{idx+1}块返回格式错误，期望JSON数组")
                    continue
                
                # 格式化Q&A对
                for item in qa_list:
                    if isinstance(item, dict) and "question" in item and "answer" in item:
                        all_generated_qas.append({
                            "question": item.get("question", "").strip(),
                            "answer": item.get("answer", "").strip(),
                            "category": item.get("category", "").strip() or None,
                            "priority": item.get("priority", 5)
                        })
                
                logger.info(f"第{idx+1}块成功生成 {len([x for x in qa_list if isinstance(x, dict)])} 个Q&A")
                
            except Exception as e:
                logger.error(f"处理第{idx+1}块时出错: {e}")
                continue
        
        if not all_generated_qas:
            raise HTTPException(status_code=500, detail="LLM未能生成有效的Q&A对，请检查文档内容或重试")
        
        # 去重（基于问题相似度）
        generated_qas = []
        seen_questions = set()
        for qa in all_generated_qas:
            q_lower = qa["question"].lower().strip()
            if q_lower not in seen_questions:
                seen_questions.add(q_lower)
                generated_qas.append(qa)
        
        logger.info(f"✅ 总共生成 {len(all_generated_qas)} 个Q&A，去重后保留 {len(generated_qas)} 个")
        
        return {
            "success": True,
            "count": len(generated_qas),
            "qa_pairs": generated_qas,
            "message": f"成功从文件生成 {len(generated_qas)} 个Q&A对"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成Q&A失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"生成Q&A失败: {str(e)}")
