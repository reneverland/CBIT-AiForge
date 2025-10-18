# CBIT-Forge 核心框架文档
**版本**: v3.0  
**更新日期**: 2025-10-17  
**数据库版本**: SQLite

---

## 📁 项目结构

```
cbit_forge/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── api/               # API 端点
│   │   │   ├── applications.py      # 应用实例管理
│   │   │   ├── app_inference.py     # 智能推理核心
│   │   │   ├── knowledge_bases.py   # 知识库管理
│   │   │   ├── fixed_qa.py          # 固定Q&A管理
│   │   │   ├── ai_providers.py      # AI提供商配置
│   │   │   ├── embedding_providers.py # Embedding配置
│   │   │   ├── vector_db_providers.py # 向量数据库配置
│   │   │   └── search_providers.py    # 搜索引擎配置
│   │   │
│   │   ├── core/              # 核心引擎
│   │   │   ├── mode_presets.py           # 模式预设配置（安全/标准/增强）
│   │   │   ├── hybrid_retrieval_engine.py # 混合检索引擎
│   │   │   ├── rag_engine.py             # RAG引擎
│   │   │   ├── embedding_engine.py       # Embedding引擎
│   │   │   ├── vector_db_interface.py    # 向量数据库接口
│   │   │   ├── multi_model_engine.py     # 多模型引擎
│   │   │   ├── text_splitter.py          # 智能文本分割
│   │   │   ├── tavily_search.py          # Tavily搜索集成
│   │   │   └── fixed_qa_matcher.py       # 固定Q&A匹配器
│   │   │
│   │   ├── models/            # 数据库模型
│   │   │   └── database.py    # 主数据库模型（v3.0）
│   │   │
│   │   ├── data/              # 数据目录 ⭐
│   │   │   ├── forge.db       # SQLite数据库 ⭐⭐⭐
│   │   │   ├── chromadb/      # ChromaDB向量数据
│   │   │   ├── uploads/       # 上传文件临时存储
│   │   │   ├── processed/     # 处理后的文件
│   │   │   └── models/        # 本地模型缓存
│   │   │
│   │   └── main.py            # FastAPI应用入口
│   │
│   ├── run.py                 # 启动脚本
│   └── requirements.txt       # Python依赖
│
└── frontend/                  # 前端应用
    ├── src/
    │   ├── pages/             # 页面组件
    │   │   ├── DashboardPage.tsx      # 仪表盘
    │   │   ├── ApplicationsPage.tsx   # 应用管理（含Playground）
    │   │   ├── KnowledgeBasePage.tsx  # 知识库管理
    │   │   ├── AIProvidersPage.tsx    # AI提供商配置
    │   │   └── SettingsPage.tsx       # 系统设置
    │   │
    │   ├── App.tsx            # 路由配置
    │   └── main.tsx           # React入口
    │
    └── package.json           # Node.js依赖
```

---

## 🗄️ 数据库路径

### 主数据库
```
路径: backend/app/data/forge.db
类型: SQLite
版本: v3.0
```

### 向量数据库（本地）
```
路径: backend/app/data/chromadb/
类型: ChromaDB
说明: 仅用于开发/测试，生产环境使用Qdrant
```

### 向量数据库（生产）
```
类型: Qdrant Cloud
配置位置: vector_db_providers 表
说明: 存储知识库向量数据
```

---

## 🏗️ 核心架构

### 1. 应用实例系统（v3.0）

#### 数据表结构
```sql
-- 应用实例表
CREATE TABLE applications (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    
    -- 核心工作模式
    mode VARCHAR(50) DEFAULT 'standard',  -- safe/standard/enhanced
    mode_config JSON,                      -- 模式配置（JSON格式）
    
    -- AI配置
    ai_provider VARCHAR(50) NOT NULL,
    llm_model VARCHAR(255) NOT NULL,
    temperature FLOAT DEFAULT 0.7,
    
    -- API配置
    api_key VARCHAR(255) UNIQUE NOT NULL,
    endpoint_path VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 统计信息
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    created_at DATETIME,
    updated_at DATETIME
);

-- 应用-知识库关联表
CREATE TABLE application_knowledge_bases (
    id INTEGER PRIMARY KEY,
    application_id INTEGER NOT NULL,
    knowledge_base_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 1,
    weight FLOAT DEFAULT 1.0,
    boost_factor FLOAT DEFAULT 1.0
);
```

