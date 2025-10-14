"""
向量数据库提供商配置API
支持ChromaDB, Qdrant, Pinecone, Weaviate, Milvus等
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from loguru import logger
import httpx

from app.models.database import get_db, VectorDBProvider, KnowledgeBase

router = APIRouter()


# Pydantic模型
class VectorDBProviderCreate(BaseModel):
    name: str
    provider_type: str  # chromadb, qdrant, pinecone, weaviate, milvus
    host: Optional[str] = None
    port: Optional[int] = None
    api_key: Optional[str] = None
    collection_prefix: Optional[str] = None
    is_default: bool = False
    config: Optional[Dict[str, Any]] = None


class VectorDBProviderUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    api_key: Optional[str] = None
    collection_prefix: Optional[str] = None
    is_default: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class VectorDBTestRequest(BaseModel):
    provider_id: int


# 验证函数
async def verify_chromadb(host: str, port: int) -> Dict[str, Any]:
    """验证ChromaDB连接"""
    try:
        url = f"http://{host}:{port}/api/v1/heartbeat"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                return {
                    "valid": True,
                    "message": "ChromaDB连接成功",
                    "version": "latest"
                }
            else:
                return {
                    "valid": False,
                    "message": f"连接失败: HTTP {response.status_code}"
                }
    
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


async def verify_qdrant(host: str, port: int, api_key: Optional[str] = None) -> Dict[str, Any]:
    """验证Qdrant连接"""
    try:
        # 判断是否为Qdrant Cloud（包含.qdrant.io）或使用HTTPS端口
        is_cloud = ".qdrant.io" in host or port == 443 or port == 6334
        protocol = "https" if is_cloud else "http"
        
        # Qdrant Cloud通常使用6333端口（HTTPS）
        if is_cloud and port == 6333:
            url = f"{protocol}://{host}:{port}"
        elif is_cloud and ".qdrant.io" in host:
            # Qdrant Cloud可能不需要显式端口
            url = f"{protocol}://{host}"
        else:
            url = f"{protocol}://{host}:{port}"
        
        headers = {}
        if api_key:
            headers["api-key"] = api_key
        
        logger.info(f"验证Qdrant连接: {url}")
        
        async with httpx.AsyncClient(timeout=15.0, verify=True) as client:
            # 尝试获取集合列表
            response = await client.get(f"{url}/collections", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                collections = data.get("result", {}).get("collections", [])
                return {
                    "valid": True,
                    "message": f"Qdrant连接成功，当前有 {len(collections)} 个集合",
                    "collections": [c.get("name") for c in collections]
                }
            elif response.status_code == 401:
                return {
                    "valid": False,
                    "message": "API密钥无效或未授权"
                }
            elif response.status_code == 403:
                return {
                    "valid": False,
                    "message": "访问被拒绝，请检查API密钥权限"
                }
            else:
                return {
                    "valid": False,
                    "message": f"连接失败: HTTP {response.status_code}",
                    "response": response.text[:200]
                }
    
    except httpx.ConnectTimeout:
        return {
            "valid": False,
            "message": "连接超时，请检查主机地址和端口"
        }
    except httpx.ConnectError as e:
        return {
            "valid": False,
            "message": f"无法连接到服务器: {str(e)}"
        }
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


async def verify_pinecone(api_key: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """验证Pinecone连接"""
    try:
        environment = config.get("environment", "us-west1-gcp")
        url = f"https://controller.{environment}.pinecone.io/databases"
        
        headers = {
            "Api-Key": api_key,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                indexes = len(data) if isinstance(data, list) else 0
                return {
                    "valid": True,
                    "message": f"Pinecone连接成功，当前有 {indexes} 个索引",
                    "environment": environment
                }
            else:
                return {
                    "valid": False,
                    "message": f"连接失败: HTTP {response.status_code}"
                }
    
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


async def verify_weaviate(host: str, port: int, api_key: Optional[str] = None) -> Dict[str, Any]:
    """验证Weaviate连接"""
    try:
        url = f"http://{host}:{port}/v1/schema"
        headers = {}
        
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                classes = data.get("classes", [])
                return {
                    "valid": True,
                    "message": f"Weaviate连接成功，当前有 {len(classes)} 个类",
                    "classes": [c.get("class") for c in classes]
                }
            else:
                return {
                    "valid": False,
                    "message": f"连接失败: HTTP {response.status_code}"
                }
    
    except Exception as e:
        return {
            "valid": False,
            "message": f"连接失败: {str(e)}"
        }


async def verify_milvus(host: str, port: int) -> Dict[str, Any]:
    """验证Milvus连接"""
    try:
        url = f"http://{host}:{port}/api/v1/health"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                return {
                    "valid": True,
                    "message": "Milvus连接成功"
                }
            else:
                return {
                    "valid": False,
                    "message": f"连接失败: HTTP {response.status_code}"
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
    """列出所有向量数据库提供商"""
    providers = db.query(VectorDBProvider).all()
    return {
        "total": len(providers),
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "provider_type": p.provider_type,
                "host": p.host,
                "port": p.port,
                "is_default": p.is_default,
                "status": p.status,
                "created_at": p.created_at.isoformat()
            }
            for p in providers
        ]
    }


@router.post("/", status_code=201)
@router.post("", status_code=201)
async def create_provider(
    provider: VectorDBProviderCreate,
    db: Session = Depends(get_db)
):
    """创建新的向量数据库提供商（验证后）"""
    
    # 验证连接
    logger.info(f"开始验证 {provider.provider_type} 向量数据库连接...")
    
    verification_result = {"valid": False, "message": "未知提供商类型"}
    
    if provider.provider_type == "chromadb":
        if not provider.host or not provider.port:
            raise HTTPException(status_code=400, detail="ChromaDB需要提供host和port")
        verification_result = await verify_chromadb(provider.host, provider.port)
    
    elif provider.provider_type == "qdrant":
        if not provider.host or not provider.port:
            raise HTTPException(status_code=400, detail="Qdrant需要提供host和port")
        verification_result = await verify_qdrant(provider.host, provider.port, provider.api_key)
    
    elif provider.provider_type == "pinecone":
        if not provider.api_key:
            raise HTTPException(status_code=400, detail="Pinecone需要提供api_key")
        verification_result = await verify_pinecone(provider.api_key, provider.config or {})
    
    elif provider.provider_type == "weaviate":
        if not provider.host or not provider.port:
            raise HTTPException(status_code=400, detail="Weaviate需要提供host和port")
        verification_result = await verify_weaviate(provider.host, provider.port, provider.api_key)
    
    elif provider.provider_type == "milvus":
        if not provider.host or not provider.port:
            raise HTTPException(status_code=400, detail="Milvus需要提供host和port")
        verification_result = await verify_milvus(provider.host, provider.port)
    
    else:
        raise HTTPException(status_code=400, detail=f"不支持的提供商类型: {provider.provider_type}")
    
    # 如果验证失败，返回错误
    if not verification_result["valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"连接验证失败: {verification_result['message']}"
        )
    
    # 检查是否是第一个向量数据库
    existing_count = db.query(VectorDBProvider).count()
    
    # 如果是第一个，自动设为默认
    if existing_count == 0 and not provider.is_default:
        provider.is_default = True
    
    # 如果设置为默认，取消其他提供商的默认状态
    if provider.is_default:
        db.query(VectorDBProvider).update({"is_default": False})
    
    # 创建新提供商
    db_provider = VectorDBProvider(
        name=provider.name,
        provider_type=provider.provider_type,
        host=provider.host,
        port=provider.port,
        api_key=provider.api_key,
        collection_prefix=provider.collection_prefix,
        is_default=provider.is_default,
        config=provider.config,
        status="active"
    )
    
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    
    logger.info(f"✅ 创建向量数据库提供商: {db_provider.name}")
    
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
    """获取向量数据库提供商详情"""
    provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    return {
        "id": provider.id,
        "name": provider.name,
        "provider_type": provider.provider_type,
        "host": provider.host,
        "port": provider.port,
        "collection_prefix": provider.collection_prefix,
        "is_default": provider.is_default,
        "config": provider.config,
        "status": provider.status,
        "created_at": provider.created_at.isoformat()
    }


@router.put("/{provider_id}")
async def update_provider(
    provider_id: int,
    provider_update: VectorDBProviderUpdate,
    db: Session = Depends(get_db)
):
    """更新向量数据库提供商"""
    db_provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 如果设置为默认，取消其他提供商的默认状态
    if provider_update.is_default:
        db.query(VectorDBProvider).filter(VectorDBProvider.id != provider_id).update({"is_default": False})
    
    # 更新字段
    update_data = provider_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_provider, key, value)
    
    db.commit()
    db.refresh(db_provider)
    
    logger.info(f"✅ 更新向量数据库提供商: {db_provider.name}")
    
    return {
        "id": db_provider.id,
        "name": db_provider.name,
        "message": "更新成功"
    }


@router.delete("/{provider_id}")
async def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    """删除向量数据库提供商"""
    db_provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not db_provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    if db_provider.is_default:
        raise HTTPException(status_code=400, detail="无法删除默认提供商，请先设置其他提供商为默认")
    
    db.delete(db_provider)
    db.commit()
    
    logger.info(f"✅ 删除向量数据库提供商: {db_provider.name}")
    
    return {"message": "删除成功"}


@router.post("/verify")
@router.post("/verify/")
async def verify_provider_config(provider: VectorDBProviderCreate):
    """验证向量数据库配置（不保存）"""
    logger.info(f"验证 {provider.provider_type} 向量数据库配置...")
    
    verification_result = {"valid": False, "message": "未知提供商类型"}
    
    try:
        if provider.provider_type == "chromadb":
            if not provider.host or not provider.port:
                return {"success": False, "message": "ChromaDB需要提供host和port"}
            verification_result = await verify_chromadb(provider.host, provider.port)
        
        elif provider.provider_type == "qdrant":
            if not provider.host or not provider.port:
                return {"success": False, "message": "Qdrant需要提供host和port"}
            verification_result = await verify_qdrant(provider.host, provider.port, provider.api_key)
        
        elif provider.provider_type == "pinecone":
            if not provider.api_key:
                return {"success": False, "message": "Pinecone需要提供api_key"}
            verification_result = await verify_pinecone(provider.api_key, provider.config or {})
        
        elif provider.provider_type == "weaviate":
            if not provider.host or not provider.port:
                return {"success": False, "message": "Weaviate需要提供host和port"}
            verification_result = await verify_weaviate(provider.host, provider.port, provider.api_key)
        
        elif provider.provider_type == "milvus":
            if not provider.host or not provider.port:
                return {"success": False, "message": "Milvus需要提供host和port"}
            verification_result = await verify_milvus(provider.host, provider.port)
        
        else:
            return {"success": False, "message": f"不支持的提供商类型: {provider.provider_type}"}
        
        return {
            "success": verification_result["valid"],
            "message": verification_result["message"],
            "details": verification_result
        }
    
    except Exception as e:
        logger.error(f"验证失败: {e}")
        return {
            "success": False,
            "message": f"验证异常: {str(e)}"
        }


@router.post("/test")
@router.post("/test/")
async def test_connection(
    test_request: VectorDBTestRequest,
    db: Session = Depends(get_db)
):
    """测试向量数据库连接"""
    provider = db.query(VectorDBProvider).filter(
        VectorDBProvider.id == test_request.provider_id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 执行验证
    verification_result = {"valid": False, "message": "未知提供商类型"}
    
    if provider.provider_type == "chromadb":
        verification_result = await verify_chromadb(provider.host, provider.port)
    elif provider.provider_type == "qdrant":
        verification_result = await verify_qdrant(provider.host, provider.port, provider.api_key)
    elif provider.provider_type == "pinecone":
        verification_result = await verify_pinecone(provider.api_key, provider.config or {})
    elif provider.provider_type == "weaviate":
        verification_result = await verify_weaviate(provider.host, provider.port, provider.api_key)
    elif provider.provider_type == "milvus":
        verification_result = await verify_milvus(provider.host, provider.port)
    
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
        "verification_result": verification_result
    }


@router.post("/{provider_id}/set-default")
@router.post("/{provider_id}/set-default/")
async def set_default_provider(provider_id: int, db: Session = Depends(get_db)):
    """设置默认向量数据库提供商"""
    provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    # 取消其他提供商的默认状态
    db.query(VectorDBProvider).update({"is_default": False})
    
    # 设置当前提供商为默认
    provider.is_default = True
    db.commit()
    
    logger.info(f"✅ 设置默认向量数据库提供商: {provider.name}")
    
    return {
        "message": "设置成功",
        "provider": {
            "id": provider.id,
            "name": provider.name
        }
    }


@router.get("/{provider_id}/collections")
@router.get("/{provider_id}/collections/")
async def get_collections(provider_id: int, db: Session = Depends(get_db)):
    """获取向量数据库中所有的collections"""
    provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    try:
        if provider.provider_type == "qdrant":
            # 使用HTTP API获取Qdrant collections
            is_cloud = ".qdrant.io" in provider.host
            protocol = "https" if is_cloud else "http"
            
            if is_cloud:
                url = f"{protocol}://{provider.host}"
            else:
                url = f"{protocol}://{provider.host}:{provider.port}"
            
            headers = {}
            if provider.api_key:
                headers["api-key"] = provider.api_key
            
            async with httpx.AsyncClient(timeout=15.0, verify=True) as client:
                response = await client.get(f"{url}/collections", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    collections = data.get("result", {}).get("collections", [])
                    
                    # 获取每个collection的详细信息
                    collection_details = []
                    for col in collections:
                        col_name = col.get("name")
                        try:
                            detail_response = await client.get(
                                f"{url}/collections/{col_name}",
                                headers=headers
                            )
                            if detail_response.status_code == 200:
                                detail_data = detail_response.json()
                                result = detail_data.get("result", {})
                                # Qdrant使用points_count而不是vectors_count
                                points_count = result.get("points_count", 0)
                                vectors_count = result.get("vectors_count", points_count)  # 如果vectors_count不存在或为0，使用points_count
                                
                                collection_details.append({
                                    "name": col_name,
                                    "vectors_count": points_count if vectors_count == 0 else vectors_count,  # 优先使用points_count
                                    "points_count": points_count,
                                    "segments_count": result.get("segments_count", 0),
                                    "config": {
                                        "params": result.get("config", {}).get("params", {}),
                                    }
                                })
                                logger.info(f"Collection {col_name}: points={points_count}, vectors={vectors_count}")
                        except Exception as e:
                            logger.warning(f"无法获取collection {col_name} 的详细信息: {e}")
                            collection_details.append({
                                "name": col_name,
                                "vectors_count": 0,
                                "error": str(e)
                            })
                    
                    return {
                        "provider_id": provider_id,
                        "provider_name": provider.name,
                        "provider_type": provider.provider_type,
                        "total_collections": len(collection_details),
                        "collections": collection_details
                    }
                elif response.status_code == 403:
                    raise HTTPException(
                        status_code=403,
                        detail="访问被拒绝，请检查API密钥权限"
                    )
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"获取collections失败: {response.text}"
                    )
        
        elif provider.provider_type == "chromadb":
            # 使用ChromaDB客户端获取collections
            from app.core.vector_db_interface import ChromaDBAdapter
            from app.core.config import settings
            
            adapter = ChromaDBAdapter(persist_directory=str(settings.CHROMA_DB_PATH))
            collections = adapter.client.list_collections()
            
            collection_details = []
            for col in collections:
                stats = adapter.get_collection_stats(col.name)
                collection_details.append({
                    "name": col.name,
                    "vectors_count": stats.get("document_count", 0),
                    "metadata": col.metadata
                })
            
            return {
                "provider_id": provider_id,
                "provider_name": provider.name,
                "provider_type": provider.provider_type,
                "total_collections": len(collection_details),
                "collections": collection_details
            }
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"暂不支持获取 {provider.provider_type} 的collections"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取collections失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取collections失败: {str(e)}")


@router.delete("/{provider_id}/collections/{collection_name}")
async def delete_collection(
    provider_id: int,
    collection_name: str,
    db: Session = Depends(get_db)
):
    """删除指定的collection"""
    provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    try:
        from app.core.vector_db_interface import create_vector_db_adapter
        
        # 创建适配器
        adapter_config = {
            "provider_type": provider.provider_type,
            "host": provider.host,
            "port": provider.port,
            "api_key": provider.api_key,
            "https": ".qdrant.io" in (provider.host or "")
        }
        
        adapter = create_vector_db_adapter(adapter_config)
        adapter.delete_collection(collection_name)
        
        logger.info(f"✅ 删除collection: {collection_name} from {provider.name}")
        
        return {
            "message": f"成功删除collection: {collection_name}",
            "collection_name": collection_name,
            "provider_id": provider_id
        }
    
    except Exception as e:
        logger.error(f"删除collection失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除collection失败: {str(e)}")


@router.post("/{provider_id}/sync")
@router.post("/{provider_id}/sync/")
async def sync_collections(provider_id: int, db: Session = Depends(get_db)):
    """
    同步向量数据库与本地数据库
    扫描云端collections，与本地数据库进行对比，标记孤儿collection
    """
    provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    try:
        # 1. 获取云端所有collections
        cloud_collections = []
        
        if provider.provider_type == "qdrant":
            is_cloud = ".qdrant.io" in provider.host
            protocol = "https" if is_cloud else "http"
            
            if is_cloud:
                url = f"{protocol}://{provider.host}"
            else:
                url = f"{protocol}://{provider.host}:{provider.port}"
            
            headers = {}
            if provider.api_key:
                headers["api-key"] = provider.api_key
            
            async with httpx.AsyncClient(timeout=15.0, verify=True) as client:
                response = await client.get(f"{url}/collections", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    collections = data.get("result", {}).get("collections", [])
                    cloud_collections = [col.get("name") for col in collections]
                elif response.status_code == 403:
                    raise HTTPException(
                        status_code=403,
                        detail="访问被拒绝，请检查API密钥权限"
                    )
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"获取云端collections失败: {response.text}"
                    )
        
        elif provider.provider_type == "chromadb":
            from app.core.vector_db_interface import ChromaDBAdapter
            from app.core.config import settings
            
            adapter = ChromaDBAdapter(persist_directory=str(settings.CHROMA_DB_PATH))
            collections = adapter.client.list_collections()
            cloud_collections = [col.name for col in collections]
        
        # 2. 获取本地数据库中此提供商的所有知识库
        local_kbs = db.query(KnowledgeBase).filter(
            KnowledgeBase.vector_db_provider_id == provider_id
        ).all()
        
        local_collection_names = {kb.collection_name: kb for kb in local_kbs}
        
        # 3. 对比分析
        # 孤儿collections（只在云端存在，本地数据库没有记录）
        orphan_collections = [
            col for col in cloud_collections 
            if col not in local_collection_names
        ]
        
        # 缺失的collections（本地数据库有记录，但云端不存在）
        missing_collections = [
            {
                "kb_id": kb.id,
                "kb_name": kb.name,
                "collection_name": kb.collection_name
            }
            for kb in local_kbs 
            if kb.collection_name not in cloud_collections
        ]
        
        # 正常的collections（两边都存在）
        synced_collections = [
            {
                "kb_id": local_collection_names[col].id,
                "kb_name": local_collection_names[col].name,
                "collection_name": col
            }
            for col in cloud_collections 
            if col in local_collection_names
        ]
        
        return {
            "provider_id": provider_id,
            "provider_name": provider.name,
            "sync_status": {
                "total_cloud_collections": len(cloud_collections),
                "total_local_knowledge_bases": len(local_kbs),
                "synced_count": len(synced_collections),
                "orphan_count": len(orphan_collections),
                "missing_count": len(missing_collections)
            },
            "orphan_collections": orphan_collections,
            "missing_collections": missing_collections,
            "synced_collections": synced_collections,
            "recommendations": {
                "orphan": "这些collection存在于云端但本地数据库没有记录。可以选择删除或导入到本地数据库。",
                "missing": "这些知识库在本地数据库有记录但云端不存在。建议重新创建或清理本地记录。"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"同步collections失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"同步失败: {str(e)}")


@router.post("/{provider_id}/sync/cleanup-orphans")
@router.post("/{provider_id}/sync/cleanup-orphans/")
async def cleanup_orphan_collections(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """
    清理孤儿collections（只在云端存在，本地数据库没有记录的collections）
    """
    provider = db.query(VectorDBProvider).filter(VectorDBProvider.id == provider_id).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="提供商不存在")
    
    try:
        # 先执行同步检查
        sync_result = await sync_collections(provider_id, db)
        orphan_collections = sync_result["orphan_collections"]
        
        if not orphan_collections:
            return {
                "message": "没有孤儿collections需要清理",
                "deleted_count": 0
            }
        
        # 删除所有孤儿collections
        from app.core.vector_db_interface import create_vector_db_adapter
        
        adapter_config = {
            "provider_type": provider.provider_type,
            "host": provider.host,
            "port": provider.port,
            "api_key": provider.api_key,
            "https": ".qdrant.io" in (provider.host or "")
        }
        
        adapter = create_vector_db_adapter(adapter_config)
        
        deleted = []
        failed = []
        
        for col_name in orphan_collections:
            try:
                adapter.delete_collection(col_name)
                deleted.append(col_name)
                logger.info(f"✅ 清理孤儿collection: {col_name}")
            except Exception as e:
                failed.append({"name": col_name, "error": str(e)})
                logger.error(f"清理孤儿collection失败: {col_name}, {e}")
        
        return {
            "message": f"成功清理 {len(deleted)} 个孤儿collections",
            "deleted_count": len(deleted),
            "deleted_collections": deleted,
            "failed_count": len(failed),
            "failed_collections": failed
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"清理孤儿collections失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"清理失败: {str(e)}")
