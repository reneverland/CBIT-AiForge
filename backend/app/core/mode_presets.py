"""
应用模式预设配置 v3.0
定义三种工作模式的默认配置
"""

# 🔒 安全模式配置
SAFE_MODE = {
    "priority_order": ["fixed_qa_exact", "fixed_qa_similar"],
    "enable_fixed_qa": True,  # 显式启用Q&A
    "enable_vector_kb": False,  # 不启用向量知识库
    "enable_web_search": False,  # 不启用联网搜索
    "fixed_qa_threshold": 0.85,
    "recommend_count": 5,
    "recommend_threshold": 0.65,
    "allow_ai_generation": False,
    "allow_web_search": False,
    "enable_llm_polish": False,
    "enable_source_tracking": True,
    "enable_citation": True,
    "web_search_domains": [],  # 不限制搜索域名
    "search_channels": ["tavily", "google", "serper"],  # 搜索引擎通道
    "fallback_message": "抱歉，未找到准确答案。以下是相关问题推荐：",
    "max_tokens": 1500,
    "top_k": 5
}

# ⚡ 标准模式配置（推荐）
STANDARD_MODE = {
    "priority_order": ["fixed_qa_exact", "fixed_qa_similar", "vector_kb", "ai_generation"],
    "enable_fixed_qa": True,  # 显式启用Q&A
    "enable_vector_kb": True,  # 启用向量知识库
    "enable_web_search": False,  # 不启用联网搜索
    "fixed_qa_threshold": 0.90,
    "fixed_qa_recommend_threshold": 0.70,
    "vector_kb_threshold": 0.75,
    "recommend_count": 3,
    "recommend_threshold": 0.65,
    "allow_ai_generation": True,
    "allow_web_search": False,
    "enable_llm_polish": True,
    "enable_source_tracking": True,
    "enable_citation": True,
    "web_search_domains": [],  # 不限制搜索域名
    "search_channels": ["tavily", "google", "serper"],  # 搜索引擎通道
    "fallback_message": "根据知识库内容，我为您生成了以下答案：",
    "ai_generation_note": "【AI生成-建议核实】",
    "web_search_note": "【含联网信息】",
    "max_tokens": 2000,
    "top_k": 5,
    # Q&A匹配策略配置
    "fusion_config": {
        "strategy": {
            "fixed_qa_mode": "smart",
            "qa_direct_threshold": 0.90,
            "qa_suggest_threshold": 0.55,  # 降低阈值提高召回率
            "qa_min_threshold": 0.50,
            "bm25_threshold": 0.55,
            "max_suggestions": 3
        }
    }
}

# 🌐 增强模式配置
ENHANCED_MODE = {
    "priority_order": ["fixed_qa_exact", "vector_kb", "web_search", "ai_generation"],
    "enable_fixed_qa": True,  # 显式启用Q&A
    "enable_vector_kb": True,  # 启用向量知识库
    "enable_web_search": True,  # 启用联网搜索
    "fixed_qa_threshold": 0.95,
    "vector_kb_threshold": 0.70,
    "web_search_auto_threshold": 0.50,
    "recommend_count": 3,
    "recommend_threshold": 0.60,
    "allow_ai_generation": True,
    "allow_web_search": True,
    "enable_llm_polish": True,
    "enable_source_tracking": True,
    "enable_citation": True,
    "web_search_domains": [],  # 空列表表示不限制
    "search_channels": ["tavily", "google", "serper"],  # 搜索引擎优先级：Tavily > Google > Serper
    "fallback_message": "结合多个来源，我为您生成了以下答案：",
    "ai_generation_note": "【AI综合-建议核实】",
    "web_search_note": "【含联网信息】",
    "max_tokens": 2500,
    "top_k": 8,
    # Q&A匹配策略配置
    "fusion_config": {
        "strategy": {
            "fixed_qa_mode": "smart",
            "qa_direct_threshold": 0.95,
            "qa_suggest_threshold": 0.60,
            "qa_min_threshold": 0.55,
            "bm25_threshold": 0.60,
            "max_suggestions": 3
        }
    }
}

# 模式映射
MODE_PRESETS = {
    "safe": SAFE_MODE,
    "standard": STANDARD_MODE,
    "enhanced": ENHANCED_MODE
}

# 模式描述（用于前端显示）
MODE_DESCRIPTIONS = {
    "safe": {
        "name": "🔒 安全模式",
        "subtitle": "仅使用固定Q&A，100%准确",
        "features": [
            "✓ 精确匹配返回官方答案",
            "✓ 显示相似问题推荐（5个）",
            "✗ 不生成AI答案",
            "✗ 不联网搜索"
        ],
        "speed": 5,
        "accuracy": 5,
        "flexibility": 2,
        "use_case": "适用于客服FAQ、政策问答等需要100%准确的场景"
    },
    "standard": {
        "name": "⚡ 标准模式",
        "subtitle": "平衡准确性与灵活性（推荐）",
        "features": [
            "✓ 优先固定Q&A（95%权重）",
            "✓ 知识库智能检索",
            "✓ AI生成答案（有标注）",
            "✗ 不联网搜索"
        ],
        "speed": 4,
        "accuracy": 4,
        "flexibility": 4,
        "use_case": "适用于大多数企业知识问答、文档查询场景"
    },
    "enhanced": {
        "name": "🌐 增强模式",
        "subtitle": "最强大但需人工核实",
        "features": [
            "✓ 固定Q&A优先",
            "✓ 知识库检索",
            "✓ 实时联网搜索",
            "✓ AI智能综合"
        ],
        "speed": 3,
        "accuracy": 3,
        "flexibility": 5,
        "use_case": "适用于研究分析、实时信息查询等探索性场景"
    }
}


def deep_merge(base: dict, override: dict) -> dict:
    """深度合并两个字典
    
    Args:
        base: 基础字典
        override: 覆盖字典（优先级更高）
        
    Returns:
        合并后的字典
    """
    import copy
    result = copy.deepcopy(base)
    
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # 递归合并嵌套字典
            result[key] = deep_merge(result[key], value)
        else:
            # 直接覆盖
            result[key] = copy.deepcopy(value)
    
    return result


def get_mode_config(mode: str, custom_config: dict = None) -> dict:
    """获取模式配置
    
    Args:
        mode: 模式名称 (safe, standard, enhanced)
        custom_config: 自定义配置（会覆盖预设）
        
    Returns:
        完整的模式配置字典
    """
    import copy
    # 获取预设配置（深拷贝避免修改原始预设）
    preset = copy.deepcopy(MODE_PRESETS.get(mode, MODE_PRESETS["standard"]))
    
    # 如果有自定义配置，使用深度合并
    if custom_config:
        preset = deep_merge(preset, custom_config)
    
    return preset


def validate_mode(mode: str) -> bool:
    """验证模式是否有效"""
    return mode in MODE_PRESETS


def get_mode_description(mode: str) -> dict:
    """获取模式描述信息"""
    return MODE_DESCRIPTIONS.get(mode, MODE_DESCRIPTIONS["standard"])

