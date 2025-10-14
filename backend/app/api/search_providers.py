"""
搜索服务提供商配置API
支持Google Search, Bing, Serper等
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger
import httpx
from datetime import datetime, date

from app.models.database import get_db, SearchProvider

router = APIRouter()


# Pydantic模型
class SearchProviderCreate(BaseModel):
    name: str
    provider_type: str  # google, bing, serper, serpapi
    api_key: str
    search_engine_id: Optional[str] = None  # Google Custom Search需要
    base_url: Optional[str] = None
    is_default: bool = False
    config: Optional[Dict[str, Any]] = None
    daily_limit: Optional[int] = None


class SearchProviderUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    search_engine_id: Optional[str] = None
    base_url: Optional[str] = None
    is_default: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None
    daily_limit: Optional[int] = None


class SearchTestRequest(BaseModel):
    provider_id: int
    query: str = "test search"


# 验证函数
async def verify_google_search(api_key: str, search_engine_id: str) -> Dict[str, Any]:
    """验证Google Custom Search API"""
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": search_engine_id,
            "q": "test",
            "num": 1
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                total_results = int(data.get("searchInformation", {}).get("totalResults", 0))
                return {
                    "valid": True,
                    "message": f"验证成功，找到 {total_results} 条结果",
                    "quota_info": data.get("queries", {}).get("request", [{}])[0]
                }
            else:
                error_data = response.json() if response.text else {}
                error_message = error_data.get("error", {}).get("message", response.text[:200])
                return {
                    "valid": False,
                    "message": f"验证失败: {error_message}",
                    "status_code": response.status_code
                }
    
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


async def verify_serper_api(api_key: str) -> Dict[str, Any]:
    """验证Serper API"""
    try:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json"
        }
        payload = {"q": "test"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                result_count = len(data.get("organic", []))
                return {
                    "valid": True,
                    "message": f"验证成功，返回 {result_count} 条结果"
                }
            else:
                return {
                    "valid": False,
                    "message": f"验证失败: HTTP {response.status_code}",
                    "status_code": response.status_code
                }
    
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


async def verify_serpapi(api_key: str) -> Dict[str, Any]:
    """验证SerpAPI"""
    try:
        url = "https://serpapi.com/search"
        params = {
            "api_key": api_key,
            "q": "test",
            "num": 1
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                result_count = len(data.get("organic_results", []))
                return {
                    "valid": True,
                    "message": f"验证成功，返回 {result_count} 条结果",
                    "account_info": data.get("search_metadata", {})
                }
            else:
                return {
                    "valid": False,
                    "message": f"验证失败: HTTP {response.status_code}",
                    "status_code": response.status_code
                }
    
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


async def verify_tavily_api(api_key: str) -> Dict[str, Any]:
    """验证Tavily AI Search API"""
    try:
        url = "https://api.tavily.com/search"
        headers = {
            "Content-Type": "application/json"
        }
        payload = {
            "api_key": api_key,
            "query": "test",
            "search_depth": "basic",
            "max_results": 1
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                result_count = len(data.get("results", []))
                return {
                    "valid": True,
                    "message": f"✅ Tavily API验证成功，返回 {result_count} 条结果",
                    "quota_info": {
                        "answer": data.get("answer", ""),
                        "query": data.get("query", "")
                    }
                }
            elif response.status_code == 401:
                return {
                    "valid": False,
                    "message": "❌ API密钥无效，请检查您的Tavily API密钥",
                    "status_code": response.status_code
                }
            elif response.status_code == 429:
                return {
                    "valid": False,
                    "message": "⚠️ API配额已用完，请升级您的Tavily账户",
                    "status_code": response.status_code
                }
            else:
                error_data = response.json() if response.text else {}
                error_message = error_data.get("detail", response.text[:200])
                return {
                    "valid": False,
                    "message": f"验证失败: {error_message}",
                    "status_code": response.status_code
                }
    
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


# API端点
@router.get("/")
@router.get("")
async def list_providers(db: Session = Depends(get_db)):
    """列出所有搜索服务提供商"""
    providers = db.query(SearchProvider).all()
    return {
        "total": len(providers),
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "provider_type": p.provider_type,
                "is_default": p.is_default,
                "status": p.status,
                "daily_limit": p.daily_limit,
                "current_usage": p.current_usage,
                "last_reset_date": p.last_reset_date.isoformat() if p.last_reset_date else None,
                "created_at": p.created_at.isoformat()
            }
            for p in providers
        ]
    }


@router.post("/", status_code=201)
@router.post("", status_code=201)
async def create_provider(
    provider: SearchProviderCreate,
    db: Session = Depends(get_db)
):
    """创建新的搜索服务提供商（验证后）"""
    
    # 验证API
    logger.info(f"开始验证 {provider.provider_type} 搜索API...")
    
    verification_result = {"valid": False, "message": "未知提供商类型"}
    
    if provider.provider_type == "google":
        if not provider.search_engine_id:
            raise HTTPException(status_code=400, detail="Google Search需要提供search_engine_id")
        verification_result = await verify_google_search(provider.api_key, provider.search_engine_id)
    
    elif provider.provider_type == "serper":
        verification_result = await verify_serper_api(provider.api_key)
    
    elif provider.provider_type == "serpapi":
        verification_result = await verify_serpapi(provider.api_key)
    
    elif provider.provider_type == "tavily":
        verification_result = await verify_tavily_api(provider.api_key)
    
    elif provider.provider_type == "bing":
        # TODO: 实现Bing搜索验证
        verification_result = {
            "valid": True,
            "message": "Bing搜索验证暂未实现，已跳过"
        }
    
    else:
        raise HTTPException(status_code=400, detail=f"不支持的提供商类型: {provider.provider_type}")
    
    # 如果验证失败，返回错误
    if not verification_result["valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"API验证失败: {verification_result['message']}"
        )
    
    # 如果设置为默认，取消其他提供商的默认状态
    if provider.is_default:
        db.query(SearchProvider).update({"is_default": False})
    
    # 创建新提供商
    db_provider = SearchProvider(
        name=provider.name,
        provider_type=provider.provider_type,
        api_key=provider.api_key,
        search_engine_id=provider.search_engine_id,
        base_url=provider.base_url,
        is_default=provider.is_default,
        config=provider.config,
        daily_limit=provider.daily_limit,
        current_usage=0,
        last_reset_date=datetime.utcnow().date(),
        status="active"
    )
    
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    
    logger.info(f"✅ 创建搜索服务提供商: {db_provider.name}")
    
    return {
        "id": db_provider.id,
        "name": db_provider.name,
        "provider_type": db_provider.provider_type,
        "is_default": db_provider.is_default,
        "status": db_provider.status,
        "verification_message": verification_result["message"],
        "message": "创建成功"
    }


@router.get("/{provider_id}")
async def get_provider(provider_id: int, db: Session = Depends(get_db)):
    """获取搜索服务提供商详情"""
    provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    return {
        "id": provider.id,
        "name": provider.name,
        "provider_type": provider.provider_type,
        "search_engine_id": provider.search_engine_id,
        "base_url": provider.base_url,
        "is_default": provider.is_default,
        "config": provider.config,
        "daily_limit": provider.daily_limit,
        "current_usage": provider.current_usage,
        "last_reset_date": provider.last_reset_date.isoformat() if provider.last_reset_date else None,
        "status": provider.status,
        "created_at": provider.created_at.isoformat()
    }


@router.put("/{provider_id}")
async def update_provider(
    provider_id: int,
    provider_update: SearchProviderUpdate,
    db: Session = Depends(get_db)
):
    """更新搜索服务提供商"""
    db_provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 如果设置为默认，取消其他提供商的默认状态
    if provider_update.is_default:
        db.query(SearchProvider).filter(SearchProvider.id != provider_id).update({"is_default": False})
    
    # 更新字段
    update_data = provider_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_provider, key, value)
    
    db.commit()
    db.refresh(db_provider)
    
    logger.info(f"✅ 更新搜索服务提供商: {db_provider.name}")
    
    return {
        "id": db_provider.id,
        "name": db_provider.name,
        "message": "更新成功"
    }


@router.delete("/{provider_id}")
async def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    """删除搜索服务提供商"""
    db_provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    if db_provider.is_default:
        raise HTTPException(status_code=400, detail="无法删除默认提供商，请先设置其他提供商为默认")
    
    db.delete(db_provider)
    db.commit()
    
    logger.info(f"✅ 删除搜索服务提供商: {db_provider.name}")
    
    return {"message": "删除成功"}


@router.post("/test")
@router.post("/test/")
async def test_search(
    test_request: SearchTestRequest,
    db: Session = Depends(get_db)
):
    """测试搜索服务提供商"""
    provider = db.query(SearchProvider).filter(
        SearchProvider.id == test_request.provider_id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 执行验证
    verification_result = {"valid": False, "message": "未知提供商类型"}
    
    if provider.provider_type == "google":
        verification_result = await verify_google_search(
            provider.api_key,
            provider.search_engine_id
        )
    elif provider.provider_type == "serper":
        verification_result = await verify_serper_api(provider.api_key)
    elif provider.provider_type == "serpapi":
        verification_result = await verify_serpapi(provider.api_key)
    elif provider.provider_type == "tavily":
        verification_result = await verify_tavily_api(provider.api_key)
    
    # 更新状态
    if verification_result["valid"]:
        provider.status = "active"
    else:
        provider.status = "error"
    
    db.commit()
    
    return {
        "provider": {
            "id": provider.id,
            "name": provider.name,
            "provider_type": provider.provider_type
        },
        "test_query": test_request.query,
        "verification_result": verification_result
    }


@router.post("/{provider_id}/set-default")
@router.post("/{provider_id}/set-default/")
async def set_default_provider(provider_id: int, db: Session = Depends(get_db)):
    """设置默认搜索服务提供商"""
    provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 取消其他提供商的默认状态
    db.query(SearchProvider).update({"is_default": False})
    
    # 设置当前提供商为默认
    provider.is_default = True
    db.commit()
    
    logger.info(f"✅ 设置默认搜索服务提供商: {provider.name}")
    
    return {
        "message": "设置成功",
        "provider": {
            "id": provider.id,
            "name": provider.name
        }
    }


@router.post("/{provider_id}/reset-usage")
@router.post("/{provider_id}/reset-usage/")
async def reset_usage(provider_id: int, db: Session = Depends(get_db)):
    """重置使用量"""
    provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    provider.current_usage = 0
    provider.last_reset_date = datetime.utcnow().date()
    db.commit()
    
    logger.info(f"✅ 重置搜索服务提供商使用量: {provider.name}")
    
    return {
        "message": "使用量已重置",
        "provider": {
            "id": provider.id,
            "name": provider.name,
            "current_usage": provider.current_usage
        }
    }