#### 工作模式

| 模式 | 优先级 | 固定Q&A | 知识库 | AI生成 | 联网搜索 |
|------|--------|---------|--------|--------|----------|
| **安全模式** | 最高准确性 | ✅ 85%阈值 | ❌ | ❌ | ❌（可选） |
| **标准模式** | 平衡 | ✅ 90%阈值 | ✅ 75%阈值 | ✅ | ❌（可选） |
| **增强模式** | 最大灵活性 | ✅ 95%阈值 | ✅ 70%阈值 | ✅ | ✅（默认） |

#### Mode Config 字段说明
```json
{
  "system_prompt": "自定义系统提示词",
  "vector_kb_threshold": 0.70,     // 知识库检索阈值
  "allow_web_search": true,         // 是否允许联网搜索
  "custom_field": "任意自定义字段"
}
```

---

### 2. 知识库系统

#### 数据表结构
```sql
-- 知识库表
CREATE TABLE knowledge_bases (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    collection_name VARCHAR(255) UNIQUE NOT NULL,  -- 向量集合名称
    embedding_provider_id INTEGER,                 -- Embedding提供商
    vector_db_provider_id INTEGER,                 -- 向量数据库提供商
    document_count INTEGER DEFAULT 0,
    created_at DATETIME,
    updated_at DATETIME
);

-- 文档表
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    knowledge_base_id INTEGER NOT NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    source_type VARCHAR(50),  -- file/url/text
    file_path VARCHAR(500),
    metadata JSON,
    chunk_count INTEGER DEFAULT 0,
    created_at DATETIME
);

-- 文本片段表
CREATE TABLE text_chunks (
    id INTEGER PRIMARY KEY,
    knowledge_base_id INTEGER NOT NULL,
    document_id INTEGER,
    content TEXT NOT NULL,
    metadata JSON,
    vector_id VARCHAR(255),  -- 向量数据库中的ID
    created_at DATETIME
);
```

#### 知识库工作流程
```
1. 上传文档 → 2. 文本分割 → 3. Embedding → 4. 存储向量 → 5. 关联应用
```

---

### 3. 固定Q&A系统

#### 数据表结构
```sql
CREATE TABLE fixed_qa_pairs (
    id INTEGER PRIMARY KEY,
    application_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    embedding_cached TEXT,  -- 缓存的embedding向量
    created_at DATETIME,
    updated_at DATETIME
);
```

#### Q&A创建方式
1. **手动录入**：单条创建
2. **批量导入**：CSV/Excel文件
3. **文档生成**：上传文档，使用LLM自动提取Q&A
4. **智能提取**：识别"问题::答案"格式

---

### 4. 智能推理引擎

#### 检索流程（标准模式）
```
用户提问
    ↓
1. 固定Q&A精确匹配（阈值90%）
    ├─ 匹配成功 → 返回官方答案
    └─ 未匹配
        ↓
2. 知识库向量检索（阈值75%）
    ├─ 置信度 > 75% → LLM润色 → 返回答案
    └─ 置信度 < 75%
        ↓
3. 联网搜索（如果开启）
    ├─ 置信度 < 50% → 自动触发搜索
    └─ 整合搜索结果 → LLM生成 → 返回答案
        ↓
4. 无结果 → 提示超出知识范围
```

#### 策略模式
- **safe_priority**: 安全优先，需要用户授权才联网
- **realtime_knowledge**: 实时知识，自动触发联网（当enable_web_search=True）

---

### 5. 配置管理

#### AI提供商配置
```sql
CREATE TABLE embedding_providers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50),  -- openai/azure/huggingface等
    api_key VARCHAR(500),
    base_url VARCHAR(500),
    model_name VARCHAR(200),
    dimension INTEGER,
    is_default BOOLEAN DEFAULT FALSE
);
```

