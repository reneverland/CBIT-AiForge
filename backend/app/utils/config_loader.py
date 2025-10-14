"""
配置加载工具 - 自动从配置文件导入API配置
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from loguru import logger
from sqlalchemy.orm import Session

from app.models.database import (
    EmbeddingProvider as EmbeddingProviderModel,
    VectorDBProvider as VectorDBProviderModel
)


class ConfigLoader:
    """配置加载器 - 从JSON文件加载API配置到数据库"""
    
    def __init__(self, config_file: Path):
        self.config_file = config_file
        self.config_data: Optional[Dict] = None
    
    def load_config(self) -> bool:
        """加载配置文件"""
        try:
            if not self.config_file.exists():
                logger.info(f"⚠️ 配置文件不存在: {self.config_file}")
                return False
            
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self.config_data = json.load(f)
            
            logger.info(f"✅ 成功加载配置文件: {self.config_file}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 加载配置文件失败: {e}")
            return False
    
    def import_embedding_providers(self, db: Session) -> int:
        """导入 Embedding 提供商配置"""
        if not self.config_data or 'embedding_providers' not in self.config_data:
            return 0
        
        count = 0
        for provider_config in self.config_data['embedding_providers']:
            try:
                # 检查是否已存在
                existing = db.query(EmbeddingProviderModel).filter(
                    EmbeddingProviderModel.name == provider_config['name']
                ).first()
                
                if existing:
                    logger.info(f"⏭️ Embedding 提供商已存在，跳过: {provider_config['name']}")
                    continue
                
                # 创建新提供商
                provider = EmbeddingProviderModel(
                    name=provider_config['name'],
                    provider_type=provider_config['provider_type'],
                    api_key=provider_config.get('api_key'),
                    base_url=provider_config.get('base_url'),
                    model_name=provider_config.get('model_name'),
                    dimension=provider_config.get('dimension', 1536),
                    is_default=provider_config.get('is_default', False)
                )
                
                db.add(provider)
                db.commit()
                count += 1
                logger.info(f"✅ 导入 Embedding 提供商: {provider_config['name']}")
                
            except Exception as e:
                logger.error(f"❌ 导入 Embedding 提供商失败 {provider_config.get('name', 'Unknown')}: {e}")
                db.rollback()
        
        return count
    
    def import_vector_db_providers(self, db: Session) -> int:
        """导入向量数据库提供商配置"""
        if not self.config_data or 'vector_db_providers' not in self.config_data:
            return 0
        
        count = 0
        for provider_config in self.config_data['vector_db_providers']:
            try:
                # 检查是否已存在
                existing = db.query(VectorDBProviderModel).filter(
                    VectorDBProviderModel.name == provider_config['name']
                ).first()
                
                if existing:
                    logger.info(f"⏭️ 向量数据库提供商已存在，跳过: {provider_config['name']}")
                    continue
                
                # 创建新提供商
                provider = VectorDBProviderModel(
                    name=provider_config['name'],
                    provider_type=provider_config['provider_type'],
                    host=provider_config.get('host'),
                    port=provider_config.get('port', 6333),
                    api_key=provider_config.get('api_key'),
                    is_default=provider_config.get('is_default', False)
                )
                
                db.add(provider)
                db.commit()
                count += 1
                logger.info(f"✅ 导入向量数据库提供商: {provider_config['name']}")
                
            except Exception as e:
                logger.error(f"❌ 导入向量数据库提供商失败 {provider_config.get('name', 'Unknown')}: {e}")
                db.rollback()
        
        return count
    
    def import_ai_providers(self, db: Session) -> int:
        """导入AI提供商配置（暂不支持）"""
        # AI Provider 模型尚未实现，跳过
        return 0
    
    def import_all(self, db: Session) -> Dict[str, int]:
        """导入所有配置"""
        if not self.load_config():
            return {"embedding": 0, "vector_db": 0, "ai": 0}
        
        results = {
            "embedding": self.import_embedding_providers(db),
            "vector_db": self.import_vector_db_providers(db)
        }
        
        total = sum(results.values())
        if total > 0:
            logger.info(f"🎉 配置导入完成！共导入 {total} 个提供商配置")
        else:
            logger.info("ℹ️ 没有新配置需要导入")
        
        return results


def auto_load_config(db: Session) -> bool:
    """自动加载配置文件（仅在首次启动时导入，避免覆盖用户在前端的修改）"""
    from app.core.config import settings
    
    config_file = settings.DATA_DIR / "api_config.json"
    
    if not config_file.exists():
        logger.info("ℹ️ 未找到 api_config.json，跳过自动导入")
        return False
    
    # 刷新会话以确保看到最新数据
    db.expire_all()
    
    # 检查数据库是否已有配置（避免覆盖用户配置）
    existing_providers = db.query(VectorDBProviderModel).count()
    existing_embedding = db.query(EmbeddingProviderModel).count()
    
    logger.info(f"🔍 检查现有配置: 向量库={existing_providers}, Embedding={existing_embedding}")
    
    if existing_providers > 0 or existing_embedding > 0:
        logger.info(f"ℹ️ 数据库已有配置，跳过JSON导入，保留用户配置")
        return False
    
    # 只在首次启动（数据库为空）时导入
    logger.info("🔄 首次启动，从 api_config.json 导入初始配置...")
    loader = ConfigLoader(config_file)
    results = loader.import_all(db)
    
    return sum(results.values()) > 0
