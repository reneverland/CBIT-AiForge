"""
准确优先策略
核心理念：准确 > 全面，宁可不答，不可乱答
"""

from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
from datetime import datetime
from collections import defaultdict


class AccuratePriorityStrategy:
    """准确优先策略实现"""
    
    # 默认三档阈值（如果配置中没有则使用这些默认值）
    DEFAULT_HIGH_CONFIDENCE_THRESHOLD = 0.82  # A档：强置信
    DEFAULT_MEDIUM_CONFIDENCE_THRESHOLD = 0.70  # B档：中等置信
    # C档：< 0.70 低置信，放弃作答
    
    # 联网覆盖KB的条件
    WEB_CONSENSUS_THRESHOLD = 0.88  # 多源共识度
    WEB_ADVANTAGE_THRESHOLD = 0.15  # 必须显著优于KB
    
    def __init__(self):
        pass
    
    async def apply_strategy(
        self,
        results: List[Dict[str, Any]],
        app_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        应用准确优先策略
        
        Returns:
            {
                "tier": "A" | "B" | "C",
                "final_result": Dict,
                "confidence_level": "高" | "中" | "低",
                "citations": List[Dict],  # 编号引用
                "explanation": str,  # 为何这样回答
                "web_search_option": bool,  # 是否显示联网选项
                "custom_message": str  # C档的自定义提示
            }
        """
        if not results:
            return self._create_c_tier_response(app_config, "未找到任何相关信息")
        
        # 🔑 从配置中读取阈值（如果没有配置则使用默认值）
        strategy_config = app_config.get("fusion_config", {}).get("strategy", {})
        high_threshold = strategy_config.get("kb_high_confidence_threshold", self.DEFAULT_HIGH_CONFIDENCE_THRESHOLD)
        medium_threshold = strategy_config.get("kb_context_threshold", self.DEFAULT_MEDIUM_CONFIDENCE_THRESHOLD)
        
        logger.info(f"📊 使用阈值配置: A档≥{high_threshold:.0%}, B档≥{medium_threshold:.0%}")
        
        # 分离不同来源
        kb_results = [r for r in results if r.get("source") == "kb"]
        fixed_qa_results = [r for r in results if r.get("source") == "fixed_qa"]
        web_results = [r for r in results if r.get("source") in ["web", "tavily_answer", "tavily_web"]]
        
        # 获取最佳结果
        best_kb = max(kb_results, key=lambda x: x.get("similarity", 0)) if kb_results else None
        best_fixed_qa = max(fixed_qa_results, key=lambda x: x.get("similarity", 0)) if fixed_qa_results else None
        best_web = max(web_results, key=lambda x: x.get("similarity", 0)) if web_results else None
        
        # 优先检查固定Q&A（使用配置的阈值）
        qa_high_threshold = strategy_config.get("qa_direct_threshold", 0.90)
        if best_fixed_qa and best_fixed_qa.get("similarity", 0) >= qa_high_threshold:
            logger.info(f"💎 固定Q&A高匹配 {best_fixed_qa.get('similarity', 0):.1%}（≥{qa_high_threshold:.0%}），A档处理")
            return self._create_a_tier_response(best_fixed_qa, [best_fixed_qa], "fixed_qa")
        
        # 判定知识库置信度档次
        kb_similarity = best_kb.get("similarity", 0) if best_kb else 0
        
        # A档：强置信（使用配置的高阈值）
        if kb_similarity >= high_threshold:
            logger.info(f"✅ A档：知识库强置信 {kb_similarity:.1%}（≥{high_threshold:.0%}）")
            return self._create_a_tier_response(best_kb, kb_results[:3], "kb")
        
        # B档：中等置信（使用配置的中等阈值）
        elif kb_similarity >= medium_threshold:
            logger.info(f"⚠️ B档：知识库中等置信 {kb_similarity:.1%}（{medium_threshold:.0%}-{high_threshold:.0%}）")
            
            # 检查是否有联网结果可以覆盖
            if web_results:
                should_use_web, reason = self._should_use_web_over_kb(
                    best_kb, web_results, app_config
                )
                if should_use_web:
                    logger.info(f"🌐 联网覆盖KB: {reason}")
                    return self._create_b_tier_response_with_web(
                        best_kb, web_results, kb_results, reason
                    )
            
            # 默认：保守回答 + 联网选项
            return self._create_b_tier_response(best_kb, kb_results[:3])
        
        # C档：低置信（< 0.70）
        else:
            logger.info(f"🙇 C档：知识库低置信 {kb_similarity:.1%}（<{self.MEDIUM_CONFIDENCE_THRESHOLD:.0%}）")
            
            # 🔑 关键：检查是否有联网搜索结果可用
            if web_results:
                best_web = max(web_results, key=lambda x: x.get("relevance", x.get("similarity", 0)))
                web_relevance = best_web.get("relevance", best_web.get("similarity", 0))
                
                # 如果联网结果相关度合理（≥0.60），使用联网结果
                if web_relevance >= 0.60:
                    logger.info(f"🌐 C档使用联网结果: {best_web.get('title', 'N/A')[:50]} (相关度: {web_relevance:.1%})")
                    citations = self._generate_numbered_citations(web_results[:3])
                    
                    # 生成带链接的说明（不显示相关度百分比）
                    explanation = f"知识库信息不足，已为您从网络检索到相关内容"
                    
                    # 添加主要来源链接
                    if citations and len(citations) > 0:
                        first_citation = citations[0]
                        url = first_citation.get("url")
                        source_name = first_citation.get("source_name", "")
                        if url:
                            explanation += f" | 主要来源: {source_name} | 链接: {url}"
                        elif source_name:
                            explanation += f" | 主要来源: {source_name}"
                    
                    return {
                        "tier": "C",
                        "final_result": best_web,
                        "confidence_level": "中",  # 有联网支持，提升到"中"
                        "citations": citations,
                        "explanation": explanation,
                        "web_search_option": False,  # 已经使用了web信息
                        "custom_message": "ℹ️ 以下信息来自网络搜索"
                    }
            
            # 如果没有联网结果或相关度太低，才放弃作答
            logger.info("❌ 知识库和联网均无充分信息，放弃作答")
            custom_message = app_config.get("custom_no_result_response", "")
            return self._create_c_tier_response(app_config, custom_message or "未找到足够证据")
    
    def _create_a_tier_response(
        self,
        best_result: Dict[str, Any],
        all_results: List[Dict[str, Any]],
        source_type: str
    ) -> Dict[str, Any]:
        """创建A档响应：仅用知识库，不触发联网"""
        citations = self._generate_numbered_citations(all_results[:3])
        
        return {
            "tier": "A",
            "final_result": best_result,
            "confidence_level": "高",
            "citations": citations,
            "explanation": self._generate_explanation(citations, "strong"),
            "web_search_option": False,  # A档不提供联网选项
            "custom_message": None
        }
    
    def _create_b_tier_response(
        self,
        best_result: Dict[str, Any],
        all_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """创建B档响应：保守回答 + 联网选项"""
        citations = self._generate_numbered_citations(all_results[:3])
        
        return {
            "tier": "B",
            "final_result": best_result,
            "confidence_level": "中",
            "citations": citations,
            "explanation": self._generate_explanation(citations, "moderate"),
            "web_search_option": True,  # B档提供联网选项
            "custom_message": "⚠️ 现有资料不够充分，部分信息可能需要进一步核验。"
        }
    
    def _create_b_tier_response_with_web(
        self,
        kb_result: Dict[str, Any],
        web_results: List[Dict[str, Any]],
        kb_results: List[Dict[str, Any]],
        reason: str
    ) -> Dict[str, Any]:
        """创建B档响应（含联网信息）"""
        # 🔑 关键修改：只使用联网搜索的引用（不混入知识库引用）
        # 因为最终回答来自联网搜索，引用应该只显示联网来源
        citations = self._generate_numbered_citations(web_results[:3])
        
        # 使用web结果作为最终答案
        best_web = max(web_results, key=lambda x: x.get("relevance", x.get("similarity", 0)))
        
        # 生成带链接的说明（不显示相关度百分比）
        explanation = f"知识库信息不足，已从网络检索到相关内容"
        
        # 添加主要来源链接
        if citations and len(citations) > 0:
            first_citation = citations[0]
            url = first_citation.get("url")
            source_name = first_citation.get("source_name", "")
            if url:
                explanation += f" | 主要来源: {source_name} | 链接: {url}"
            elif source_name:
                explanation += f" | 主要来源: {source_name}"
        
        return {
            "tier": "B",
            "final_result": best_web,
            "confidence_level": "中",
            "citations": citations,
            "explanation": explanation,
            "web_search_option": False,  # 已经使用了web信息
            "custom_message": "ℹ️ 以下信息来自网络搜索"
        }
    
    def _create_c_tier_response(
        self,
        app_config: Dict[str, Any],
        default_message: str
    ) -> Dict[str, Any]:
        """创建C档响应：不作答 + 自定义提示"""
        custom_msg = app_config.get("custom_no_result_response", default_message)
        
        return {
            "tier": "C",
            "final_result": None,
            "confidence_level": "低",
            "citations": [],
            "explanation": "知识库中未找到足够充分的相关信息。",
            "web_search_option": True,  # C档提供联网选项
            "custom_message": custom_msg or "🙇 抱歉，我在知识库中未找到关于此问题的充分信息。\n\n您可以：\n- 尝试换个问法\n- 提供更多上下文信息\n- 联系管理员补充相关资料"
        }
    
    def _should_use_web_over_kb(
        self,
        kb_result: Dict[str, Any],
        web_results: List[Dict[str, Any]],
        app_config: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        判断是否应该用联网信息覆盖知识库
        
        必须同时满足：
        1. web_consensus_score ≥ 0.88
        2. web_score - kb_score ≥ 0.15
        3. 有时间戳证据表明KB过期
        """
        # 检查多源一致性
        consensus_score, consensus_facts = self._check_web_consensus(web_results)
        
        if consensus_score < self.WEB_CONSENSUS_THRESHOLD:
            return False, f"网络共识度不足 ({consensus_score:.1%} < {self.WEB_CONSENSUS_THRESHOLD:.0%})"
        
        # 检查优势
        best_web = max(web_results, key=lambda x: x.get("similarity", 0))
        web_score = best_web.get("similarity", 0)
        kb_score = kb_result.get("similarity", 0)
        advantage = web_score - kb_score
        
        if advantage < self.WEB_ADVANTAGE_THRESHOLD:
            return False, f"网络优势不显著 ({advantage:.1%} < {self.WEB_ADVANTAGE_THRESHOLD:.0%})"
        
        # 检查时间戳证据
        has_timestamp_evidence = self._check_timestamp_evidence(kb_result, web_results)
        
        if not has_timestamp_evidence:
            return False, "无明确的时间戳证据表明知识库过期"
        
        return True, f"网络多源一致 ({consensus_score:.1%})，显著优于知识库 (+{advantage:.1%})，且有新证据"
    
    def _check_web_consensus(
        self,
        web_results: List[Dict[str, Any]]
    ) -> Tuple[float, List[str]]:
        """
        检查网络来源的多源一致性
        
        Returns:
            (consensus_score, consensus_facts)
        """
        if len(web_results) < 2:
            return 0.0, []
        
        # 按域名分组
        sources_by_domain = defaultdict(list)
        for result in web_results:
            url = result.get("url", "")
            if url:
                # 简单提取域名
                domain = self._extract_domain(url)
                sources_by_domain[domain].append(result)
        
        # 至少需要2个不同域名
        unique_domains = len(sources_by_domain)
        if unique_domains < 2:
            logger.info(f"⚠️ 网络来源不足：只有 {unique_domains} 个独立域名")
            return 0.0, []
        
        # 计算平均相似度作为共识分数
        avg_similarity = sum(r.get("similarity", 0) for r in web_results) / len(web_results)
        
        # 检查结果的一致性（简化版：使用相似度标准差）
        similarities = [r.get("similarity", 0) for r in web_results]
        std_dev = self._calculate_std_dev(similarities)
        
        # 标准差越小，一致性越高
        consistency_factor = max(0, 1 - std_dev * 2)
        
        consensus_score = avg_similarity * consistency_factor
        
        logger.info(f"🧭 网络共识分析：{unique_domains}个独立源，平均相似度 {avg_similarity:.1%}，一致性 {consistency_factor:.1%}，共识分数 {consensus_score:.1%}")
        
        return consensus_score, []
    
    def _check_timestamp_evidence(
        self,
        kb_result: Dict[str, Any],
        web_results: List[Dict[str, Any]]
    ) -> bool:
        """
        检查是否有时间戳证据表明KB过期或存在矛盾
        
        检查以下情况：
        1. 联网结果包含明确的时间标记（日期、时间等）
        2. 联网结果中有权威来源（官方网站、新闻媒体等）
        3. 联网结果的标题或内容暗示是最新更新
        4. Tavily AI 综合答案（通常基于多个最新来源）
        """
        timestamp_indicators = [
            '2024', '2025',  # 年份标记
            '最新', '更新', '新版', '现在',  # 中文时效词
            'latest', 'update', 'new', 'current', 'recent',  # 英文时效词
            '官方', '公告', '通知',  # 权威发布
            'official', 'announcement', 'notice'
        ]
        
        authoritative_domains = [
            '.gov.', '.edu.',  # 政府和教育机构
            'news', 'press',  # 新闻媒体
            'blog', 'official'  # 官方博客
        ]
        
        evidence_score = 0
        reasons = []
        
        for result in web_results:
            # 1. Tavily AI 综合答案（最高权重）
            if result.get("source") == "tavily_answer":
                evidence_score += 3
                reasons.append("Tavily AI综合答案（基于多源最新信息）")
                continue
            
            # 2. 检查标题和内容中的时间标记
            title = result.get("title", "").lower()
            content = result.get("content", "").lower()
            combined_text = f"{title} {content}"
            
            for indicator in timestamp_indicators:
                if indicator.lower() in combined_text:
                    evidence_score += 0.5
                    reasons.append(f"包含时效标记: {indicator}")
                    break  # 每个结果只计分一次
            
            # 3. 检查是否来自权威域名
            url = result.get("url", "").lower()
            for domain in authoritative_domains:
                if domain in url:
                    evidence_score += 1
                    reasons.append(f"权威来源: {domain}")
                    break
        
        # 判定阈值：至少需要 2 分
        # - Tavily答案：3分（直接通过）
        # - 权威域名+时效标记：1.5分
        # - 2个权威域名：2分（通过）
        has_evidence = evidence_score >= 2.0
        
        if has_evidence:
            logger.info(f"✅ 发现时间戳证据（得分: {evidence_score:.1f}）: {', '.join(reasons[:3])}")
        else:
            logger.info(f"❌ 时间戳证据不足（得分: {evidence_score:.1f} < 2.0）")
        
        return has_evidence
    
    def _generate_numbered_citations(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        生成编号引用（仿 OpenAI 格式）
        
        格式:
        [1] KB — 文档题名（简） · 知识库名 · YYYY-MM-DD
        [2] Web — 页面标题 · YYYY-MM-DD
        
        注意：similarity 仅用于内部判定，不向用户展示
        """
        citations = []
        
        # 🔍 调试日志：显示传入的结果
        logger.info(f"📚 生成引用来源，共 {len(results)} 个结果：")
        for i, r in enumerate(results[:3], 1):
            source = r.get("source", "unknown")
            sim = r.get("similarity", r.get("relevance", 0))
            title = r.get("question", r.get("title", r.get("text", "")))[:50]
            logger.info(f"  [{i}] {source} - 相似度: {sim:.2%} - {title}")
        
        for idx, result in enumerate(results[:3], 1):  # 最多3条，优先不同来源/时间
            source_type = result.get("source", "")
            
            if source_type == "kb":
                # 截取文档标题（取第一句或前30字）
                text = result.get("text", "")
                doc_title = self._extract_title_from_text(text, max_length=30)
                
                citation = {
                    "id": idx,
                    "type": "kb",
                    "label": "KB",  # 改为简洁标签
                    "title": doc_title,
                    "source_name": result.get("kb_name", "知识库"),
                    "date": self._extract_date(result),
                    "snippet": result.get("text", ""),  # 悬停显示的摘要句
                    "url": result.get("url"),  # 如果有文档链接
                    # similarity 不传递给前端，仅内部使用
                    "_internal_score": result.get("similarity", 0)
                }
            elif source_type == "fixed_qa":
                citation = {
                    "id": idx,
                    "type": "qa",
                    "label": "KB",  # Q&A 也算知识库来源
                    "title": self._truncate_text(result.get("question", ""), 30),
                    "source_name": "固定Q&A",
                    "date": self._extract_date(result),
                    "snippet": result.get("answer", ""),
                    "url": None,
                    "_internal_score": result.get("similarity", 0)
                }
            else:  # web (包括tavily_answer和tavily_web)
                # 特殊处理：tavily_answer (AI综合答案)
                if source_type == "tavily_answer":
                    citation = {
                        "id": idx,
                        "type": "web",
                        "label": "Web",
                        "title": "AI综合答案",
                        "source_name": "网络搜索",
                        "date": self._extract_date(result),
                        "snippet": result.get("answer", result.get("content", "")),
                        "url": None,
                        "_internal_score": result.get("relevance", result.get("similarity", 0))
                    }
                else:
                    citation = {
                        "id": idx,
                        "type": "web",
                        "label": "Web",
                        "title": self._truncate_text(result.get("title", "网页"), 40),
                        "source_name": self._extract_domain(result.get("url", "")),
                        "date": self._extract_date(result),
                        "snippet": result.get("content", ""),
                        "url": result.get("url", ""),
                        "_internal_score": result.get("relevance", result.get("similarity", 0))
                    }
            
            citations.append(citation)
        
        return citations
    
    def _extract_title_from_text(self, text: str, max_length: int = 30) -> str:
        """从文本中提取标题（取第一句或前N字）"""
        if not text:
            return "文档"
        
        # 尝试按句号分割，取第一句
        sentences = text.split('。')
        if sentences and sentences[0]:
            first_sentence = sentences[0].strip()
            if len(first_sentence) <= max_length:
                return first_sentence
            return first_sentence[:max_length] + "..."
        
        # 否则直接截取
        return self._truncate_text(text, max_length)
    
    def _generate_explanation(
        self,
        citations: List[Dict[str, Any]],
        confidence_type: str
    ) -> str:
        """生成"为何这样回答"的解释"""
        if not citations:
            return "未找到相关引用来源。"
        
        citation_ids = [f"[{c['id']}]" for c in citations]
        citation_str = "".join(citation_ids)
        
        if confidence_type == "strong":
            return f"依据{citation_str}的高质量匹配内容得出结论，信息来源可靠且一致。"
        elif confidence_type == "moderate":
            return f"依据{citation_str}的部分证据作答，仅陈述可以确认的信息，其他部分因证据不足未下结论。"
        else:
            return "知识库中缺少充分证据，无法给出可靠结论。"
    
    def _extract_domain(self, url: str) -> str:
        """从URL提取域名"""
        if not url:
            return "未知来源"
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            # 移除www.
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except:
            return url[:30]
    
    def _extract_date(self, result: Dict[str, Any]) -> str:
        """提取日期"""
        # 优先使用结果中的日期字段
        if "date" in result:
            return result["date"]
        
        # 从created_at或updated_at提取
        for date_field in ["created_at", "updated_at", "timestamp"]:
            if date_field in result:
                try:
                    date_str = str(result[date_field])
                    # 简单处理：提取YYYY-MM-DD部分
                    if len(date_str) >= 10:
                        return date_str[:10]
                except:
                    pass
        
        # 默认使用今天
        return datetime.now().strftime("%Y-%m-%d")
    
    def _truncate_text(self, text: str, max_length: int) -> str:
        """截断文本"""
        if not text:
            return ""
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."
    
    def _calculate_std_dev(self, numbers: List[float]) -> float:
        """计算标准差"""
        if not numbers:
            return 0.0
        
        mean = sum(numbers) / len(numbers)
        variance = sum((x - mean) ** 2 for x in numbers) / len(numbers)
        return variance ** 0.5


# 全局实例
accurate_priority_strategy = AccuratePriorityStrategy()