#### 向量数据库配置
```sql
CREATE TABLE vector_db_providers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50),  -- qdrant/chromadb/milvus等
    host VARCHAR(255),
    port INTEGER,
    api_key VARCHAR(500),
    is_default BOOLEAN DEFAULT FALSE
);
```

#### 搜索引擎配置
```sql
CREATE TABLE search_providers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50),  -- tavily/google/serper
    api_key VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE
);
```

---

## 🚀 启动指南

### 后端启动
```bash
cd backend
python3 run.py
# 访问: http://localhost:5003
# API文档: http://localhost:5003/docs
```

### 前端启动
```bash
cd frontend
npm run dev
# 访问: http://localhost:5173
```

### 一键启动
```bash
# 项目根目录
./start.sh
```

---

## 🔧 关键配置文件

### 后端配置
```
backend/app/core/config.py     # 核心配置
backend/app/data/api_config.json  # API配置模板
```

### 环境变量
```bash
# 可选：自定义端口
export BACKEND_PORT=5003
export FRONTEND_PORT=5173

# 可选：数据库路径
export DB_PATH=/path/to/forge.db
```

---

## 📊 API端点

### 应用管理
```
GET    /api/applications              # 列出所有应用
POST   /api/applications              # 创建应用
PUT    /api/applications/{id}         # 更新应用
DELETE /api/applications/{id}         # 删除应用
```

### 智能推理
```
POST   /api/apps/{path}/chat/completions  # 应用推理接口
```

### 知识库管理
```
GET    /api/knowledge-bases           # 列出知识库
POST   /api/knowledge-bases           # 创建知识库
POST   /api/knowledge-bases/{id}/texts  # 添加文本
POST   /api/knowledge-bases/{id}/documents  # 上传文档
```

### 固定Q&A管理
```
GET    /api/fixed-qa                  # 列出Q&A
POST   /api/fixed-qa                  # 创建Q&A
POST   /api/fixed-qa/batch            # 批量创建
POST   /api/fixed-qa/generate-from-file  # 文档生成Q&A
```

---

## 🔐 安全说明

### API密钥
- 每个应用实例都有唯一的API密钥
- 格式: `app_` + 32位随机字符串
- 用于调用应用的推理接口

### 数据库备份
```bash
# 建议定期备份
cp backend/app/data/forge.db backend/app/data/forge.db.backup_$(date +%Y%m%d)
```

### 敏感信息
- AI提供商API密钥存储在数据库中（加密建议）
- 生产环境建议使用环境变量或密钥管理服务

---

## 📝 版本历史

### v3.0 (2025-10-17)
- ✅ 应用实例系统重构（模式化配置）
- ✅ 知识库关联功能完善
- ✅ 固定Q&A管理系统
- ✅ 智能文本分割
- ✅ 联网搜索集成
- ✅ 动态模型加载
- ✅ 知识库阈值配置
- ✅ 系统提示词配置

### v2.x
- 基础RAG功能
- 知识库管理
- 向量检索

### v1.x
- 初始版本
- 基础问答功能

---

## 🆘 故障排查

### 数据库连接失败
```bash
# 检查数据库文件
ls -lh backend/app/data/forge.db

# 检查权限
chmod 644 backend/app/data/forge.db
```

### 向量检索失败
```bash
# 检查向量数据库连接
# 查看日志: backend/logs/cbit_forge.log
```

### API密钥无效
```bash
# 重新生成应用API密钥
# 在应用管理页面点击"重新生成密钥"
```

---

## 📞 技术支持

**项目**: CBIT-Forge  
**开发机构**: 香港中文大学（深圳）  
**数据库位置**: `backend/app/data/forge.db`  
**文档版本**: v3.0

---

**重要提示**: 
- ⭐⭐⭐ `backend/app/data/forge.db` 是核心数据库，包含所有配置和数据
- 请定期备份数据库
- 生产环境建议使用外部向量数据库（Qdrant）

