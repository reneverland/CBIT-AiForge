"""
模型微调 API
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger
import json
from datetime import datetime

from app.models.database import get_db, TrainingJob, Model as ModelModel, Document as DocumentModel
from app.core.qa_generator import QAGenerator
from app.core.document_processor import DocumentProcessor
from app.core.config import settings
from pathlib import Path

router = APIRouter()
qa_generator = QAGenerator()


class TrainingTemplate(BaseModel):
    """训练模板"""
    name: str
    description: str
    domain: str  # 通用、数学、代码等
    default_config: Dict[str, Any]


class DatasetGenerateRequest(BaseModel):
    """数据集生成请求"""
    document_ids: List[int]
    template: str  # 通用问答、数学推理、代码生成、自定义
    use_openai: bool = True
    questions_per_chunk: int = 3


class TrainingRequest(BaseModel):
    """训练请求"""
    model_name: str
    display_name: str
    description: Optional[str] = None
    dataset_path: str
    base_model: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


# 预定义训练模板
TRAINING_TEMPLATES = {
    "general": TrainingTemplate(
        name="通用问答",
        description="适用于通用对话和知识问答",
        domain="通用",
        default_config={
            "learning_rate": 2e-4,
            "num_epochs": 3,
            "batch_size": 4,
            "lora_r": 8,
            "lora_alpha": 16,
        }
    ),
    "math": TrainingTemplate(
        name="数学推理",
        description="适用于数学题目求解和推理",
        domain="数学",
        default_config={
            "learning_rate": 1e-4,
            "num_epochs": 5,
            "batch_size": 2,
            "lora_r": 16,
            "lora_alpha": 32,
        }
    ),
    "code": TrainingTemplate(
        name="代码生成",
        description="适用于编程相关任务",
        domain="代码",
        default_config={
            "learning_rate": 5e-5,
            "num_epochs": 3,
            "batch_size": 4,
            "lora_r": 8,
            "lora_alpha": 16,
        }
    ),
}


@router.get("/templates")
async def get_training_templates():
    """获取训练模板列表"""
    return {
        "templates": [
            {
                "key": key,
                "name": template.name,
                "description": template.description,
                "domain": template.domain,
                "default_config": template.default_config,
            }
            for key, template in TRAINING_TEMPLATES.items()
        ]
    }


@router.post("/generate-dataset")
async def generate_training_dataset(
    request: DatasetGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    生成训练数据集
    
    1. 从文档提取文本
    2. （可选）使用 OpenAI 转换为 QA 格式
    3. 保存为训练数据集
    """
    try:
        # 获取文档
        documents = db.query(DocumentModel).filter(
            DocumentModel.id.in_(request.document_ids)
        ).all()
        
        if not documents:
            raise HTTPException(status_code=404, detail="未找到指定的文档")
        
        # 获取模板
        template = TRAINING_TEMPLATES.get(request.template)
        if not template:
            template = TRAINING_TEMPLATES["general"]
        
        all_qa_pairs = []
        
        for doc in documents:
            # 处理文档
            file_path = Path(doc.original_path)
            result = DocumentProcessor.process_document(file_path)
            chunks = result["chunks"]
            
            if request.use_openai and qa_generator.client:
                # 使用 OpenAI 生成 QA 对
                logger.info(f"使用 OpenAI 生成 QA 对: {doc.filename}")
                qa_pairs = await qa_generator.generate_training_dataset(
                    chunks=chunks[:5],  # 限制块数
                    questions_per_chunk=request.questions_per_chunk,
                    domain=template.domain
                )
                all_qa_pairs.extend(qa_pairs)
            else:
                # 直接使用文本块作为训练数据
                for chunk in chunks:
                    all_qa_pairs.append({
                        "question": f"请解释以下内容：",
                        "answer": chunk
                    })
        
        # 格式化为训练格式
        training_data = qa_generator.format_for_training(all_qa_pairs, format_type="alpaca")
        
        # 保存数据集
        dataset_path = settings.PROCESSED_DIR / f"dataset_{datetime.now().timestamp()}.json"
        with open(dataset_path, "w", encoding="utf-8") as f:
            json.dump(training_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"✅ 训练数据集生成完成: {len(training_data)} 条")
        
        return {
            "message": "数据集生成成功",
            "dataset_path": str(dataset_path),
            "total_examples": len(training_data),
            "template": template.name,
            "preview": training_data[:3]  # 预览前3条
        }
        
    except Exception as e:
        logger.error(f"生成数据集失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start")
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    开始训练任务
    
    注意：实际训练需要 GPU 环境，本地开发可能无法运行
    """
    try:
        # 检查模型名称是否已存在
        existing = db.query(ModelModel).filter(ModelModel.name == request.model_name).first()
        if existing:
            raise HTTPException(status_code=400, detail="模型名称已存在")
        
        # 验证数据集文件
        dataset_path = Path(request.dataset_path)
        if not dataset_path.exists():
            raise HTTPException(status_code=404, detail="数据集文件不存在")
        
        # 获取配置
        base_model = request.base_model or settings.BASE_MODEL
        config = request.config or {}
        
        # 合并默认配置
        training_config = {
            "learning_rate": config.get("learning_rate", settings.DEFAULT_LEARNING_RATE),
            "num_epochs": config.get("num_epochs", settings.DEFAULT_EPOCHS),
            "batch_size": config.get("batch_size", settings.DEFAULT_BATCH_SIZE),
            "lora_r": config.get("lora_r", settings.LORA_R),
            "lora_alpha": config.get("lora_alpha", settings.LORA_ALPHA),
        }
        
        # 创建模型记录
        model = ModelModel(
            name=request.model_name,
            display_name=request.display_name,
            description=request.description,
            base_model=base_model,
            model_type="fine-tuned",
            status="inactive",
            training_config=training_config,
        )
        db.add(model)
        db.commit()
        db.refresh(model)
        
        # 创建训练任务
        job = TrainingJob(
            model_id=model.id,
            dataset_path=str(dataset_path),
            config=training_config,
            status="pending",
            total_epochs=training_config["num_epochs"],
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # 在生产环境中，这里会启动后台训练任务
        # background_tasks.add_task(train_model, job.id, db)
        
        logger.info(f"✅ 训练任务已创建: {request.model_name}")
        
        return {
            "message": "训练任务已创建",
            "job_id": job.id,
            "model_id": model.id,
            "model_name": request.model_name,
            "status": "pending",
            "note": "实际训练需要在 GPU 服务器上运行。本地开发环境仅创建任务记录。"
        }
        
    except Exception as e:
        logger.error(f"创建训练任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs")
async def list_training_jobs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取训练任务列表"""
    jobs = db.query(TrainingJob).order_by(TrainingJob.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": db.query(TrainingJob).count(),
        "jobs": [
            {
                "id": job.id,
                "model_id": job.model_id,
                "status": job.status,
                "progress": job.progress,
                "current_epoch": job.current_epoch,
                "total_epochs": job.total_epochs,
                "loss": job.loss,
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            }
            for job in jobs
        ]
    }


@router.get("/jobs/{job_id}")
async def get_training_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """获取训练任务详情"""
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="训练任务不存在")
    
    return {
        "id": job.id,
        "model_id": job.model_id,
        "dataset_path": job.dataset_path,
        "config": job.config,
        "status": job.status,
        "progress": job.progress,
        "current_epoch": job.current_epoch,
        "total_epochs": job.total_epochs,
        "loss": job.loss,
        "metrics": job.metrics,
        "logs": job.logs,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }

