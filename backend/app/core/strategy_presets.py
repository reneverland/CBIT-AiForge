"""
策略预设配置

定义两种策略预设：
1. 🛡️ 安全优先模式 - 教育、医疗、法律（宁可不答，不可乱答）
2. 🌐 实时知识模式 - 新闻资讯、实时数据（积极联网获取最新信息）
"""

STRATEGY_PRESETS = {
    "safe_priority": {
        "name": "🛡️ 安全优先",
        "description": "高准确性，低置信度时需要用户授权联网。适用于教育、医疗、法律等对准确性要求高的场景。",
        "icon": "🛡️",
        "scenario": "教育、医疗、法律、金融",
        
        # Fixed Q&A 阈值 - 三区间
        "qa_direct_threshold": 0.92,      # A档：极高相似度才直接回答（92%+）
        "qa_suggest_threshold": 0.80,     # B档：高相似度显示建议（80%-92%）
        "qa_min_threshold": 0.60,         # C档：最低匹配门槛（60%-80%）
        
        # 知识库阈值 - 三区间
        "kb_high_confidence_threshold": 0.88,  # A档：极高置信度直接回答（88%+）
        "kb_context_threshold": 0.72,          # B档：中等置信度保守回答（72%-88%）
        "kb_min_threshold": 0.50,              # C档：最低相关门槛（50%-72%）
        
        # 联网搜索
        "web_search_trigger_threshold": 0.72,  # 知识库置信度<72%时触发联网提示
        "web_search_mode": "user_authorized",  # 需要用户授权才联网
        
        # 特点说明
        "features": [
            "宁可不答，不可乱答",
            "高置信度才回答",
            "低置信度时提示用户授权联网",
            "不会自动联网搜索"
        ]
    },
    
    "realtime_knowledge": {
        "name": "🌐 实时知识",
        "description": "积极联网获取最新信息，适用于新闻资讯、实时数据查询等需要时效性的场景。",
        "icon": "🌐",
        "scenario": "新闻、实时数据、动态信息",
        
        # Fixed Q&A 阈值 - 三区间
        "qa_direct_threshold": 0.85,      # A档：中高相似度直接回答（85%+）
        "qa_suggest_threshold": 0.70,     # B档：中等相似度显示建议（70%-85%）
        "qa_min_threshold": 0.45,         # C档：最低匹配门槛（45%-70%）
        
        # 知识库阈值 - 三区间
        "kb_high_confidence_threshold": 0.75,  # A档：中等置信度直接回答（75%+）
        "kb_context_threshold": 0.55,          # B档：较低置信度保守回答（55%-75%）
        "kb_min_threshold": 0.35,              # C档：最低相关门槛（35%-55%）
        
        # 联网搜索
        "web_search_trigger_threshold": 0.55,  # 知识库置信度<55%时自动触发联网
        "web_search_mode": "automatic",        # 自动联网搜索
        
        # 特点说明
        "features": [
            "积极联网获取最新信息",
            "知识库阈值适中偏低",
            "自动触发联网搜索",
            "适合需要实时性的场景"
        ]
    }
}


def get_preset_config(preset_name: str) -> dict:
    """
    获取预设配置
    
    Args:
        preset_name: 预设名称 ("safe_priority" 或 "realtime_knowledge")
    
    Returns:
        预设配置字典，如果预设不存在则返回 safe_priority
    """
    return STRATEGY_PRESETS.get(preset_name, STRATEGY_PRESETS["safe_priority"])


def get_all_presets() -> dict:
    """
    获取所有预设配置
    
    Returns:
        所有预设的字典
    """
    return STRATEGY_PRESETS


def apply_preset_to_config(fusion_config: dict, preset_name: str) -> dict:
    """
    将预设应用到融合配置
    
    Args:
        fusion_config: 当前融合配置
        preset_name: 预设名称
    
    Returns:
        更新后的融合配置
    """
    preset = get_preset_config(preset_name)
    
    # 更新 strategy 配置
    if "strategy" not in fusion_config:
        fusion_config["strategy"] = {}
    
    fusion_config["strategy"].update({
        "preset": preset_name,
        "qa_direct_threshold": preset["qa_direct_threshold"],
        "qa_suggest_threshold": preset["qa_suggest_threshold"],
        "qa_min_threshold": preset["qa_min_threshold"],
        "kb_high_confidence_threshold": preset["kb_high_confidence_threshold"],
        "kb_context_threshold": preset["kb_context_threshold"],
        "kb_min_threshold": preset["kb_min_threshold"],
        "web_search_trigger_threshold": preset["web_search_trigger_threshold"],
    })
    
    return fusion_config

