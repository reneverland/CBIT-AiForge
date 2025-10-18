# CBIT-Forge 快速参考卡片

## 🎯 核心信息

**数据库路径**: `backend/app/data/forge.db` ⭐⭐⭐  
**后端端口**: 5003  
**前端端口**: 5173  
**当前版本**: v3.0

---

## 🚀 快速启动

```bash
# 方式1: 一键启动（推荐）
./start.sh

# 方式2: 分别启动
# 终端1 - 后端
cd backend && python3 run.py

# 终端2 - 前端
cd frontend && npm run dev
```

---

## 📂 关键目录

```
backend/app/data/forge.db         ← 主数据库
backend/app/data/chromadb/        ← 向量数据（本地）
backend/app/data/uploads/         ← 上传文件
backend/logs/                     ← 日志文件
frontend/src/pages/               ← 前端页面
```

---

## 🎨 三种工作模式

| 模式 | 固定Q&A | 知识库 | AI生成 | 联网搜索 |
|------|---------|--------|--------|----------|
| **🔒 安全** | ✅ | ❌ | ❌ | 可选 |
| **⚡ 标准** | ✅ | ✅ | ✅ | 可选 |
| **🌐 增强** | ✅ | ✅ | ✅ | 默认✅ |

---

## 🔧 常用命令

### 数据库备份
```bash
cp backend/app/data/forge.db backend/app/data/forge.db.backup_$(date +%Y%m%d)
```

### 查看日志
```bash
tail -f backend/logs/cbit_forge.log
```

### 重启服务
```bash
# 查找并停止进程
lsof -i :5003 | grep LISTEN | awk '{print $2}' | xargs kill -9

# 重新启动
cd backend && python3 run.py
```

---

## 📊 配置优先级

### 知识库阈值
```
用户设置 > mode_config > 模式默认值
```

### 系统提示词
```
mode_config.system_prompt > 默认提示词
```

### 联网搜索
```
mode_config.allow_web_search > 模式默认设置
```

---

## 🔑 API调用示例

```bash
# 应用推理接口
curl -X POST http://localhost:5003/api/apps/YOUR_APP_PATH/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "你的问题"}],
    "stream": false
  }'
```

---

## 🆘 快速问题解决

### 问题1: 数据库锁定
```bash
# 关闭所有后端进程
lsof -i :5003 | awk 'NR>1 {print $2}' | xargs kill -9
```

### 问题2: 前端连接失败
```bash
# 检查后端是否运行
curl http://localhost:5003/api/applications
```

### 问题3: 知识库检索失败
- 检查向量数据库配置
- 确认知识库已关联到应用
- 查看后端日志

---

## 📞 重要链接

- API文档: http://localhost:5003/docs
- 前端界面: http://localhost:5173
- 健康检查: http://localhost:5003/health

---

**最后更新**: 2025-10-17  
**详细文档**: 见 `CORE_FRAMEWORK.md`

