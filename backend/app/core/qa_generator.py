"""
QA 格式生成器 - 使用 OpenAI 将文档转换为问答对
"""

from typing import List, Dict
from openai import AsyncOpenAI
from loguru import logger
from app.core.config import settings


class QAGenerator:
    """QA 格式生成器"""
    
    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
            )
    
    async def generate_qa_pairs(
        self,
        text: str,
        num_questions: int = 5,
        domain: str = "通用"
    ) -> List[Dict[str, str]]:
        """
        从文本生成问答对
        
        Args:
            text: 输入文本
            num_questions: 生成问题数量
            domain: 领域类型（通用/数学/代码等）
        
        Returns:
            [{"question": "...", "answer": "..."}]
        """
        if not self.client:
            logger.warning("未配置 OpenAI API，跳过 QA 生成")
            return []
        
        prompt = f"""你是一个专业的数据标注专家。请根据以下文本内容，生成 {num_questions} 个高质量的问答对。

要求：
1. 问题应该涵盖文本的核心内容
2. 问题应该清晰、具体、有价值
3. 答案应该准确、完整，基于文本内容
4. 适合{domain}领域的训练数据
5. 以 JSON 格式输出，格式如下：
[
  {{"question": "问题1", "answer": "答案1"}},
  {{"question": "问题2", "answer": "答案2"}}
]

文本内容：
{text[:2000]}  

请生成问答对："""

        try:
            response = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "你是一个专业的数据标注专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
            )
            
            content = response.choices[0].message.content
            
            # 尝试解析 JSON
            import json
            import re
            
            # 提取 JSON 部分
            json_match = re.search(r'\[[\s\S]*\]', content)
            if json_match:
                qa_pairs = json.loads(json_match.group())
                logger.info(f"成功生成 {len(qa_pairs)} 个问答对")
                return qa_pairs
            else:
                logger.warning("无法解析 OpenAI 响应为 JSON 格式")
                return []
                
        except Exception as e:
            logger.error(f"QA 生成失败: {e}")
            return []
    
    async def generate_training_dataset(
        self,
        chunks: List[str],
        questions_per_chunk: int = 3,
        domain: str = "通用"
    ) -> List[Dict[str, str]]:
        """
        从文本块批量生成训练数据集
        
        Args:
            chunks: 文本块列表
            questions_per_chunk: 每个块生成的问题数
            domain: 领域类型
        
        Returns:
            完整的问答对列表
        """
        all_qa_pairs = []
        
        for i, chunk in enumerate(chunks[:10]):  # 限制前10个块，避免API费用过高
            logger.info(f"正在处理第 {i+1}/{min(len(chunks), 10)} 个文本块...")
            qa_pairs = await self.generate_qa_pairs(chunk, questions_per_chunk, domain)
            all_qa_pairs.extend(qa_pairs)
        
        logger.info(f"共生成 {len(all_qa_pairs)} 个问答对")
        return all_qa_pairs
    
    @staticmethod
    def format_for_training(
        qa_pairs: List[Dict[str, str]],
        format_type: str = "alpaca"
    ) -> List[Dict[str, str]]:
        """
        将 QA 对转换为训练格式
        
        Args:
            qa_pairs: 问答对列表
            format_type: 格式类型 (alpaca, sharegpt, etc.)
        
        Returns:
            格式化后的训练数据
        """
        if format_type == "alpaca":
            return [
                {
                    "instruction": qa["question"],
                    "input": "",
                    "output": qa["answer"]
                }
                for qa in qa_pairs
            ]
        elif format_type == "sharegpt":
            return [
                {
                    "conversations": [
                        {"from": "human", "value": qa["question"]},
                        {"from": "gpt", "value": qa["answer"]}
                    ]
                }
                for qa in qa_pairs
            ]
        else:
            return qa_pairs

