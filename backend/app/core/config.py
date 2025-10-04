"""
配置管理模块
"""

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List


class Settings(BaseSettings):
    """应用配置"""
    
    # OpenAI 配置
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # 基座模型配置
    BASE_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"
    MODEL_CACHE_DIR: Path = Path("./app/data/models")
    HF_TOKEN: str = ""
    
    # 数据存储路径
    DATA_DIR: Path = Path("./app/data")
    CHROMA_DB_PATH: Path = Path("./app/data/chromadb")
    SQLITE_DB_PATH: Path = Path("./app/data/forge.db")
    UPLOAD_DIR: Path = Path("./app/data/uploads")
    PROCESSED_DIR: Path = Path("./app/data/processed")
    
    # 服务配置
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    MODEL_PORT_START: int = 8001
    MAX_CONCURRENT_MODELS: int = 5
    WORKERS: int = 1
    
    # GPU/CPU 配置
    USE_GPU: bool = False
    CUDA_VISIBLE_DEVICES: str = "0"
    GPU_MEMORY_UTILIZATION: float = 0.85
    
    # 安全配置
    API_SECRET_KEY: str = "cbit-forge-secret-key-change-in-production"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "*"]
    API_KEY_ENABLED: bool = False
    API_KEYS: List[str] = []
    
    # 文档处理配置
    MAX_UPLOAD_SIZE_MB: int = 100
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    EMBEDDING_MODEL: str = "BAAI/bge-small-zh-v1.5"
    
    # 训练配置
    DEFAULT_LEARNING_RATE: float = 2e-4
    DEFAULT_EPOCHS: int = 3
    DEFAULT_BATCH_SIZE: int = 4
    LORA_R: int = 8
    LORA_ALPHA: int = 16
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Path = Path("./logs/cbit_forge.log")
    
    # CORS配置
    ENABLE_CORS: bool = True
    
    # 开发模式
    DEBUG: bool = True
    RELOAD: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 处理逗号分隔的字符串
        if isinstance(self.ALLOWED_ORIGINS, str):
            self.ALLOWED_ORIGINS = [s.strip() for s in self.ALLOWED_ORIGINS.split(",")]
        if isinstance(self.API_KEYS, str):
            self.API_KEYS = [s.strip() for s in self.API_KEYS.split(",") if s.strip()]


settings = Settings()

