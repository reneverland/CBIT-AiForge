"""
Q&A 问题扩展模块
用于提高固定Q&A的语义匹配准确性
"""

from typing import List, Dict, Any
from loguru import logger
import re


class QAExpansion:
    """Q&A问题扩展器"""
    
    # 常见简称映射
    ABBREVIATION_MAP = {
        "sme": ["经管学院", "理工学院经管学部", "经济管理学院"],
        "经管": ["经管学院", "经济管理学院"],
        "cuhksz": ["香港中文大学（深圳）", "港中深", "港中文深圳"],
        "港中深": ["香港中文大学（深圳）", "cuhksz"],
        "大数据": ["数据科学", "大数据分析"],
        "ai": ["人工智能", "artificial intelligence"],
        "cs": ["计算机科学", "computer science"],
        "mkt": ["市场营销", "marketing"],
        "申请": ["报名", "入学"],
        "学费": ["费用", "收费", "tuition"],
        "专业": ["学科", "项目", "课程", "program"],
        "招生": ["录取", "招收", "入学"],
        "要求": ["条件", "标准", "资格"],
        "就业": ["工作", "career", "就业前景"],
    }
    
    # 问题模板
    QUESTION_PATTERNS = [
        # 关于X的问题
        (r"(.+)有(什么|哪些)(.+)", ["{0}开设{2}", "{0}提供{2}", "{0}的{2}是什么"]),
        (r"(.+)怎么(.+)", ["{0}如何{1}", "{0}{1}的方法", "如何{1}{0}"]),
        (r"(.+)是什么", ["{0}的介绍", "什么是{0}", "{0}概况"]),
        (r"如何(.+)", ["怎么{0}", "{0}的方法", "{0}流程"]),
    ]
    
    @classmethod
    def expand_question(cls, question: str) -> List[str]:
        """
        扩展问题，生成多个同义问法
        
        Args:
            question: 原始问题
            
        Returns:
            问题列表（包含原问题和扩展问题）
        """
        expanded = [question]  # 始终包含原问题
        
        # 1. 简称替换
        expanded.extend(cls._expand_abbreviations(question))
        
        # 2. 模式匹配和转换
        expanded.extend(cls._expand_patterns(question))
        
        # 去重
        expanded = list(set(expanded))
        
        if len(expanded) > 1:
            logger.info(f"📝 问题扩展: '{question}' -> {len(expanded)}个变体")
        
        return expanded
    
    @classmethod
    def _expand_abbreviations(cls, question: str) -> List[str]:
        """扩展简称"""
        expansions = []
        question_lower = question.lower()
        
        for abbr, full_forms in cls.ABBREVIATION_MAP.items():
            if abbr.lower() in question_lower:
                for full_form in full_forms:
                    # 替换简称为全称
                    expanded = re.sub(
                        abbr, 
                        full_form, 
                        question, 
                        flags=re.IGNORECASE
                    )
                    if expanded != question:
                        expansions.append(expanded)
        
        return expansions
    
    @classmethod
    def _expand_patterns(cls, question: str) -> List[str]:
        """基于模式扩展问题"""
        expansions = []
        
        for pattern, templates in cls.QUESTION_PATTERNS:
            match = re.match(pattern, question)
            if match:
                groups = match.groups()
                for template in templates:
                    try:
                        expanded = template.format(*groups)
                        if expanded != question:
                            expansions.append(expanded)
                    except:
                        continue
                break  # 只使用第一个匹配的模式
        
        return expansions
    
    @classmethod
    def extract_keywords(cls, question: str) -> List[str]:
        """
        提取问题中的关键词
        
        Returns:
            关键词列表
        """
        # 停用词
        stop_words = {
            '的', '了', '是', '在', '有', '和', '与', '及', '或', '等',
            '什么', '哪些', '如何', '怎么', '为什么', '吗', '呢', '吧',
            '请问', '可以', '能', '会', '吗', '？', '?', '。', '.'
        }
        
        # 简单分词（基于标点和空格）
        words = re.findall(r'[\u4e00-\u9fa5a-zA-Z0-9]+', question)
        
        # 过滤停用词和短词
        keywords = [
            w for w in words 
            if w not in stop_words and len(w) >= 2
        ]
        
        # 添加简称的全称
        expanded_keywords = list(keywords)
        for keyword in keywords:
            if keyword.lower() in cls.ABBREVIATION_MAP:
                expanded_keywords.extend(cls.ABBREVIATION_MAP[keyword.lower()])
        
        return list(set(expanded_keywords))


# 全局实例
qa_expansion = QAExpansion()

