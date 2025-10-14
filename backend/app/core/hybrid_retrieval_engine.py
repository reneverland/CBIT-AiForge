"""
混合检索引擎 - 核心检索系统
支持固定Q&A、向量检索、实时搜索的多源融合
"""

from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
from datetime import datetime
import time

from app.core.embedding_engine import embedding_engine
from app.core.rag_engine import rag_engine
from app.core.accurate_priority_strategy import accurate_priority_strategy


class HybridRetrievalEngine:
    """
    混合检索引擎
    实现优先级路由、双阈值策略、权重融合等高级检索功能
    """
    
    def __init__(self):
        pass
    
    async def retrieve(
        self,
        query: str,
        app_config: Dict[str, Any],
        fixed_qa_pairs: List[Dict[str, Any]],
        knowledge_bases: List[Dict[str, Any]],
        embedding_provider_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        混合检索主入口
        
        Args:
            query: 用户查询
            app_config: 应用配置
            fixed_qa_pairs: 固定Q&A对列表
            knowledge_bases: 知识库列表
            embedding_provider_config: Embedding提供商配置
        
        Returns:
            检索结果，包含匹配来源、内容、相似度等信息
        """
        start_time = time.time()
        
        # 预处理
        preprocessing_start = time.time()
        preprocessing_info = await self._preprocess_query(query, app_config)
        preprocessing_time = (time.time() - preprocessing_start) * 1000
        
        # 检索路径追踪
        retrieval_path = []
        all_results = []
        
        # 1. 固定Q&A检索（第一优先级）
        if app_config.get("enable_fixed_qa", False) and fixed_qa_pairs:
            retrieval_start = time.time()
            fixed_qa_results = await self._search_fixed_qa(
                query,
                fixed_qa_pairs,
                app_config,
                embedding_provider_config
            )
            retrieval_time = (time.time() - retrieval_start) * 1000
            
            if fixed_qa_results:
                retrieval_path.append({
                    "source": "fixed_qa",
                    "time_ms": retrieval_time,
                    "results_count": len(fixed_qa_results)
                })
                
                for result in fixed_qa_results:
                    result["source"] = "fixed_qa"
                    result["weighted_score"] = result["similarity"] * app_config.get("fixed_qa_weight", 1.0)
                    all_results.append(result)
        
        # 2. 向量知识库检索
        if app_config.get("enable_vector_kb", False) and knowledge_bases:
            retrieval_start = time.time()
            kb_results = await self._search_knowledge_bases(
                query,
                knowledge_bases,
                app_config,
                embedding_provider_config
            )
            retrieval_time = (time.time() - retrieval_start) * 1000
            
            if kb_results:
                retrieval_path.append({
                    "source": "vector_kb",
                    "time_ms": retrieval_time,
                    "results_count": len(kb_results)
                })
                
                for result in kb_results:
                    result["source"] = "kb"
                    result["weighted_score"] = result["similarity"] * app_config.get("vector_kb_weight", 1.0)
                    all_results.append(result)
        
        # 3. 智能联网搜索（根据策略模式和阈值触发）
        should_trigger_web_search = False
        if app_config.get("enable_web_search", False):
            # 获取触发阈值（从fusion_config或直接从app_config）
            web_search_trigger_threshold = 0.70  # 默认值
            if app_config.get("fusion_config") and app_config["fusion_config"].get("strategy"):
                web_search_trigger_threshold = app_config["fusion_config"]["strategy"].get("web_search_trigger_threshold", 0.70)
            
            # 获取策略模式
            strategy_mode = app_config.get("strategy_mode", "safe_priority")
            
            # 🔑 关键：如果阈值设置为0.0，说明是强制联网搜索（force_web_search，用户明确授权）
            if web_search_trigger_threshold == 0.0:
                should_trigger_web_search = True
                logger.info(f"🌐 用户明确授权强制联网搜索（阈值=0.0）")
            else:
                # 检查现有结果的最高置信度
                max_confidence = 0.0
                if all_results:
                    max_confidence = max(result.get("similarity", 0) for result in all_results)
                    logger.info(f"📊 当前最高置信度: {max_confidence:.2f}, 策略模式: {strategy_mode}")
                
                # 🛡️ 安全优先模式：不自动触发联网，留给 app_inference 提示用户授权
                if strategy_mode == "safe_priority":
                    logger.info(f"🛡️ 安全优先模式，不自动触发联网（将在低置信度时提示用户授权）")
                    should_trigger_web_search = False
                
                # 🌐 实时知识模式：根据自动联网阈值触发
                elif strategy_mode == "realtime_knowledge":
                    web_search_auto_threshold = app_config.get("web_search_auto_threshold", 0.50)
                    if max_confidence < web_search_auto_threshold:
                        should_trigger_web_search = True
                        logger.info(f"🌐 实时知识模式，自动触发联网 (最高置信度 {max_confidence:.2f} < 自动阈值 {web_search_auto_threshold})")
                    else:
                        logger.info(f"✋ 实时知识模式，跳过联网 (最高置信度 {max_confidence:.2f} >= 自动阈值 {web_search_auto_threshold})")
                
                # 兼容旧配置：如果没有设置策略模式，使用旧逻辑
                else:
                    if max_confidence < web_search_trigger_threshold:
                        should_trigger_web_search = True
                        logger.info(f"🌐 触发联网搜索 (最高置信度 {max_confidence:.2f} < 阈值 {web_search_trigger_threshold})")
                    else:
                        logger.info(f"✋ 跳过联网搜索 (最高置信度 {max_confidence:.2f} >= 阈值 {web_search_trigger_threshold})")
        
        if should_trigger_web_search:
            retrieval_start = time.time()
            web_results = await self._search_web(
                query,
                app_config
            )
            retrieval_time = (time.time() - retrieval_start) * 1000
            
            if web_results:
                retrieval_path.append({
                    "source": "web_search",
                    "time_ms": retrieval_time,
                    "results_count": len(web_results)
                })
                
                for result in web_results:
                    # 保留原始的source（tavily_answer/tavily_web），但添加web标记用于分类
                    if "source" not in result:
                        result["source"] = "web"
                    result["search_type"] = "web"  # 添加搜索类型标记
                    
                    # 确保有similarity字段（联网搜索可能使用relevance）
                    if "similarity" not in result and "relevance" in result:
                        result["similarity"] = result["relevance"]
                    elif "similarity" not in result:
                        result["similarity"] = 0.5  # 默认中等相似度
                    
                    result["weighted_score"] = result.get("similarity", 0) * app_config.get("web_search_weight", 0.6)
                    all_results.append(result)
            else:
                retrieval_path.append({
                    "source": "web_search",
                    "time_ms": retrieval_time,
                    "results_count": 0,
                    "status": "未配置或暂不可用"
                })
                logger.warning("⚠️ 联网搜索已启用但未返回结果（可能未配置搜索引擎）")
        
        # 计算总检索时间
        retrieval_time_total = (time.time() - start_time) * 1000
        
        # 应用融合策略
        fusion_start = time.time()
        final_result = await self._apply_fusion_strategy(
            all_results,
            app_config
        )
        fusion_time = (time.time() - fusion_start) * 1000
        
        # 总时间
        total_time = (time.time() - start_time) * 1000
        
        # 提取策略信息（如果存在）
        strategy_info = final_result.get("_strategy_info") if final_result else None
        
        return {
            "query": query,
            "matched_source": final_result.get("source") if final_result else None,
            "confidence_score": final_result.get("similarity") if final_result else 0.0,  # 使用原始相似度，不是加权分数
            "weighted_score": final_result.get("weighted_score") if final_result else 0.0,  # 保留加权分数供内部使用
            "raw_score": final_result.get("similarity") if final_result else 0.0,
            "_strategy_info": strategy_info,  # 传递策略信息到上层
            "answer": final_result.get("answer") if final_result else None,
            "references": self._extract_references(all_results, app_config),
            "suggestions": self._generate_suggestions(all_results, app_config),
            "has_suggestions": len(self._generate_suggestions(all_results, app_config)) > 0,
            "retrieval_path": retrieval_path,
            "preprocessing_info": preprocessing_info,
            "fusion_details": {
                "strategy": app_config.get("fusion_strategy", "weighted_avg"),
                "total_candidates": len(all_results),
                "selected": final_result is not None
            },
            "timing": {
                "preprocessing_ms": round(preprocessing_time, 2),
                "retrieval_ms": round(retrieval_time_total, 2),
                "fusion_ms": round(fusion_time, 2),
                "total_ms": round(total_time, 2)
            }
        }
    
    async def _preprocess_query(
        self,
        query: str,
        app_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """预处理查询"""
        info = {
            "original_query": query,
            "processed_query": query,
            "detected_language": "unknown",
            "detected_intent": "unknown",
            "is_filtered": False
        }
        
        if not app_config.get("enable_preprocessing", True):
            return info
        
        # 语言检测
        if app_config.get("enable_language_detection", True):
            # 简单的语言检测（可以替换为更复杂的实现）
            if any('\u4e00' <= char <= '\u9fff' for char in query):
                info["detected_language"] = "zh"
            else:
                info["detected_language"] = "en"
        
        # 意图识别
        if app_config.get("enable_intent_recognition", True):
            # 简单的意图识别（可以替换为ML模型）
            if any(word in query.lower() for word in ["how", "什么", "如何", "怎么"]):
                info["detected_intent"] = "question"
            elif any(word in query.lower() for word in ["help", "帮助", "问题"]):
                info["detected_intent"] = "help"
            else:
                info["detected_intent"] = "general"
        
        # 敏感词过滤
        if app_config.get("enable_sensitive_filter", False):
            sensitive_words = app_config.get("sensitive_words", [])
            for word in sensitive_words:
                if word.lower() in query.lower():
                    info["is_filtered"] = True
                    break
        
        return info
    
    async def _search_fixed_qa(
        self,
        query: str,
        fixed_qa_pairs: List[Dict[str, Any]],
        app_config: Dict[str, Any],
        embedding_provider_config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """搜索固定Q&A对（支持智能匹配模式）"""
        if not fixed_qa_pairs or not embedding_provider_config:
            return []
        
        try:
            # 从fusion_config中获取固定Q&A配置
            fusion_config = app_config.get("fusion_config", {})
            fixed_qa_config = fusion_config.get("fixed_qa", {})
            
            # 获取配置参数，优先使用fusion_config中的配置
            mode = fixed_qa_config.get("mode", "smart")
            direct_threshold = fixed_qa_config.get("direct_match_threshold", 0.90)
            suggest_threshold = fixed_qa_config.get("suggest_threshold", 0.70)
            qa_min_threshold = fixed_qa_config.get("qa_min_threshold", 0.50)  # 最低匹配阈值
            max_suggestions = fixed_qa_config.get("max_suggestions", 3)
            
            logger.info(f"🔍 固定Q&A配置 - 模式: {mode}, 直接阈值: {direct_threshold}, 建议阈值: {suggest_threshold}, 最低阈值: {qa_min_threshold}")
            
            # 🚀 问题扩展：生成多个同义问法以提高匹配率
            from app.core.qa_expansion import qa_expansion
            expanded_queries = qa_expansion.expand_question(query)
            
            if len(expanded_queries) > 1:
                logger.info(f"📝 问题扩展: '{query}' -> {expanded_queries}")
            
            # 为所有扩展问题生成向量（批量处理）
            if len(expanded_queries) == 1:
                query_vectors = [await embedding_engine.embed_text(query, embedding_provider_config)]
            else:
                query_vectors = await embedding_engine.embed_texts(expanded_queries, embedding_provider_config)
            
            # 使用原始问题的向量作为主向量
            primary_query_vector = query_vectors[0]
            
            # 计算所有Q&A对的相似度（使用多个查询向量取最高分）
            all_matches = []
            for qa in fixed_qa_pairs:
                if qa.get("embedding_vector") and qa.get("is_active", True):
                    # 计算与所有扩展问题的相似度，取最高值
                    max_similarity = 0.0
                    for query_vec in query_vectors:
                        similarity = embedding_engine.compute_similarity(
                            query_vec,
                            qa["embedding_vector"]
                        )
                        max_similarity = max(max_similarity, similarity)
                    
                    # 🎯 关键词加成：如果问题包含关键词，给予小幅加成
                    keyword_boost = 0.0
                    qa_question_lower = qa["question"].lower()
                    
                    # 提取查询关键词
                    keywords = qa_expansion.extract_keywords(query)
                    matching_keywords = sum(1 for kw in keywords if kw.lower() in qa_question_lower)
                    
                    if matching_keywords > 0:
                        keyword_boost = min(0.05 * matching_keywords, 0.15)  # 最多加15%
                        logger.debug(f"🔑 关键词匹配: {matching_keywords}个 -> +{keyword_boost:.2%} 加成")
                    
                    final_similarity = min(max_similarity + keyword_boost, 1.0)  # 不超过1.0
                    
                    # ✅ 应用最低阈值过滤
                    if final_similarity >= qa_min_threshold:
                        all_matches.append({
                            "id": qa["id"],
                            "question": qa["question"],
                            "answer": qa["answer"],
                            "category": qa.get("category"),
                            "similarity": final_similarity,
                            "priority": qa.get("priority", 0),
                            "_raw_similarity": max_similarity,  # 保存原始相似度用于调试
                            "_keyword_boost": keyword_boost
                        })
                        logger.debug(f"✅ Q&A通过最低阈值: '{qa['question'][:30]}...' 相似度={final_similarity:.2f} >= {qa_min_threshold:.2f}")
                    else:
                        logger.debug(f"❌ Q&A被最低阈值过滤: '{qa['question'][:30]}...' 相似度={final_similarity:.2f} < {qa_min_threshold:.2f}")
            
            # 按相似度和优先级排序
            all_matches.sort(key=lambda x: (x["similarity"], x["priority"]), reverse=True)
            
            # 根据模式返回结果
            results = []
            
            if mode == "smart":
                # 智能模式：根据相似度自动决定
                for match in all_matches:
                    if match["similarity"] >= direct_threshold:
                        # 高相似度：标记为直接回答
                        match["match_type"] = "direct"
                        results.append(match)
                    elif match["similarity"] >= suggest_threshold:
                        # 中等相似度：标记为建议
                        match["match_type"] = "suggest"
                        results.append(match)
                        if len([r for r in results if r.get("match_type") == "suggest"]) >= max_suggestions:
                            break
            
            elif mode == "suggest":
                # 建议模式：始终返回建议列表
                for match in all_matches[:max_suggestions]:
                    if match["similarity"] >= suggest_threshold:
                        match["match_type"] = "suggest"
                        results.append(match)
            
            elif mode == "strict":
                # 严格模式：只有极高相似度才使用
                for match in all_matches:
                    if match["similarity"] >= direct_threshold:
                        match["match_type"] = "direct"
                        results.append(match)
                    if len(results) >= 1:  # 严格模式只返回最佳匹配
                        break
            
            logger.info(f"✅ 固定Q&A匹配结果: {len(results)}个，其中直接:{len([r for r in results if r.get('match_type')=='direct'])}个，建议:{len([r for r in results if r.get('match_type')=='suggest'])}个")
            
            return results
            
        except Exception as e:
            logger.error(f"固定Q&A搜索失败: {e}")
            return []
    
    async def _search_knowledge_bases(
        self,
        query: str,
        knowledge_bases: List[Dict[str, Any]],
        app_config: Dict[str, Any],
        embedding_provider_config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """搜索向量知识库"""
        if not knowledge_bases:
            return []
        
        all_results = []
        
        # 需要获取向量数据库配置
        from app.models.database import SessionLocal, VectorDBProvider
        from app.core.rag_engine import RAGEngine
        
        db = SessionLocal()
        try:
            # 获取默认的向量数据库提供商配置
            vector_db_provider = db.query(VectorDBProvider).filter(
                VectorDBProvider.is_default == True
            ).first()
            
            if not vector_db_provider:
                logger.warning("未找到默认向量数据库提供商配置")
                return []
            
            vector_db_config = {
                "name": vector_db_provider.name,
                "provider_type": vector_db_provider.provider_type,
                "host": vector_db_provider.host,
                "port": vector_db_provider.port
            }
            
            # 添加 API key（如果有）
            if vector_db_provider.api_key:
                vector_db_config["api_key"] = vector_db_provider.api_key
            
            # 判断是否使用 HTTPS
            if vector_db_provider.provider_type == "qdrant" and ('qdrant.io' in (vector_db_provider.host or '') or vector_db_provider.port in [443, 6334]):
                vector_db_config["https"] = True
            
            # 创建带配置的RAG引擎实例
            rag = RAGEngine(
                embedding_provider_config=embedding_provider_config,
                vector_db_provider_config=vector_db_config
            )
            
            # 从fusion_config中获取向量检索配置
            fusion_config = app_config.get("fusion_config", {})
            vector_retrieval_config = fusion_config.get("vector_retrieval", {})
            
            # 获取检索参数，优先使用fusion_config中的配置
            min_similarity_score = vector_retrieval_config.get("min_similarity_score", 
                                                               app_config.get("similarity_threshold_low", 0.75))
            max_results = vector_retrieval_config.get("max_results", 
                                                      app_config.get("top_k", 5))
            rerank_enabled = vector_retrieval_config.get("rerank_enabled", False)
            hybrid_search_enabled = vector_retrieval_config.get("hybrid_search_enabled", False)
            
            logger.info(f"🔍 向量检索配置 - 最小相似度: {min_similarity_score}, 最大结果数: {max_results}, "
                       f"重排序: {rerank_enabled}, 混合搜索: {hybrid_search_enabled}")
            
            for kb in knowledge_bases:
                try:
                    # 使用RAG引擎查询
                    results = await rag.query(
                        collection_name=kb["collection_name"],
                        query_text=query,
                        n_results=max_results
                    )
                    
                    if results and results.get("documents"):
                        for i, doc in enumerate(results["documents"]):
                            # 计算加权分数
                            # 向量数据库返回的distance需要转换为similarity
                            distance = results["distances"][i] if results.get("distances") else 0
                            similarity = 1.0 / (1.0 + distance)  # 简单的距离转相似度
                            
                            # 应用知识库权重
                            kb_weight = kb.get("weight", 1.0)
                            boost_factor = kb.get("boost_factor", 1.0)
                            
                            weighted_similarity = similarity * kb_weight * boost_factor
                            
                            # 应用阈值过滤 - 优先使用新的融合策略配置
                            fusion_config = app_config.get("fusion_config", {})
                            strategy_config = fusion_config.get("strategy", {})
                            kb_min_threshold = strategy_config.get("kb_min_threshold", min_similarity_score)
                            
                            # 详细日志：显示阈值应用过程
                            logger.info(f"🎯 知识库 [{kb['name']}] 文档相似度: {similarity:.4f}, 阈值: {kb_min_threshold:.4f}")
                            
                            if similarity >= kb_min_threshold:
                                all_results.append({
                                    "kb_id": kb["id"],
                                    "kb_name": kb["name"],
                                    "text": doc,
                                    "metadata": results["metadatas"][i] if results.get("metadatas") else {},
                                    "similarity": similarity,
                                    "weighted_similarity": weighted_similarity,
                                    "kb_weight": kb_weight,
                                    "answer": doc  # 对于知识库，文本内容即为答案
                                })
                                logger.info(f"✅ 知识库 [{kb['name']}] 文档通过阈值检查，相似度: {similarity:.4f} >= {kb_min_threshold:.4f}")
                            else:
                                logger.info(f"❌ 知识库 [{kb['name']}] 文档被阈值过滤，相似度 {similarity:.4f} < {kb_min_threshold:.4f}")
                
                except Exception as e:
                    logger.error(f"搜索知识库 {kb.get('name')} 失败: {e}", exc_info=True)
                    continue
            
            # 按加权相似度排序
            all_results.sort(key=lambda x: x["weighted_similarity"], reverse=True)
            
            # 限制返回数量
            return all_results[:max_results]
            
        finally:
            db.close()
    
    async def _kb_priority_strategy(
        self,
        results: List[Dict[str, Any]],
        app_config: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        知识库优先策略（推荐预设）
        - 知识库是主力，有优先权
        - 联网搜索是锦上添花，在知识库不足时补充
        """
        if not results:
            return None
        
        # 获取策略配置（优先新配置，兼容旧配置）
        fusion_config = app_config.get("fusion_config", {})
        strategy_config = fusion_config.get("strategy", {})
        
        # 知识库优先策略参数（默认值）
        kb_absolute_priority_threshold = strategy_config.get("kb_absolute_priority_threshold", 0.85)
        kb_priority_threshold = strategy_config.get("kb_priority_threshold", 0.70)
        kb_priority_bonus = strategy_config.get("kb_priority_bonus", 0.15)
        
        # 分离不同来源的结果
        fixed_qa_results = [r for r in results if r.get("source") == "fixed_qa"]
        kb_results = [r for r in results if r.get("source") == "kb"]
        web_results = [r for r in results if r.get("source") in ["web", "tavily_answer", "tavily_web"]]
        
        # 获取各来源的最佳结果
        best_fixed_qa = max(fixed_qa_results, key=lambda x: x.get("similarity", 0)) if fixed_qa_results else None
        best_kb = max(kb_results, key=lambda x: x.get("similarity", 0)) if kb_results else None
        best_web = max(web_results, key=lambda x: x.get("similarity", 0)) if web_results else None
        
        # 策略0: 固定Q&A优先（如果存在高质量匹配）
        if best_fixed_qa and best_fixed_qa.get("similarity", 0) >= 0.90:
            logger.info(f"💎 固定Q&A高匹配 {best_fixed_qa.get('similarity', 0):.1%}，直接采用")
            return best_fixed_qa
        
        # 策略1: 知识库高置信度（≥85%）→ 直接使用知识库
        if best_kb and best_kb.get("similarity", 0) >= kb_absolute_priority_threshold:
            kb_score = best_kb.get("similarity", 0)
            logger.info(f"✅ 知识库高置信度 {kb_score:.1%}（≥{kb_absolute_priority_threshold:.0%}），直接采用")
            return best_kb
        
        # 策略2: 知识库中等置信度（70-85%）→ 知识库优先，但给联网机会
        if best_kb and best_kb.get("similarity", 0) >= kb_priority_threshold:
            kb_score = best_kb.get("similarity", 0)
            
            if best_web:
                web_score = best_web.get("similarity", 0)
                # 联网搜索需要明显更好（超过知识库 + bonus）
                required_web_score = kb_score + kb_priority_bonus
                
                if web_score > required_web_score:
                    logger.info(
                        f"🌐 联网搜索显著更好 "
                        f"(Web {web_score:.1%} > KB {kb_score:.1%} + {kb_priority_bonus:.0%} = {required_web_score:.1%})"
                    )
                    return best_web
                else:
                    logger.info(
                        f"📚 知识库优先 "
                        f"(KB {kb_score:.1%} vs Web {web_score:.1%}，差距未达 {kb_priority_bonus:.0%})"
                    )
                    return best_kb
            else:
                logger.info(f"📚 知识库中等置信度 {kb_score:.1%}，无联网结果，采用知识库")
                return best_kb
        
        # 策略3: 知识库低置信度（<70%）→ 公平竞争
        kb_info = f"{best_kb.get('similarity', 0):.1%}" if best_kb else "无"
        logger.info(
            f"⚖️ 知识库置信度较低 (KB: {kb_info}), 按加权分数公平竞争"
        )
        
        # 按加权分数排序，选择最佳结果
        results_sorted = sorted(results, key=lambda x: x.get("weighted_score", 0), reverse=True)
        best_result = results_sorted[0] if results_sorted else None
        
        if best_result:
            source_display = {
                "fixed_qa": "固定Q&A",
                "kb": "知识库",
                "tavily_answer": "Cbit AI搜索",
                "tavily_web": "Cbit AI搜索",
                "web": "联网搜索"
            }.get(best_result.get("source"), best_result.get("source"))
            
            logger.info(
                f"🏆 公平竞争结果: {source_display} "
                f"(相似度 {best_result.get('similarity', 0):.1%}, "
                f"加权分数 {best_result.get('weighted_score', 0):.2f})"
            )
        
        return best_result
    
    async def _apply_fusion_strategy(
        self,
        results: List[Dict[str, Any]],
        app_config: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """应用融合策略"""
        if not results:
            return None
        
        fusion_strategy = app_config.get("fusion_strategy", "weighted_avg")
        threshold_high = app_config.get("similarity_threshold_high", 0.90)
        threshold_low = app_config.get("similarity_threshold_low", 0.75)
        
        # 准确优先策略（最严格）
        if fusion_strategy == "accurate_priority":
            strategy_result = await accurate_priority_strategy.apply_strategy(results, app_config)
            # A档或B档：返回final_result，但附加策略信息
            final = strategy_result.get("final_result")
            if final:
                # 🔑 关键：创建strategy_info副本，避免循环引用
                strategy_info_for_response = {
                    "tier": strategy_result.get("tier"),
                    "confidence_level": strategy_result.get("confidence_level"),
                    "citations": strategy_result.get("citations", []),
                    "explanation": strategy_result.get("explanation"),
                    "web_search_option": strategy_result.get("web_search_option", False),
                    "custom_message": strategy_result.get("custom_message")
                }
                final["_strategy_info"] = strategy_info_for_response
                return final
            # C档：没有final_result，但仍需传递策略信息
            # 创建一个虚拟结果来携带策略信息
            strategy_info_for_response = {
                "tier": strategy_result.get("tier"),
                "confidence_level": strategy_result.get("confidence_level"),
                "citations": strategy_result.get("citations", []),
                "explanation": strategy_result.get("explanation"),
                "web_search_option": strategy_result.get("web_search_option", False),
                "custom_message": strategy_result.get("custom_message")
            }
            return {
                "source": "no_result",
                "answer": None,
                "similarity": 0.0,
                "weighted_score": 0.0,
                "_strategy_info": strategy_info_for_response
            }
        
        # 知识库优先策略（推荐预设）
        if fusion_strategy == "kb_priority":
            final = await self._kb_priority_strategy(results, app_config)
            # 为所有策略添加统一的citations
            if final:
                final["_strategy_info"] = self._generate_unified_strategy_info(final, results, app_config)
            return final
        
        # 优先级路由策略
        if fusion_strategy == "priority":
            # 按来源优先级：fixed_qa > kb > web > llm
            for source_type in ["fixed_qa", "kb", "web"]:
                for result in results:
                    if result.get("source") == source_type:
                        # 检查是否达到高阈值
                        if result.get("similarity", 0) >= threshold_high:
                            result["_strategy_info"] = self._generate_unified_strategy_info(result, results, app_config)
                            return result
            
            # 如果没有达到高阈值，返回最高分的
            final = results[0] if results else None
            if final:
                final["_strategy_info"] = self._generate_unified_strategy_info(final, results, app_config)
            return final
        
        # 加权平均策略
        elif fusion_strategy == "weighted_avg":
            # 按加权分数排序
            results_sorted = sorted(results, key=lambda x: x.get("weighted_score", 0), reverse=True)
            final = results_sorted[0] if results_sorted else None
            if final:
                final["_strategy_info"] = self._generate_unified_strategy_info(final, results, app_config)
            return final
        
        # 最大值优先策略
        elif fusion_strategy == "max_score":
            # 返回原始相似度最高的
            results_sorted = sorted(results, key=lambda x: x.get("similarity", 0), reverse=True)
            final = results_sorted[0] if results_sorted else None
            if final:
                final["_strategy_info"] = self._generate_unified_strategy_info(final, results, app_config)
            return final
        
        # 投票机制
        elif fusion_strategy == "voting":
            # 统计每个答案的票数（基于权重）
            answer_votes: Dict[str, float] = {}
            answer_results: Dict[str, Dict] = {}
            
            for result in results:
                answer = result.get("answer", "")
                weight = result.get("weighted_score", 0)
                
                if answer in answer_votes:
                    answer_votes[answer] += weight
                else:
                    answer_votes[answer] = weight
                    answer_results[answer] = result
            
            # 返回票数最高的
            if answer_votes:
                winning_answer = max(answer_votes, key=answer_votes.get)
                final = answer_results[winning_answer]
                if final:
                    final["_strategy_info"] = self._generate_unified_strategy_info(final, results, app_config)
                return final
            return None
        
        # 多源融合
        elif fusion_strategy == "multi_source_fusion":
            # 综合所有高质量来源
            high_quality_results = [
                r for r in results 
                if r.get("similarity", 0) >= threshold_low
            ]
            
            if not high_quality_results:
                return results[0] if results else None
            
            # 返回加权分数最高的
            return max(high_quality_results, key=lambda x: x.get("weighted_score", 0))
        
        # 默认返回第一个
        final = results[0] if results else None
        if final:
            final["_strategy_info"] = self._generate_unified_strategy_info(final, results, app_config)
        return final
    
    def _generate_unified_strategy_info(
        self,
        final_result: Dict[str, Any],
        all_results: List[Dict[str, Any]],
        app_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        为所有融合策略生成统一的策略信息和citations（仿OpenAI格式）
        确保所有预设都使用一致的引用来源显示样式
        """
        # 生成citations：以final_result为主，补充其他高相关结果
        relevant_results = self._get_relevant_results_for_citations(final_result, all_results)
        citations = self._generate_unified_citations(relevant_results)
        
        # 根据相似度判断置信度等级
        similarity = final_result.get("similarity", 0)
        if similarity >= 0.85:
            confidence_level = "high"
            tier = "A"
        elif similarity >= 0.70:
            confidence_level = "moderate"
            tier = "B"
        else:
            confidence_level = "low"
            tier = "C"
        
        # 生成简单的解释
        source_type = final_result.get("source", "")
        source_name_map = {
            "fixed_qa": "固定Q&A",
            "kb": "知识库",
            "web": "联网搜索",
            "tavily_answer": "联网搜索",
            "tavily_web": "联网搜索"
        }
        source_display = source_name_map.get(source_type, "知识源")
        
        # 🔑 根据来源类型使用不同的度量词
        # 联网搜索使用"相关度"，知识库/Q&A使用"相似度"
        if source_type in ["web", "tavily_answer", "tavily_web"]:
            # 联网搜索：只显示来源链接，不显示相关度百分比
            explanation = f"基于{source_display}检索结果"
            
            # 尝试获取第一个引用的链接作为主要来源
            if citations and len(citations) > 0:
                first_citation = citations[0]
                url = first_citation.get("url")
                source_name = first_citation.get("source_name", "")
                if url:
                    explanation += f" | 主要来源: {source_name} | 链接: {url}"
                elif source_name:
                    explanation += f" | 主要来源: {source_name}"
        else:
            # 知识库/Q&A：使用相似度
            metric_name = "相似度"
            explanation = f"基于{source_display}检索结果（{metric_name} {similarity*100:.1f}%）"
        
        return {
            "tier": tier,
            "confidence_level": confidence_level,
            "citations": citations,
            "explanation": explanation,
            "web_search_option": False,  # 非accurate_priority策略不显示联网按钮
            "custom_message": None
        }
    
    def _get_relevant_results_for_citations(
        self,
        final_result: Dict[str, Any],
        all_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        智能选择与最终回答相关的结果作为引用来源
        
        策略：
        1. 如果最终回答来自联网搜索，只显示联网搜索的引用
        2. 如果来自知识库，优先显示知识库的高相关结果
        3. 最多返回3个结果
        4. 按相似度/相关度降序排列
        """
        relevant_results = []
        final_source = final_result.get("source", "")
        
        # 🔑 关键：如果最终回答来自联网搜索，只选择联网搜索的引用
        if final_source in ["web", "tavily_answer", "tavily_web"]:
            logger.info(f"🌐 回答来自联网搜索，只选择联网搜索的引用来源")
            
            # 收集所有联网搜索结果
            web_results = [
                r for r in all_results 
                if r.get("source") in ["web", "tavily_answer", "tavily_web"]
            ]
            
            # 按相关度排序（tavily使用relevance，web使用similarity）
            web_results_sorted = sorted(
                web_results,
                key=lambda x: x.get("relevance", x.get("similarity", 0)),
                reverse=True
            )
            
            # 最多返回3个联网结果
            relevant_results = web_results_sorted[:3]
            
            logger.info(f"📚 选择了 {len(relevant_results)} 个联网搜索引用")
            for idx, res in enumerate(relevant_results, 1):
                relevance = res.get("relevance", res.get("similarity", 0))
                title = res.get("title", "")[:50]
                url = res.get("url", "")
                logger.info(f"  [{idx}] {res.get('source')} - 相关度: {relevance:.2%} - {title}")
                if url:
                    logger.info(f"       链接: {url}")
            
            return relevant_results
        
        # 如果不是联网搜索，使用原有逻辑（知识库、Q&A等）
        # 1. 首先添加 final_result（如果它有实际内容且不是 "no_result"）
        if final_result.get("source") != "no_result":
            # 确保 final_result 有文本内容
            has_content = (
                final_result.get("text") or 
                final_result.get("answer") or 
                final_result.get("content")
            )
            if has_content:
                relevant_results.append(final_result)
        
        # 2. 从 all_results 中选择其他高相关结果（同源类型优先）
        final_source_type = final_result.get("source", "")
        
        # 优先选择同源类型的结果
        same_source_results = []
        other_results = []
        
        for result in all_results:
            # 跳过 final_result（已添加）
            if result is final_result:
                continue
            
            # 跳过联网搜索结果（如果主结果不是联网的）
            if result.get("source") in ["web", "tavily_answer", "tavily_web"]:
                continue
            
            # 跳过低相似度结果
            similarity = result.get("similarity", 0)
            if similarity < 0.6:  # 提高阈值到60%
                continue
            
            # 跳过没有内容的结果
            has_content = (
                result.get("text") or 
                result.get("answer") or 
                result.get("content")
            )
            if not has_content:
                continue
            
            # 区分同源和异源
            if result.get("source") == final_source_type:
                same_source_results.append(result)
            else:
                other_results.append(result)
        
        # 优先添加同源结果，再添加异源结果
        for result in same_source_results:
            relevant_results.append(result)
            if len(relevant_results) >= 3:
                break
        
        if len(relevant_results) < 3:
            for result in other_results:
                relevant_results.append(result)
                if len(relevant_results) >= 3:
                    break
        
        # 3. 按相似度排序（保证最相关的在前面）
        relevant_results = sorted(
            relevant_results, 
            key=lambda x: x.get("similarity", 0), 
            reverse=True
        )[:3]
        
        logger.info(f"📚 为回答选择了 {len(relevant_results)} 个引用来源")
        for idx, res in enumerate(relevant_results, 1):
            logger.info(f"  [{idx}] {res.get('source')} - 相似度: {res.get('similarity', 0):.2%}")
        
        return relevant_results
    
    def _generate_unified_citations(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        生成统一格式的citations（仿OpenAI格式）
        与accurate_priority策略使用相同的格式
        """
        citations = []
        
        for idx, result in enumerate(results, 1):  # 使用传入的results，不再限制[:3]
            source_type = result.get("source", "")
            
            if source_type == "kb":
                # 知识库来源
                text = result.get("text", "")
                doc_title = text[:30] + "..." if len(text) > 30 else text
                
                citation = {
                    "id": idx,
                    "type": "kb",
                    "label": "KB",
                    "title": doc_title,
                    "source_name": result.get("kb_name", "知识库"),
                    "date": None,
                    "snippet": text,
                    "url": result.get("url"),
                    "_internal_score": result.get("similarity", 0)
                }
            elif source_type == "fixed_qa":
                # 固定Q&A来源
                citation = {
                    "id": idx,
                    "type": "qa",
                    "label": "KB",
                    "title": result.get("question", "")[:30],
                    "source_name": "固定Q&A",
                    "date": None,
                    "snippet": result.get("answer", ""),
                    "url": None,
                    "_internal_score": result.get("similarity", 0)
                }
            elif source_type in ["web", "tavily_answer", "tavily_web"]:
                # 联网搜索来源
                if source_type == "tavily_answer":
                    citation = {
                        "id": idx,
                        "type": "web",
                        "label": "Web",
                        "title": "AI综合答案",
                        "source_name": "网络搜索",
                        "date": None,
                        "snippet": result.get("answer", result.get("content", "")),
                        "url": None,
                        "_internal_score": result.get("relevance", result.get("similarity", 0))
                    }
                else:
                    url = result.get("url", "")
                    domain = url.split("//")[-1].split("/")[0] if url else "网页"
                    citation = {
                        "id": idx,
                        "type": "web",
                        "label": "Web",
                        "title": result.get("title", "网页")[:40],
                        "source_name": domain,
                        "date": None,
                        "snippet": result.get("content", ""),
                        "url": url,
                        "_internal_score": result.get("relevance", result.get("similarity", 0))
                    }
            else:
                # 其他来源
                citation = {
                    "id": idx,
                    "type": "other",
                    "label": "来源",
                    "title": "其他来源",
                    "source_name": source_type,
                    "date": None,
                    "snippet": result.get("text", result.get("content", "")),
                    "url": None,
                    "_internal_score": result.get("similarity", 0)
                }
            
            citations.append(citation)
        
        return citations
    
    def _extract_references(
        self,
        results: List[Dict[str, Any]],
        app_config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """提取引用信息，提供清晰的来源标注"""
        if not app_config.get("enable_citation", True):
            return []
        
        references = []
        
        # 按来源类型分组，确保每种类型都有代表
        sources_by_type = {
            "fixed_qa": [],
            "kb": [],
            "web": []  # 包括 tavily_answer, tavily_web, web
        }
        
        for result in results:
            source_type = result.get("source")
            if source_type == "fixed_qa":
                sources_by_type["fixed_qa"].append(result)
            elif source_type == "kb":
                sources_by_type["kb"].append(result)
            elif source_type in ["web", "tavily_answer", "tavily_web"]:
                sources_by_type["web"].append(result)
        
        # 从每种类型中取前2个，确保联网搜索结果也被包含
        selected_results = []
        for source_type in ["fixed_qa", "kb", "web"]:
            sources = sources_by_type[source_type]
            # 按相似度排序
            sources.sort(key=lambda x: x.get("similarity", 0), reverse=True)
            selected_results.extend(sources[:2])  # 每种类型最多2个
        
        # 处理选中的结果
        for result in selected_results:
            source_type = result.get("source")
            
            # 标准化来源类型显示名称
            source_display_map = {
                "fixed_qa": "固定Q&A",
                "kb": "知识库",
                "web": "联网搜索",
                "llm": "AI推理",
                "fallback": "回退机制"
            }
            
            ref = {
                "source_type": source_type,
                "source_display": source_display_map.get(source_type, source_type),
                "similarity": round(result.get("similarity", 0), 4),
                "weighted_score": round(result.get("weighted_score", 0), 4),
                "confidence_level": self._get_confidence_level(result.get("similarity", 0))
            }
            
            if source_type == "fixed_qa":
                ref.update({
                    "id": result.get("id"),
                    "question": result.get("question"),
                    "category": result.get("category"),
                    "text": result.get("answer", ""),
                    "source": "fixed_qa",
                    "source_detail": f"固定Q&A - {result.get('category', '默认')}类别"
                })
            elif source_type == "kb":
                kb_name = result.get("kb_name", "未知知识库")
                ref.update({
                    "kb_id": result.get("kb_id"),
                    "kb_name": kb_name,
                    "document_id": result.get("document_id"),
                    "text": result.get("text", ""),
                    "text_snippet": result.get("text", "")[:200] + ("..." if len(result.get("text", "")) > 200 else ""),
                    "source": "kb",
                    "source_detail": f"知识库「{kb_name}」"
                })
            elif source_type == "web" or source_type == "tavily_answer" or source_type == "tavily_web":
                # 处理联网搜索结果（包括Tavily）
                ref.update({
                    "url": result.get("url", ""),
                    "title": result.get("title", ""),
                    "source": source_type,  # 保留原始source类型
                    "content": result.get("content", ""),
                    "source_detail": "Cbit AI 搜索" if "tavily" in source_type else f"互联网搜索 - {result.get('search_engine', 'Web')}"
                })
            
            references.append(ref)
        
        return references
    
    def _get_confidence_level(self, similarity: float) -> str:
        """根据相似度返回置信度等级"""
        if similarity >= 0.90:
            return "极高"
        elif similarity >= 0.80:
            return "高"
        elif similarity >= 0.70:
            return "中等"
        elif similarity >= 0.60:
            return "较低"
        else:
            return "低"
    
    def _generate_suggestions(
        self,
        results: List[Dict[str, Any]],
        app_config: Dict[str, Any]
    ) -> List[str]:
        """生成建议（当相似度在低高阈值之间时）"""
        # 使用新的融合策略配置
        fusion_config = app_config.get("fusion_config", {})
        strategy_config = fusion_config.get("strategy", {})
        
        # 获取阈值（优先新配置，兼容旧配置）
        qa_suggest_threshold = strategy_config.get("qa_suggest_threshold", 0.55)  # 更宽松的建议阈值
        qa_direct_threshold = strategy_config.get("qa_direct_threshold", 0.90)
        kb_context_threshold = strategy_config.get("kb_context_threshold", 0.60)
        kb_high_confidence_threshold = strategy_config.get("kb_high_confidence_threshold", 0.85)
        
        # 兼容旧配置
        if not strategy_config:
            qa_suggest_threshold = app_config.get("similarity_threshold_low", 0.75)
            qa_direct_threshold = app_config.get("similarity_threshold_high", 0.90)
            kb_context_threshold = qa_suggest_threshold
            kb_high_confidence_threshold = qa_direct_threshold
        
        suggestions = []
        
        # 找到相似度在建议区间的结果
        for result in results:
            similarity = result.get("similarity", 0)
            source = result.get("source")
            
            # 固定Q&A：在建议阈值和直接回答阈值之间
            if source == "fixed_qa" and qa_suggest_threshold <= similarity < qa_direct_threshold:
                suggestions.append(f"您是否想问：{result.get('question', '')}")
            # 知识库：在上下文阈值和高置信度阈值之间
            elif source == "kb" and kb_context_threshold <= similarity < kb_high_confidence_threshold:
                suggestions.append(f"相关内容：{result.get('text', '')[:100]}...")
        
        return suggestions[:3]  # 最多返回3条建议
    
    async def _search_web(
        self,
        query: str,
        app_config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        联网搜索功能
        支持Tavily AI Search、Google、Serper等搜索引擎
        """
        try:
            search_channels = app_config.get("search_channels", [])
            
            if not search_channels:
                logger.info("ℹ️ 未配置搜索渠道，跳过联网搜索")
                return []
            
            logger.info(f"🌐 联网搜索已配置渠道: {search_channels}")
            
            # 从数据库加载搜索提供商配置
            from app.models.database import get_db, SearchProvider
            db = next(get_db())
            
            # 尝试使用配置的搜索提供商
            results = []
            for channel in search_channels:
                # 查找对应的搜索提供商
                provider = db.query(SearchProvider).filter(
                    SearchProvider.provider_type == channel,
                    SearchProvider.status == "active"
                ).first()
                
                if not provider:
                    logger.warning(f"⚠️ 未找到激活的 {channel} 搜索提供商")
                    continue
                
                # 根据提供商类型调用相应的搜索
                if channel == "tavily":
                    results = await self._search_with_tavily(query, provider, app_config)
                    if results:
                        logger.info(f"✅ Tavily搜索返回 {len(results)} 条结果")
                        break  # 成功获取结果，退出循环
                
                elif channel == "serper":
                    logger.info("⚠️ Serper搜索集成开发中...")
                    # TODO: 实现Serper搜索
                
                elif channel == "google":
                    logger.info("⚠️ Google搜索集成开发中...")
                    # TODO: 实现Google搜索
                
                elif channel == "serpapi":
                    logger.info("⚠️ SerpAPI搜索集成开发中...")
                    # TODO: 实现SerpAPI搜索
            
            if not results:
                logger.warning("⚠️ 所有搜索渠道均未返回结果")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ 联网搜索失败: {e}")
            import traceback
            logger.error(f"详细错误: {traceback.format_exc()}")
            # 返回一个包含错误信息的特殊结果，以便前端能显示
            return [{
                "source": "search_error",
                "error": str(e),
                "content": f"联网搜索失败: {str(e)}"
            }]
    
    async def _search_with_tavily(
        self,
        query: str,
        provider: Any,
        app_config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """使用Tavily执行搜索"""
        try:
            from app.core.tavily_search import TavilySearch
            
            # 🎯 优化搜索配置，获取更多结果
            max_results = max(app_config.get("top_k", 5), 8)  # 至少8条结果
            search_depth = provider.config.get("search_depth", "basic") if provider.config else "basic"
            
            logger.info(f"🔍 Tavily搜索参数: query='{query}', max_results={max_results}, depth={search_depth}")
            
            # 创建Tavily客户端
            tavily = TavilySearch(provider.api_key)
            
            # 执行搜索
            search_results = await tavily.search(
                query=query,
                max_results=max_results,
                search_depth=search_depth,
                include_answer=True,
                include_raw_content=False  # 不需要完整网页内容，加快速度
            )
            
            # 格式化结果
            formatted_results = tavily.format_results_for_rag(search_results)
            
            if formatted_results:
                logger.info(f"✅ Tavily成功返回 {len(formatted_results)} 条格式化结果")
                # 记录所有结果的标题、来源和相关度
                for idx, result in enumerate(formatted_results, 1):
                    source_type = result.get('source', 'unknown')
                    title = result.get('title', 'N/A')[:60]
                    relevance = result.get('relevance', result.get('similarity', 0))
                    logger.info(f"  [{idx}] ({source_type}) {title} (相关度: {relevance:.2%})")
            else:
                logger.warning("⚠️ Tavily搜索未返回任何格式化结果")
            
            # 更新使用量
            from datetime import date
            if provider.last_reset_date != date.today():
                provider.current_usage = 0
                provider.last_reset_date = date.today()
            
            provider.current_usage += 1
            
            from app.models.database import get_db
            db = next(get_db())
            db.commit()
            
            return formatted_results
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Tavily搜索失败: {error_msg}")
            import traceback
            logger.error(f"详细错误: {traceback.format_exc()}")
            
            # 返回错误信息以便前端显示
            return [{
                "source": "tavily_error",
                "error": error_msg,
                "content": f"Tavily搜索失败: {error_msg}",
                "title": "搜索失败",
                "url": "",
                "relevance": 0,
                "similarity": 0
            }]


# 全局实例
hybrid_retrieval_engine = HybridRetrievalEngine()
