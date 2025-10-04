"""
数据库模型定义
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.core.config import settings

Base = declarative_base()


class KnowledgeBase(Base):
    """知识库表"""
    __tablename__ = "knowledge_bases"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    collection_name = Column(String(255), unique=True, nullable=False)  # ChromaDB collection名称
    document_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Document(Base):
    """文档表"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt, etc.
    file_size = Column(Integer, nullable=False)  # bytes
    knowledge_base_id = Column(Integer, nullable=True)  # 关联的知识库ID
    status = Column(String(50), default="uploaded")  # uploaded, processing, completed, failed
    chunk_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    doc_metadata = Column(JSON, nullable=True)  # 重命名避免与SQLAlchemy保留字冲突
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)


class Model(Base):
    """模型表"""
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    base_model = Column(String(255), nullable=False)
    model_type = Column(String(50), nullable=False)  # base, fine-tuned, rag
    model_path = Column(String(500), nullable=True)
    port = Column(Integer, nullable=True)  # 服务端口
    status = Column(String(50), default="inactive")  # inactive, training, active, failed
    training_config = Column(JSON, nullable=True)
    performance_metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    trained_at = Column(DateTime, nullable=True)


class TrainingJob(Base):
    """训练任务表"""
    __tablename__ = "training_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, nullable=False)
    dataset_path = Column(String(500), nullable=False)
    config = Column(JSON, nullable=False)
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    progress = Column(Float, default=0.0)  # 0.0 - 1.0
    current_epoch = Column(Integer, default=0)
    total_epochs = Column(Integer, nullable=False)
    loss = Column(Float, nullable=True)
    metrics = Column(JSON, nullable=True)
    logs = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class InferenceLog(Base):
    """推理日志表"""
    __tablename__ = "inference_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, nullable=True)
    knowledge_base_id = Column(Integer, nullable=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    tokens_used = Column(Integer, nullable=True)
    latency_ms = Column(Float, nullable=True)
    log_metadata = Column(JSON, nullable=True)  # 重命名避免与SQLAlchemy保留字冲突
    created_at = Column(DateTime, default=datetime.utcnow)


# 创建数据库引擎
engine = create_engine(
    f"sqlite:///{settings.SQLITE_DB_PATH}",
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """初始化数据库"""
    settings.SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

