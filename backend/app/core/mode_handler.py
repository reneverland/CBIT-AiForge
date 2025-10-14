"""
应用模式处理引擎 v3.0
根据不同模式（safe/standard/enhanced）执行不同的推理策略
"""

from typing import Dict, List, Tuple, Optional, Any
from loguru import logger
from app.core.mode_presets import get_mode_config, MODE_PRESETS
import asyncio


class ModeHandler:
    """模式处理器 - 根据应用模式执行对应的推理策略"""
    
    def __init__(self, application: 'Application'):
        """初始化模式处理器
        
        Args:
            application: 应用实例对象
        """
        self.app = application
        self.mode = application.mode
        self.config = application.get_mode_config_with_defaults()
        
        logger.info(f"🎯 初始化模式处理器: {self.app.name} ({self.mode}模式)")
    
    async def process_query(
        self,
        query: str,
        context_messages: List[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """处理查询请求
        
        Args:
            query: 用户查询
            context_messages: 上下文消息历史
            **kwargs: 其他参数
            
        Returns:
            {
                "answer": str,              # 最终答案
                "source": str,              # 来源类型
                "confidence": float,        # 置信度
                "references": List[Dict],   # 引用来源
                "recommendations": List[Dict],  # 推荐问题（如果有）
                "metadata": Dict           # 元数据
            }
        """
        logger.info(f"📝 处理查询: {query[:50]}... (模式: {self.mode})")
        
        # 根据模式选择处理策略
        if self.mode == "safe":
            return await self._process_safe_mode(query, context_messages, **kwargs)
        elif self.mode == "standard":
            return await self._process_standard_mode(query, context_messages, **kwargs)
        elif self.mode == "enhanced":
            return await self._process_enhanced_mode(query, context_messages, **kwargs)
        else:
            logger.warning(f"⚠️  未知模式: {self.mode}，使用标准模式")
            return await self._process_standard_mode(query, context_messages, **kwargs)
    
    async def _process_safe_mode(
        self,
        query: str,
        context_messages: List[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """安全模式处理逻辑
        
        策略：
        1. 精确匹配固定Q&A
        2. 如果没有精确匹配，返回相似问题推荐
        3. 不生成AI答案，不联网搜索
        """
        logger.info("🔒 使用安全模式处理")
        
        from app.core.fixed_qa_matcher import FixedQAMatcher
        
        # 1. 精确匹配固定Q&A
        matcher = FixedQAMatcher(self.app.id)
        exact_match = await matcher.find_exact_match(
            query,
            threshold=self.config.get('fixed_qa_threshold', 0.85)
        )
        
        if exact_match:
            logger.info(f"✅ 找到精确匹配 (置信度: {exact_match['confidence']:.2%})")
            return {
                "answer": exact_match['answer'],
                "source": "fixed_qa_exact",
                "confidence": exact_match['confidence'],
                "references": [{
                    "type": "fixed_qa",
                    "content": exact_match['answer'],
                    "metadata": {
                        "qa_id": exact_match['id'],
                        "question": exact_match['question'],
                        "category": exact_match.get('category')
                    }
                }],
                "recommendations": [],
                "metadata": {
                    "mode": "safe",
                    "match_type": "exact",
                    "note": "【官方答案】"
                }
            }
        
        # 2. 查找相似问题
        similar_questions = await matcher.find_similar_questions(
            query,
            top_k=self.config.get('recommend_count', 5),
            threshold=self.config.get('recommend_threshold', 0.65)
        )
        
        if similar_questions:
            logger.info(f"💡 找到 {len(similar_questions)} 个相似问题")
            fallback_msg = self.config.get('fallback_message', '抱歉，未找到准确答案。以下是相关问题推荐：')
            
            return {
                "answer": fallback_msg,
                "source": "fixed_qa_recommend",
                "confidence": 0.0,
                "references": [],
                "recommendations": similar_questions,
                "metadata": {
                    "mode": "safe",
                    "match_type": "recommend",
                    "note": "【相似问题推荐】"
                }
            }
        
        # 3. 完全没有匹配
        logger.warning("❌ 未找到任何匹配")
        return {
            "answer": "抱歉，未找到相关答案。请尝试换个方式提问或联系人工客服。",
            "source": "none",
            "confidence": 0.0,
            "references": [],
            "recommendations": [],
            "metadata": {
                "mode": "safe",
                "match_type": "none",
                "note": "【无匹配结果】"
            }
        }
    
    async def _process_standard_mode(
        self,
        query: str,
        context_messages: List[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """标准模式处理逻辑
        
        策略：
        1. 精确匹配固定Q&A
        2. 相似固定Q&A推荐（可选择继续AI生成）
        3. 向量知识库检索 + AI生成
        4. 不联网搜索
        """
        logger.info("⚡ 使用标准模式处理")
        
        from app.core.fixed_qa_matcher import FixedQAMatcher
        from app.core.hybrid_retrieval_engine import HybridRetrievalEngine
        
        # 1. 精确匹配固定Q&A
        matcher = FixedQAMatcher(self.app.id)
        exact_match = await matcher.find_exact_match(
            query,
            threshold=self.config.get('fixed_qa_threshold', 0.90)
        )
        
        if exact_match:
            logger.info(f"✅ 固定Q&A精确匹配 (置信度: {exact_match['confidence']:.2%})")
            
            # 同时获取相似问题推荐
            similar_questions = await matcher.find_similar_questions(
                query,
                top_k=self.config.get('recommend_count', 3),
                threshold=0.65
            )
            
            return {
                "answer": exact_match['answer'],
                "source": "fixed_qa_exact",
                "confidence": exact_match['confidence'],
                "references": [{
                    "type": "fixed_qa",
                    "content": exact_match['answer'],
                    "metadata": {
                        "qa_id": exact_match['id'],
                        "question": exact_match['question']
                    }
                }],
                "recommendations": similar_questions[:3],  # 最多3个推荐
                "metadata": {
                    "mode": "standard",
                    "match_type": "exact",
                    "note": "【官方答案】"
                }
            }
        
        # 2. 查找相似问题（高置信度）
        similar_questions = await matcher.find_similar_questions(
            query,
            top_k=1,
            threshold=self.config.get('fixed_qa_recommend_threshold', 0.70)
        )
        
        if similar_questions and similar_questions[0]['confidence'] > 0.70:
            logger.info(f"💡 找到高置信度相似问题 (置信度: {similar_questions[0]['confidence']:.2%})")
            
            # 获取更多推荐
            more_similar = await matcher.find_similar_questions(query, top_k=5, threshold=0.60)
            
            return {
                "answer": similar_questions[0]['answer'],
                "source": "fixed_qa_similar",
                "confidence": similar_questions[0]['confidence'],
                "references": [{
                    "type": "fixed_qa",
                    "content": similar_questions[0]['answer'],
                    "metadata": {
                        "qa_id": similar_questions[0]['id'],
                        "question": similar_questions[0]['question'],
                        "original_question": query
                    }
                }],
                "recommendations": more_similar[1:4],  # 显示其他相关问题
                "metadata": {
                    "mode": "standard",
                    "match_type": "similar",
                    "note": "【相似问题匹配】"
                }
            }
        
        # 3. 使用知识库 + AI生成答案
        logger.info("🤖 使用知识库检索 + AI生成")
        
        retrieval_engine = HybridRetrievalEngine(db=kwargs.get('db'))
        
        result = await retrieval_engine.retrieve_and_generate(
            app_id=self.app.id,
            query=query,
            context_messages=context_messages,
            config=self.config
        )
        
        # 添加模式信息
        result['metadata']['mode'] = 'standard'
        if result['confidence'] < self.config.get('vector_kb_threshold', 0.75):
            result['metadata']['note'] = self.config.get('ai_generation_note', '【AI生成-建议核实】')
        
        # 添加相似问题推荐
        all_similar = await matcher.find_similar_questions(query, top_k=3, threshold=0.60)
        result['recommendations'] = all_similar
        
        return result
    
    async def _process_enhanced_mode(
        self,
        query: str,
        context_messages: List[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """增强模式处理逻辑
        
        策略：
        1. 精确匹配固定Q&A
        2. 向量知识库检索
        3. 如果置信度低，自动联网搜索
        4. AI综合生成答案
        """
        logger.info("🌐 使用增强模式处理")
        
        from app.core.fixed_qa_matcher import FixedQAMatcher
        from app.core.hybrid_retrieval_engine import HybridRetrievalEngine
        
        # 1. 精确匹配固定Q&A（阈值更高）
        matcher = FixedQAMatcher(self.app.id)
        exact_match = await matcher.find_exact_match(
            query,
            threshold=self.config.get('fixed_qa_threshold', 0.95)
        )
        
        if exact_match:
            logger.info(f"✅ 固定Q&A精确匹配 (置信度: {exact_match['confidence']:.2%})")
            return {
                "answer": exact_match['answer'],
                "source": "fixed_qa_exact",
                "confidence": exact_match['confidence'],
                "references": [{
                    "type": "fixed_qa",
                    "content": exact_match['answer'],
                    "metadata": {"qa_id": exact_match['id']}
                }],
                "recommendations": [],
                "metadata": {
                    "mode": "enhanced",
                    "match_type": "exact",
                    "note": "【官方答案】"
                }
            }
        
        # 2. 知识库检索 + 可能的联网搜索
        retrieval_engine = HybridRetrievalEngine(db=kwargs.get('db'))
        
        # 先尝试知识库检索
        kb_result = await retrieval_engine.retrieve_from_kb(
            app_id=self.app.id,
            query=query,
            top_k=self.config.get('top_k', 8)
        )
        
        # 判断是否需要联网搜索
        need_web_search = False
        if kb_result and kb_result.get('confidence', 0) < self.config.get('web_search_auto_threshold', 0.50):
            need_web_search = True
            logger.info(f"⚠️  知识库置信度低 ({kb_result['confidence']:.2%})，启动联网搜索")
        elif not kb_result:
            need_web_search = True
            logger.info("⚠️  知识库无结果，启动联网搜索")
        
        # 3. 联网搜索（如果需要）
        web_results = []
        if need_web_search and self.config.get('allow_web_search', True):
            try:
                web_results = await retrieval_engine.web_search(
                    query=query,
                    config=self.config
                )
                logger.info(f"🌐 联网搜索找到 {len(web_results)} 条结果")
            except Exception as e:
                logger.error(f"❌ 联网搜索失败: {e}")
        
        # 4. AI综合生成答案
        result = await retrieval_engine.generate_answer(
            query=query,
            kb_results=kb_result.get('references', []) if kb_result else [],
            web_results=web_results,
            context_messages=context_messages,
            config=self.config
        )
        
        # 添加模式信息
        result['metadata']['mode'] = 'enhanced'
        result['metadata']['web_search_used'] = len(web_results) > 0
        
        if web_results:
            result['metadata']['note'] = self.config.get('web_search_note', '【含联网信息】')
        else:
            result['metadata']['note'] = self.config.get('ai_generation_note', '【AI综合-建议核实】')
        
        return result
    
    def get_mode_info(self) -> Dict[str, Any]:
        """获取当前模式信息"""
        from app.core.mode_presets import get_mode_description
        return {
            "mode": self.mode,
            "config": self.config,
            "description": get_mode_description(self.mode)
        }


# 快速访问函数
async def process_query_with_mode(
    application: 'Application',
    query: str,
    context_messages: List[Dict] = None,
    **kwargs
) -> Dict[str, Any]:
    """快速处理查询的便捷函数
    
    Args:
        application: 应用实例
        query: 查询文本
        context_messages: 上下文消息
        **kwargs: 其他参数
        
    Returns:
        处理结果字典
    """
    handler = ModeHandler(application)
    return await handler.process_query(query, context_messages, **kwargs)

