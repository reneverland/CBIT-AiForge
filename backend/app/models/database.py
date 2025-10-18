"""
数据库模型定义
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
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
    embedding_provider_id = Column(Integer, nullable=True)  # Embedding提供商ID
    vector_db_provider_id = Column(Integer, nullable=True)  # 向量数据库提供商ID (新增)
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


class EmbeddingProvider(Base):
    """向量化模型提供商表"""
    __tablename__ = "embedding_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # 显示名称
    provider_type = Column(String(50), nullable=False)  # openai, local, custom
    model_name = Column(String(255), nullable=False)  # 模型名称
    api_key = Column(Text, nullable=True)  # API密钥(加密存储)
    base_url = Column(String(500), nullable=True)  # 自定义Base URL
    dimension = Column(Integer, nullable=True)  # 向量维度
    is_default = Column(Boolean, default=False)  # 是否为默认
    config = Column(JSON, nullable=True)  # 其他配置参数
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VectorDBProvider(Base):
    """向量数据库提供商表 (新增)"""
    __tablename__ = "vector_db_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # 显示名称
    provider_type = Column(String(50), nullable=False)  # chromadb, qdrant, pinecone, weaviate, milvus
    host = Column(String(500), nullable=True)  # 主机地址
    port = Column(Integer, nullable=True)  # 端口
    api_key = Column(Text, nullable=True)  # API密钥
    collection_prefix = Column(String(100), nullable=True)  # 集合名称前缀
    is_default = Column(Boolean, default=False)  # 是否为默认
    config = Column(JSON, nullable=True)  # 其他配置参数
    status = Column(String(50), default="inactive")  # inactive, active, error
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SearchProvider(Base):
    """搜索服务提供商表 (新增)"""
    __tablename__ = "search_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # 显示名称
    provider_type = Column(String(50), nullable=False)  # google, bing, serper, serpapi
    api_key = Column(Text, nullable=False)  # API密钥
    search_engine_id = Column(String(255), nullable=True)  # Google Custom Search Engine ID
    base_url = Column(String(500), nullable=True)  # 自定义API地址
    is_default = Column(Boolean, default=False)  # 是否为默认
    config = Column(JSON, nullable=True)  # 其他配置参数
    daily_limit = Column(Integer, nullable=True)  # 每日限额
    current_usage = Column(Integer, default=0)  # 当前使用量
    last_reset_date = Column(DateTime, nullable=True)  # 上次重置日期
    status = Column(String(50), default="inactive")  # inactive, active, error
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Application(Base):
    """应用实例表 v3.0 - 简化版
    
    核心简化：从30+配置字段简化到12个核心字段
    使用 mode + mode_config 替代大量独立配置字段
    """
    __tablename__ = "applications"
    
    # ========== 基础信息 ==========
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # ========== 核心工作模式 ==========
    mode = Column(String(50), default="standard", nullable=False)
    """工作模式：safe(安全), standard(标准), enhanced(增强)"""
    
    mode_config = Column(JSON, nullable=True)
    """模式配置（JSON格式存储各模式的特定参数）"""
    
    # ========== AI配置 ==========
    ai_provider = Column(String(50), nullable=False)
    llm_model = Column(String(255), nullable=False)
    temperature = Column(Float, default=0.7)
    
    # ========== API配置 ==========
    api_key = Column(String(255), unique=True, nullable=False)
    endpoint_path = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # ========== 统计信息 ==========
    total_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_mode_config_with_defaults(self):
        """获取模式配置（含默认值）"""
        from app.core.mode_presets import get_mode_config
        return get_mode_config(self.mode, self.mode_config)
    
    @property
    def knowledge_bases(self):
        """获取关联的知识库列表（通过ApplicationKnowledgeBase中间表）"""
        from app.models.database import SessionLocal, ApplicationKnowledgeBase, KnowledgeBase
        db = SessionLocal()
        try:
            # 查询关联关系
            associations = db.query(ApplicationKnowledgeBase).filter(
                ApplicationKnowledgeBase.application_id == self.id
            ).all()
            
            if not associations:
                return []
            
            # 获取知识库详情
            kb_ids = [assoc.knowledge_base_id for assoc in associations]
            knowledge_bases = db.query(KnowledgeBase).filter(
                KnowledgeBase.id.in_(kb_ids)
            ).all()
            
            return knowledge_bases
        finally:
            db.close()


class ApplicationKnowledgeBase(Base):
    """应用-知识库关联表"""
    __tablename__ = "application_knowledge_bases"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, nullable=False)
    knowledge_base_id = Column(Integer, nullable=False)
    priority = Column(Integer, default=1)  # 优先级(1最高)
    weight = Column(Float, default=1.0)  # 权重(0.0-1.0)
    boost_factor = Column(Float, default=1.0)  # 加权因子
    created_at = Column(DateTime, default=datetime.utcnow)


class FixedQAPair(Base):
    """固定Q&A对表"""
    __tablename__ = "fixed_qa_pairs"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)  # 标准问题
    answer = Column(Text, nullable=False)  # 标准答案
    keywords = Column(JSON, nullable=True)  # 关键词列表
    embedding_vector = Column(JSON, nullable=True)  # 问题的embedding向量
    category = Column(String(100), nullable=True)  # 分类
    priority = Column(Integer, default=0)  # 优先级
    is_active = Column(Boolean, default=True)
    
    # 统计信息
    hit_count = Column(Integer, default=0)  # 命中次数
    last_hit_at = Column(DateTime, nullable=True)  # 最后命中时间
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RetrievalLog(Base):
    """检索日志表(来源追溯)"""
    __tablename__ = "retrieval_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, nullable=False)
    query = Column(Text, nullable=False)
    
    # 检索结果
    matched_source = Column(String(50), nullable=True)  # fixed_qa, kb, web, llm
    confidence_score = Column(Float, nullable=True)
    references = Column(JSON, nullable=True)  # 引用片段列表
    final_answer = Column(Text, nullable=True)
    
    # 检索路径追踪
    retrieval_path = Column(JSON, nullable=True)  # 完整检索路径
    preprocessing_info = Column(JSON, nullable=True)  # 预处理信息
    fusion_details = Column(JSON, nullable=True)  # 融合详情
    
    # 性能指标
    preprocessing_time_ms = Column(Float, nullable=True)
    retrieval_time_ms = Column(Float, nullable=True)
    generation_time_ms = Column(Float, nullable=True)
    total_time_ms = Column(Float, nullable=True)
    
    # 响应信息
    tokens_used = Column(Integer, nullable=True)
    has_suggestions = Column(Boolean, default=False)  # 是否包含建议
    suggestions = Column(JSON, nullable=True)  # 建议列表
    
    created_at = Column(DateTime, default=datetime.utcnow)


class KnowledgeBaseText(Base):
    """知识库文本表 - 存储手动添加的文本"""
    __tablename__ = "knowledge_base_texts"
    
    id = Column(Integer, primary_key=True, index=True)
    knowledge_base_id = Column(Integer, nullable=False, index=True)
    
    # 文本内容
    content = Column(Text, nullable=False)
    
    # 向量数据库信息
    vector_id = Column(String(255), nullable=True)  # 向量数据库中的ID
    
    # 元数据
    text_metadata = Column(JSON, nullable=True)  # 自定义元数据（重命名避免与SQLAlchemy保留字冲突）
    source = Column(String(100), default="manual")  # 来源标识
    
    # 统计信息
    char_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# 创建数据库引擎
engine = create_engine(
    f"sqlite:///{settings.SQLITE_DB_PATH}",
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """初始化数据库"""
    settings.SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # 只创建不存在的表，不删除已有数据（保留用户配置）
    # 注意：如需重置数据库，请手动删除 forge.db 文件
    Base.metadata.create_all(bind=engine)
    
    # 开发环境如需重置数据库，取消以下注释：
    # Base.metadata.drop_all(bind=engine)
    # Base.metadata.create_all(bind=engine)


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()