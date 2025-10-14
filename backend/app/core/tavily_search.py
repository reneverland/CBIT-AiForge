"""
Tavily AI Search API 集成
为AI应用优化的实时网络搜索引擎
"""

from typing import List, Dict, Any, Optional
from loguru import logger
import httpx
import asyncio


class TavilySearch:
    """Tavily AI Search 客户端"""
    
    def __init__(self, api_key: str):
        """
        初始化Tavily搜索客户端
        
        Args:
            api_key: Tavily API密钥
        """
        self.api_key = api_key
        self.base_url = "https://api.tavily.com"
        self.timeout = 30.0
    
    async def search(
        self,
        query: str,
        search_depth: str = "basic",  # basic 或 advanced
        max_results: int = 5,
        include_answer: bool = True,
        include_raw_content: bool = False,
        include_images: bool = False,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        执行Tavily搜索
        
        Args:
            query: 搜索查询
            search_depth: 搜索深度 (basic: 快速, advanced: 深入)
            max_results: 最大结果数
            include_answer: 是否包含AI生成的答案
            include_raw_content: 是否包含原始网页内容
            include_images: 是否包含图片
            include_domains: 限制搜索的域名列表
            exclude_domains: 排除的域名列表
        
        Returns:
            搜索结果字典
        """
        try:
            url = f"{self.base_url}/search"
            
            payload = {
                "api_key": self.api_key,
                "query": query,
                "search_depth": search_depth,
                "max_results": max_results,
                "include_answer": include_answer,
                "include_raw_content": include_raw_content,
                "include_images": include_images
            }
            
            # 添加可选参数
            if include_domains:
                payload["include_domains"] = include_domains
            if exclude_domains:
                payload["exclude_domains"] = exclude_domains
            
            logger.info(f"🌐 Tavily搜索: {query} (深度: {search_depth}, 最大结果: {max_results})")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result_count = len(data.get("results", []))
                    logger.info(f"✅ Tavily搜索成功，返回 {result_count} 条结果")
                    
                    return {
                        "success": True,
                        "query": data.get("query", query),
                        "answer": data.get("answer", ""),
                        "results": data.get("results", []),
                        "images": data.get("images", []),
                        "follow_up_questions": data.get("follow_up_questions", []),
                        "search_depth": search_depth,
                        "result_count": result_count
                    }
                
                elif response.status_code == 401:
                    logger.error("❌ Tavily API密钥无效")
                    return {
                        "success": False,
                        "error": "API密钥无效",
                        "results": []
                    }
                
                elif response.status_code == 429:
                    logger.error("⚠️ Tavily API配额已用完")
                    return {
                        "success": False,
                        "error": "API配额已用完",
                        "results": []
                    }
                
                else:
                    error_data = response.json() if response.text else {}
                    error_message = error_data.get("detail", response.text[:200])
                    logger.error(f"❌ Tavily搜索失败: {error_message}")
                    return {
                        "success": False,
                        "error": error_message,
                        "results": []
                    }
        
        except asyncio.TimeoutError:
            logger.error("⏱️ Tavily搜索超时")
            return {
                "success": False,
                "error": "搜索超时",
                "results": []
            }
        
        except Exception as e:
            logger.error(f"❌ Tavily搜索异常: {e}")
            return {
                "success": False,
                "error": str(e),
                "results": []
            }
    
    def format_results_for_rag(
        self,
        search_results: Dict[str, Any],
        relevance_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        将Tavily搜索结果格式化为RAG引擎可用的格式
        
        Args:
            search_results: Tavily搜索结果
            relevance_threshold: 相关性阈值
        
        Returns:
            格式化的结果列表
        """
        if not search_results.get("success"):
            return []
        
        formatted_results = []
        
        # 如果有AI生成的答案，作为第一条结果
        if search_results.get("answer"):
            formatted_results.append({
                "content": search_results["answer"],
                "source": "tavily_answer",
                "title": "AI综合答案",
                "url": "",
                "relevance": 0.90,  # 设为90%相关性，表示这是AI综合的答案，非直接匹配
                "answer": search_results["answer"]
            })
        
        # 处理搜索结果
        for result in search_results.get("results", []):
            score = result.get("score", 0.5)
            
            # 过滤低相关性结果
            if score < relevance_threshold:
                continue
            
            formatted_results.append({
                "content": result.get("content", ""),
                "source": "tavily_web",
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "relevance": score,
                "raw_content": result.get("raw_content", "") if result.get("raw_content") else result.get("content", ""),
                "published_date": result.get("published_date", "")
            })
        
        logger.info(f"📊 格式化 {len(formatted_results)} 条Tavily结果用于RAG")
        
        return formatted_results


async def search_with_tavily(
    api_key: str,
    query: str,
    max_results: int = 5,
    search_depth: str = "basic",
    include_domains: Optional[List[str]] = None,
    exclude_domains: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    便捷函数：使用Tavily搜索并返回格式化结果
    
    Args:
        api_key: Tavily API密钥
        query: 搜索查询
        max_results: 最大结果数
        search_depth: 搜索深度
        include_domains: 限制域名
        exclude_domains: 排除域名
    
    Returns:
        格式化的搜索结果列表
    """
    tavily = TavilySearch(api_key)
    
    search_results = await tavily.search(
        query=query,
        max_results=max_results,
        search_depth=search_depth,
        include_domains=include_domains,
        exclude_domains=exclude_domains
    )
    
    return tavily.format_results_for_rag(search_results)

