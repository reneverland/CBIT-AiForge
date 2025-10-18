# 🚀 服务器部署与更新指南

## 📋 目录
- [首次部署](#首次部署)
- [日常更新](#日常更新)
- [更新策略](#更新策略)
- [常见问题](#常见问题)

---

## 🎯 首次部署

### 1. 克隆项目

```bash
# SSH方式（推荐，需要配置SSH密钥）
git clone git@github.com:reneverland/CBIT-AiForge.git
cd CBIT-AiForge

# 或使用HTTPS方式
git clone https://github.com/reneverland/CBIT-AiForge.git
cd CBIT-AiForge
```

### 2. 配置环境

```bash
# 创建配置文件（从模板复制）
cp backend/app/data/api_config_template.json backend/app/data/api_config.json

# 编辑配置文件，填入你的API密钥
nano backend/app/data/api_config.json
```

### 3. 启动服务

```bash
# 使用Docker Compose启动
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 验证部署

```bash
# 检查后端健康状态
curl http://localhost:5003/health

# 访问前端
# 浏览器打开: http://your-server-ip:5173
```

---

## 🔄 日常更新

### 方案1：完整更新（推荐，包含依赖更新）

当你修改了以下内容时使用：
- ✅ Dockerfile
- ✅ requirements.txt / package.json（依赖项）
- ✅ Python/JavaScript代码
- ✅ 配置文件模板

```bash
cd /path/to/CBIT-AiForge

# 使用完整更新脚本
./server_update.sh
```

**脚本会自动完成：**
1. 📦 备份当前配置
2. 📥 拉取最新代码
3. 🛑 停止旧容器
4. 🔨 重新构建镜像
5. 🚀 启动新容器
6. ✅ 验证服务状态

**预计耗时：** 3-5分钟

---

### 方案2：快速更新（仅代码修改）

当你只修改了以下内容时使用：
- ✅ Python代码（.py文件）
- ✅ 前端代码（.tsx/.ts文件）
- ✅ 配置预设

```bash
cd /path/to/CBIT-AiForge

# 使用快速更新脚本
./server_quick_update.sh
```

**脚本会自动完成：**
1. 📦 备份配置
2. 📥 拉取最新代码
3. 🔄 重启容器

**预计耗时：** 10-20秒

---

### 方案3：手动更新（最灵活）

```bash
# 1. 进入项目目录
cd /path/to/CBIT-AiForge

# 2. 备份配置（重要！）
cp backend/app/data/api_config.json backend/app/data/api_config.json.backup

# 3. 拉取最新代码
git pull origin main

# 4. 恢复配置
cp backend/app/data/api_config.json.backup backend/app/data/api_config.json

# 5a. 完整重建（如果有依赖变化）
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 5b. 或者只重启（如果只是代码变化）
docker-compose restart

# 6. 查看日志
docker-compose logs -f
```

---

## 📊 更新策略对比

| 更新方式 | 适用场景 | 耗时 | 数据保留 | 配置保留 |
|---------|---------|------|---------|---------|
| **完整更新** | 依赖变化、重大更新 | 3-5分钟 | ✅ | ✅ |
| **快速更新** | 仅代码修改 | 10-20秒 | ✅ | ✅ |
| **手动更新** | 需要自定义操作 | 取决于操作 | ✅ | ✅ |

**⚠️ 注意：**
- 所有更新方式都会**保留数据库**（forge.db）
- 所有更新方式都会**保留配置文件**（api_config.json）
- 如需重置数据，手动删除 `backend/app/data/forge.db`

---

## 🔧 常用命令

### 查看服务状态

```bash
# 查看所有容器状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend
```

### 停止服务

```bash
# 停止但保留容器
docker-compose stop

# 停止并删除容器（保留数据）
docker-compose down

# 停止并删除容器和卷（⚠️ 会删除数据库）
docker-compose down -v
```

### 查看资源占用

```bash
# 查看容器资源使用
docker stats

# 查看磁盘占用
docker system df
```

---

## ❓ 常见问题

### Q1: 更新后配置丢失怎么办？

**A:** 配置文件有备份机制：

```bash
# 恢复备份
cp backend/app/data/api_config.json.backup backend/app/data/api_config.json

# 重启服务
docker-compose restart
```

---

### Q2: 如何查看当前运行的版本？

**A:** 查看Git提交记录

```bash
# 查看当前版本
git log -1 --oneline

# 查看最近5次提交
git log -5 --oneline
```

---

### Q3: 更新失败如何回滚？

**A:** 使用Git回滚

```bash
# 查看提交历史
git log --oneline

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新构建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### Q4: 如何清理旧镜像节省空间？

**A:** 定期清理Docker资源

```bash
# 删除未使用的镜像
docker image prune -a

# 删除未使用的容器、网络、卷
docker system prune -a

# 查看清理后的空间
docker system df
```

---

### Q5: 数据库如何备份？

**A:** 定期备份数据库文件

```bash
# 备份数据库
cp backend/app/data/forge.db backend/app/data/forge.db.backup_$(date +%Y%m%d_%H%M%S)

# 自动化备份（添加到crontab）
0 2 * * * cd /path/to/CBIT-AiForge && cp backend/app/data/forge.db backend/app/data/forge.db.backup_$(date +\%Y\%m\%d)
```

---

## 🆘 获取帮助

遇到问题？

1. 查看日志：`docker-compose logs -f`
2. 检查服务状态：`docker-compose ps`
3. 查看健康检查：`curl http://localhost:5003/health`
4. 提交Issue：https://github.com/reneverland/CBIT-AiForge/issues

---

**© 2025 Reneverland, CBIT, CUHK**

