"""
智能文本切片引擎
使用 LLM 进行智能文本拆分，支持多种拆分策略
"""

from typing import List, Dict, Optional, Tuple
from loguru import logger
import re
import json


class TextSplitter:
    """智能文本拆分器"""
    
    # 拆分策略
    STRATEGY_PARAGRAPH = "paragraph"  # 段落拆分
    STRATEGY_SEMANTIC = "semantic"    # 语义拆分（使用LLM）
    STRATEGY_FIXED_LENGTH = "fixed"   # 固定长度
    STRATEGY_SMART = "smart"          # 智能混合（LLM推荐最佳策略）
    STRATEGY_QA_FORMAT = "qa_format"  # 问答格式拆分（新增）
    
    # 问答分隔符
    QA_SEPARATORS = ['::', ':::', '----', '===', 'Q:', 'A:', '问：', '答：']
    
    def __init__(self, llm_client=None):
        """
        初始化文本拆分器
        
        Args:
            llm_client: LLM客户端实例（用于语义拆分）
        """
        self.llm_client = llm_client
    
    @staticmethod
    def detect_qa_format(text: str) -> Tuple[bool, str]:
        """
        检测文本是否为问答格式
        
        Args:
            text: 原始文本
        
        Returns:
            (是否为问答格式, 使用的分隔符)
        """
        for separator in TextSplitter.QA_SEPARATORS:
            if separator in text:
                # 检查分隔符的使用频率
                count = text.count(separator)
                if count >= 1:  # 至少出现一次
                    logger.info(f"检测到问答格式，分隔符: {separator}, 出现次数: {count}")
                    return True, separator
        return False, ""
    
    @staticmethod
    def split_by_paragraph(text: str, min_chars: int = 50) -> List[Dict]:
        """
        按段落拆分文本
        
        Args:
            text: 原始文本
            min_chars: 最小字符数（过滤过短的段落）
        
        Returns:
            拆分后的文本片段列表
        """
        # 按多个换行符分割
        paragraphs = re.split(r'\n\s*\n', text.strip())
        
        chunks = []
        for i, para in enumerate(paragraphs):
            para = para.strip()
            if len(para) >= min_chars:
                chunks.append({
                    "index": i,
                    "content": para,
                    "char_count": len(para),
                    "word_count": len(para.split()),
                    "type": "paragraph",
                    "metadata": {
                        "strategy": "paragraph",
                        "original_index": i
                    }
                })
        
        logger.info(f"段落拆分完成：{len(paragraphs)} 个段落 → {len(chunks)} 个有效片段")
        return chunks
    
    @staticmethod
    def split_by_fixed_length(
        text: str,
        chunk_size: int = 500,
        overlap: int = 50
    ) -> List[Dict]:
        """
        按固定长度拆分文本（带重叠）
        
        Args:
            text: 原始文本
            chunk_size: 每个片段的字符数
            overlap: 重叠字符数
        
        Returns:
            拆分后的文本片段列表
        """
        text = text.strip()
        chunks = []
        start = 0
        index = 0
        
        while start < len(text):
            # 计算结束位置
            end = start + chunk_size
            
            # 如果不是最后一个片段，尝试在句子边界处断开
            if end < len(text):
                # 向后搜索句子结束符
                sentence_end = max(
                    text.rfind('。', start, end),
                    text.rfind('！', start, end),
                    text.rfind('？', start, end),
                    text.rfind('\n', start, end)
                )
                if sentence_end > start:
                    end = sentence_end + 1
            
            chunk_text = text[start:end].strip()
            
            if chunk_text:
                chunks.append({
                    "index": index,
                    "content": chunk_text,
                    "char_count": len(chunk_text),
                    "word_count": len(chunk_text.split()),
                    "type": "fixed_length",
                    "metadata": {
                        "strategy": "fixed_length",
                        "start_pos": start,
                        "end_pos": end,
                        "overlap": overlap if index > 0 else 0
                    }
                })
                index += 1
            
            # 移动到下一个位置（考虑重叠）
            start = end - overlap if end < len(text) else end
        
        logger.info(f"固定长度拆分完成：{len(text)} 字符 → {len(chunks)} 个片段")
        return chunks
    
    @staticmethod
    def split_by_qa_format(text: str, separator: str = None) -> List[Dict]:
        """
        按问答格式拆分文本（支持 :: 等分隔符）
        
        Args:
            text: 原始文本
            separator: 问答分隔符，如果为None则自动检测
        
        Returns:
            拆分后的文本片段列表
        """
        # 自动检测分隔符
        if separator is None:
            is_qa, separator = TextSplitter.detect_qa_format(text)
            if not is_qa:
                logger.warning("未检测到问答格式，使用段落拆分")
                return TextSplitter.split_by_paragraph(text)
        
        # 按分隔符拆分
        if separator in ['::', ':::', '----', '===']:
            # 简单分隔符，直接split成Q&A对
            parts = text.split(separator)
            chunks = []
            
            # 两两配对：parts[0]=问题, parts[1]=答案, parts[2]=下一个问题...
            i = 0
            index = 0
            while i < len(parts):
                question = parts[i].strip() if i < len(parts) else ""
                answer = parts[i+1].strip() if i+1 < len(parts) else ""
                
                if not question and not answer:
                    i += 2
                    continue
                
                # 组合成Q&A格式
                if question and answer:
                    content = f"Q: {question}\nA: {answer}"
                    title = question[:50] + "..." if len(question) > 50 else question
                    summary = answer[:100] + "..." if len(answer) > 100 else answer
                elif question:
                    # 只有问题
                    content = f"Q: {question}"
                    title = question[:50] + "..." if len(question) > 50 else question
                    summary = "（无答案）"
                else:
                    # 只有答案（不太可能）
                    content = answer
                    title = f"片段 {index+1}"
                    summary = answer[:100] + "..." if len(answer) > 100 else answer
                
                chunks.append({
                    "index": index,
                    "content": content,
                    "title": title,
                    "summary": summary,
                    "char_count": len(content),
                    "word_count": len(content.split()),
                    "type": "qa_pair",
                    "metadata": {
                        "strategy": "qa_format",
                        "separator": separator,
                        "has_question": bool(question),
                        "has_answer": bool(answer)
                    }
                })
                
                index += 1
                i += 2  # 每次跳过问题和答案
        
        elif separator in ['Q:', 'A:', '问：', '答：']:
            # Q&A标记格式
            chunks = []
            
            # 使用正则表达式匹配Q&A对
            qa_pattern = r'(?:Q:|问：)\s*(.+?)\s*(?:A:|答：)\s*(.+?)(?=(?:Q:|问：)|$)'
            matches = re.finditer(qa_pattern, text, re.DOTALL)
            
            index = 0
            for match in matches:
                question = match.group(1).strip()
                answer = match.group(2).strip()
                
                content = f"Q: {question}\nA: {answer}"
                title = question[:50] + "..." if len(question) > 50 else question
                summary = answer[:100] + "..." if len(answer) > 100 else answer
                
                chunks.append({
                    "index": index,
                    "content": content,
                    "title": title,
                    "summary": summary,
                    "char_count": len(content),
                    "word_count": len(content.split()),
                    "type": "qa_pair",
                    "metadata": {
                        "strategy": "qa_format",
                        "separator": separator,
                        "has_question": True,
                        "has_answer": True
                    }
                })
                index += 1
            
            if not chunks:
                logger.warning("未能提取到有效的Q&A对，使用段落拆分")
                return TextSplitter.split_by_paragraph(text)
        
        else:
            # 未知分隔符，使用段落拆分
            logger.warning(f"未知分隔符: {separator}，使用段落拆分")
            return TextSplitter.split_by_paragraph(text)
        
        logger.info(f"问答格式拆分完成：生成 {len(chunks)} 个Q&A对")
        return chunks
    
    async def split_by_semantic(
        self,
        text: str,
        provider: str,
        model: str,
        api_key: str,
        base_url: Optional[str] = None
    ) -> List[Dict]:
        """
        使用 LLM 进行语义拆分
        
        Args:
            text: 原始文本
            provider: AI提供商
            model: 模型名称
            api_key: API密钥
            base_url: 自定义API地址
        
        Returns:
            拆分后的文本片段列表
        """
        try:
            # 构建提示词
            prompt = f"""请将以下文本拆分成若干个语义完整的片段。每个片段应该是一个独立的知识点或话题。

要求：
1. 每个片段应该语义完整，可以独立理解
2. 片段之间主题应该有明显区别
3. 每个片段建议 200-800 字符
4. 为每个片段生成一个简短的标题（不超过20字）

请以JSON格式返回，格式如下：
{{
  "chunks": [
    {{
      "title": "片段标题",
      "content": "片段内容",
      "summary": "一句话摘要"
    }},
    ...
  ]
}}

原始文本：
{text}
"""
            
            # 调用LLM
            from app.core.multi_model_engine import multi_model_engine
            
            # 临时设置API密钥
            original_key = multi_model_engine.api_keys.get(provider)
            multi_model_engine.set_api_key(provider, api_key)
            if base_url:
                multi_model_engine.set_custom_config(provider, {"base_url": base_url})
            
            try:
                response = await multi_model_engine.chat_completion(
                    provider=provider,
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": "你是一个专业的文本分析助手，擅长将长文本拆分成语义完整的片段。"
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,
                    max_tokens=4000
                )
                
                # 解析响应
                content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # 提取JSON
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    result = json.loads(json_match.group())
                    raw_chunks = result.get("chunks", [])
                    
                    # 格式化输出
                    chunks = []
                    for i, chunk_data in enumerate(raw_chunks):
                        chunks.append({
                            "index": i,
                            "content": chunk_data.get("content", "").strip(),
                            "title": chunk_data.get("title", f"片段{i+1}"),
                            "summary": chunk_data.get("summary", ""),
                            "char_count": len(chunk_data.get("content", "")),
                            "word_count": len(chunk_data.get("content", "").split()),
                            "type": "semantic",
                            "metadata": {
                                "strategy": "semantic",
                                "ai_generated": True,
                                "provider": provider,
                                "model": model
                            }
                        })
                    
                    logger.info(f"语义拆分完成：生成 {len(chunks)} 个语义片段")
                    return chunks
                else:
                    logger.error("LLM返回内容无法解析为JSON")
                    # 降级到段落拆分
                    return TextSplitter.split_by_paragraph(text)
                    
            finally:
                # 恢复原始API密钥
                if original_key:
                    multi_model_engine.set_api_key(provider, original_key)
                elif provider in multi_model_engine.api_keys:
                    del multi_model_engine.api_keys[provider]
        
        except Exception as e:
            logger.error(f"语义拆分失败: {e}", exc_info=True)
            # 降级到段落拆分
            logger.info("降级使用段落拆分")
            return TextSplitter.split_by_paragraph(text)
    
    async def split_smart(
        self,
        text: str,
        provider: str,
        model: str,
        api_key: str,
        base_url: Optional[str] = None
    ) -> Tuple[List[Dict], Dict]:
        """
        智能拆分：自动检测格式或使用LLM分析文本并推荐最佳拆分策略
        
        Args:
            text: 原始文本
            provider: AI提供商
            model: 模型名称
            api_key: API密钥
            base_url: 自定义API地址
        
        Returns:
            (拆分后的文本片段列表, 分析报告)
        """
        try:
            # 1. 首先检测是否为问答格式
            is_qa, separator = TextSplitter.detect_qa_format(text)
            if is_qa:
                logger.info(f"✨ 智能检测：发现问答格式（分隔符: {separator}），使用问答拆分策略")
                chunks = TextSplitter.split_by_qa_format(text, separator)
                return chunks, {
                    "text_type": "问答格式",
                    "structure_analysis": f"检测到使用 '{separator}' 分隔的问答对格式",
                    "recommended_strategy": "qa_format",
                    "actual_strategy": "qa_format",
                    "reason": f"自动检测到问答格式，使用高精度问答拆分（分隔符: {separator}）",
                    "auto_detected": True,
                    "separator": separator
                }
            
            # 2. 如果不是问答格式，使用LLM分析
            # 构建分析提示词
            prompt = f"""请分析以下文本的结构特点，并推荐最佳的拆分策略。

文本预览（前500字符）：
{text[:500]}...

文本总字符数：{len(text)}

请分析：
1. 文本类型（如：学术文章、FAQ问答、新闻报道、技术文档等）
2. 文本结构特点
3. 推荐的拆分策略（paragraph段落拆分 / semantic语义拆分 / fixed固定长度）
4. 推荐理由

请以JSON格式返回：
{{
  "text_type": "文本类型",
  "structure_analysis": "结构分析",
  "recommended_strategy": "paragraph/semantic/fixed",
  "reason": "推荐理由",
  "suggested_chunk_size": 500
}}
"""
            
            # 调用LLM进行分析
            from app.core.multi_model_engine import multi_model_engine
            
            # 临时设置API密钥
            original_key = multi_model_engine.api_keys.get(provider)
            multi_model_engine.set_api_key(provider, api_key)
            if base_url:
                multi_model_engine.set_custom_config(provider, {"base_url": base_url})
            
            try:
                response = await multi_model_engine.chat_completion(
                    provider=provider,
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": "你是一个文本分析专家，擅长分析文本结构并推荐最佳的拆分策略。"
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )
                
                # 解析分析结果
                content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
                json_match = re.search(r'\{[\s\S]*\}', content)
                
                if json_match:
                    analysis = json.loads(json_match.group())
                    strategy = analysis.get("recommended_strategy", "paragraph")
                    
                    logger.info(f"智能分析完成：推荐策略 = {strategy}")
                    
                    # 根据推荐策略进行拆分
                    if strategy == "semantic":
                        chunks = await self.split_by_semantic(text, provider, model, api_key, base_url)
                    elif strategy == "fixed":
                        chunk_size = analysis.get("suggested_chunk_size", 500)
                        chunks = TextSplitter.split_by_fixed_length(text, chunk_size=chunk_size)
                    elif strategy == "qa_format":
                        chunks = TextSplitter.split_by_qa_format(text)
                    else:  # paragraph
                        chunks = TextSplitter.split_by_paragraph(text)
                    
                    analysis["actual_strategy"] = strategy
                    return chunks, analysis
                else:
                    logger.warning("无法解析LLM分析结果，使用默认段落拆分")
                    return TextSplitter.split_by_paragraph(text), {
                        "recommended_strategy": "paragraph",
                        "reason": "LLM分析失败，使用默认策略"
                    }
                    
            finally:
                # 恢复原始API密钥
                if original_key:
                    multi_model_engine.set_api_key(provider, original_key)
                elif provider in multi_model_engine.api_keys:
                    del multi_model_engine.api_keys[provider]
        
        except Exception as e:
            logger.error(f"智能拆分失败: {e}", exc_info=True)
            return TextSplitter.split_by_paragraph(text), {
                "recommended_strategy": "paragraph",
                "reason": f"智能分析失败: {str(e)}"
            }
    
    async def split(
        self,
        text: str,
        strategy: str = "paragraph",
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        **kwargs
    ) -> Tuple[List[Dict], Dict]:
        """
        统一的文本拆分接口
        
        Args:
            text: 原始文本
            strategy: 拆分策略 (paragraph/semantic/fixed/smart)
            provider: AI提供商（语义拆分时需要）
            model: 模型名称（语义拆分时需要）
            api_key: API密钥（语义拆分时需要）
            base_url: 自定义API地址
            **kwargs: 其他参数（如chunk_size, overlap等）
        
        Returns:
            (拆分后的文本片段列表, 元信息)
        """
        logger.info(f"开始文本拆分：策略={strategy}, 文本长度={len(text)}")
        
        metadata = {
            "original_length": len(text),
            "strategy": strategy,
            "timestamp": None
        }
        
        try:
            if strategy == self.STRATEGY_PARAGRAPH:
                chunks = self.split_by_paragraph(text, kwargs.get("min_chars", 50))
                
            elif strategy == self.STRATEGY_FIXED_LENGTH:
                chunks = self.split_by_fixed_length(
                    text,
                    chunk_size=kwargs.get("chunk_size", 500),
                    overlap=kwargs.get("overlap", 50)
                )
                
            elif strategy == self.STRATEGY_QA_FORMAT:
                # 问答格式拆分（新增）
                chunks = self.split_by_qa_format(text, kwargs.get("separator"))
                
            elif strategy == self.STRATEGY_SEMANTIC:
                if not all([provider, model, api_key]):
                    raise ValueError("语义拆分需要提供 provider, model 和 api_key")
                chunks = await self.split_by_semantic(text, provider, model, api_key, base_url)
                
            elif strategy == self.STRATEGY_SMART:
                if not all([provider, model, api_key]):
                    # 如果没有AI配置，先尝试自动检测问答格式
                    is_qa, separator = self.detect_qa_format(text)
                    if is_qa:
                        logger.info(f"✨ 未配置AI但检测到问答格式，使用问答拆分")
                        chunks = self.split_by_qa_format(text, separator)
                        metadata["analysis"] = {
                            "recommended_strategy": "qa_format",
                            "actual_strategy": "qa_format",
                            "reason": f"自动检测到问答格式（分隔符: {separator}）",
                            "auto_detected": True
                        }
                        metadata["chunk_count"] = len(chunks)
                        return chunks, metadata
                    else:
                        raise ValueError("智能拆分需要提供 provider, model 和 api_key，或文本需为问答格式")
                chunks, analysis = await self.split_smart(text, provider, model, api_key, base_url)
                metadata["analysis"] = analysis
                metadata["actual_strategy"] = analysis.get("actual_strategy", analysis.get("recommended_strategy"))
                return chunks, metadata
                
            else:
                raise ValueError(f"不支持的拆分策略: {strategy}")
            
            metadata["chunk_count"] = len(chunks)
            metadata["avg_chunk_size"] = sum(c["char_count"] for c in chunks) // len(chunks) if chunks else 0
            
            return chunks, metadata
            
        except Exception as e:
            logger.error(f"文本拆分失败: {e}", exc_info=True)
            raise

