"""
数据库模型定义 v3.0 - 简化版
彻底重构Application表，从30+字段简化到12个核心字段
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.core.config import settings

Base = declarative_base()


class Application(Base):
    """应用实例表 v3.0 - 简化架构
    
    核心改进：
    1. 从30+配置字段简化到12个核心字段
    2. 使用mode + mode_config替代大量独立字段
    3. 配置通过JSON灵活存储，易于扩展
    """
    __tablename__ = "applications"
    
    # ========== 基础信息 ==========
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # ========== 核心工作模式（最重要的简化）==========
    mode = Column(String(50), default="standard", nullable=False)
    """工作模式：
    - safe: 安全模式（仅固定Q&A）
    - standard: 标准模式（固定Q&A + 向量库 + AI生成）
    - enhanced: 增强模式（+ 联网搜索）
    """
    
    mode_config = Column(JSON, nullable=True)
    """模式配置（JSON格式，灵活存储各模式的特定参数）
    
    示例 - 安全模式：
    {
        "priority_order": ["fixed_qa_exact", "fixed_qa_similar"],
        "fixed_qa_threshold": 0.85,
        "recommend_count": 5,
        "allow_ai_generation": false,
        "allow_web_search": false,
        "fallback_message": "未找到匹配答案，以下是相关问题推荐："
    }
    
    示例 - 标准模式：
    {
        "priority_order": ["fixed_qa_exact", "fixed_qa_similar", "vector_kb", "ai_generation"],
        "fixed_qa_threshold": 0.90,
        "vector_kb_threshold": 0.75,
        "recommend_count": 3,
        "allow_ai_generation": true,
        "allow_web_search": false,
        "enable_llm_polish": true,
        "enable_source_tracking": true
    }
    
    示例 - 增强模式：
    {
        "priority_order": ["fixed_qa_exact", "vector_kb", "web_search", "ai_generation"],
        "fixed_qa_threshold": 0.95,
        "vector_kb_threshold": 0.70,
        "web_search_auto_threshold": 0.50,
        "recommend_count": 3,
        "allow_ai_generation": true,
        "allow_web_search": true,
        "enable_llm_polish": true,
        "web_search_domains": ["edu.cn", "gov.cn"],
        "search_channels": ["official", "academic"]
    }
    """
    
    # ========== AI配置 ==========
    ai_provider = Column(String(50), nullable=False)  # openai, anthropic, gemini
    llm_model = Column(String(255), nullable=False)   # gpt-3.5-turbo, gpt-4, etc.
    temperature = Column(Float, default=0.7)          # 0.0-2.0
    
    # ========== API配置 ==========
    api_key = Column(String(255), unique=True, nullable=False)  # 应用专属API密钥
    endpoint_path = Column(String(255), unique=True, nullable=False)  # API路径 /api/v1/chat/{endpoint_path}
    is_active = Column(Boolean, default=True)
    
    # ========== 统计信息 ==========
    total_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # ========== 时间戳 ==========
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_mode_config_with_defaults(self):
        """获取模式配置（含默认值）"""
        from app.core.mode_presets import MODE_PRESETS
        
        # 获取模式预设
        preset = MODE_PRESETS.get(self.mode, MODE_PRESETS["standard"])
        
        # 如果有自定义配置，合并到预设中
        if self.mode_config:
            config = preset.copy()
            config.update(self.mode_config)
            return config
        
        return preset


class ApplicationKnowledgeBase(Base):
    """应用-知识库关联表（保持不变）"""
    __tablename__ = "application_knowledge_bases"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, nullable=False)
    knowledge_base_id = Column(Integer, nullable=False)
    priority = Column(Integer, default=1)  # 优先级(1最高)
    created_at = Column(DateTime, default=datetime.utcnow)


class FixedQAPair(Base):
    """固定Q&A对表（保持不变）"""
    __tablename__ = "fixed_qa_pairs"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    keywords = Column(JSON, nullable=True)
    category = Column(String(100), nullable=True)
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # 统计信息
    hit_count = Column(Integer, default=0)
    last_hit_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ========== 以下表保持不变 ==========

class KnowledgeBase(Base):
    """知识库表"""
    __tablename__ = "knowledge_bases"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    collection_name = Column(String(255), unique=True, nullable=False)
    embedding_provider_id = Column(Integer, nullable=True)
    vector_db_provider_id = Column(Integer, nullable=True)
    document_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KnowledgeBaseText(Base):
    """知识库文本片段表"""
    __tablename__ = "knowledge_base_texts"
    
    id = Column(Integer, primary_key=True, index=True)
    knowledge_base_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    title = Column(String(500), nullable=True)
    source = Column(String(500), nullable=True)
    text_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RetrievalLog(Base):
    """检索日志表（来源追溯）"""
    __tablename__ = "retrieval_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, nullable=False)
    query = Column(Text, nullable=False)
    matched_source = Column(String(50), nullable=True)
    confidence_score = Column(Float, nullable=True)
    references = Column(JSON, nullable=True)
    final_answer = Column(Text, nullable=True)
    retrieval_path = Column(JSON, nullable=True)
    response_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmbeddingProvider(Base):
    """向量化模型提供商表"""
    __tablename__ = "embedding_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    provider_type = Column(String(50), nullable=False)
    model_name = Column(String(255), nullable=False)
    api_key = Column(Text, nullable=True)
    base_url = Column(String(500), nullable=True)
    dimension = Column(Integer, nullable=True)
    is_default = Column(Boolean, default=False)
    config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VectorDBProvider(Base):
    """向量数据库提供商表"""
    __tablename__ = "vector_db_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    provider_type = Column(String(50), nullable=False)
    host = Column(String(500), nullable=True)
    port = Column(Integer, nullable=True)
    api_key = Column(Text, nullable=True)
    collection_prefix = Column(String(100), nullable=True)
    is_default = Column(Boolean, default=False)
    config = Column(JSON, nullable=True)
    status = Column(String(50), default="inactive")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SearchProvider(Base):
    """搜索服务提供商表"""
    __tablename__ = "search_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    provider_type = Column(String(50), nullable=False)
    api_key = Column(Text, nullable=False)
    search_engine_id = Column(String(255), nullable=True)
    base_url = Column(String(500), nullable=True)
    is_default = Column(Boolean, default=False)
    config = Column(JSON, nullable=True)
    daily_limit = Column(Integer, nullable=True)
    current_usage = Column(Integer, default=0)
    last_reset_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="inactive")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# 数据库引擎和会话
engine = create_engine(
    f"sqlite:///{settings.SQLITE_DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """初始化数据库"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

