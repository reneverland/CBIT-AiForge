# 🔄 本地开发到服务器部署工作流程

## 📝 完整流程

### 1️⃣ 本地开发（在Mac上）

```bash
# 启动本地开发环境
cd "/Users/Ren/Documents/CBIT Work/cbit_forge"

# 启动后端
cd backend && python3 run.py

# 启动前端（新终端）
cd frontend && npm run dev
```

**访问本地服务：**
- 前端：http://localhost:5173
- 后端：http://localhost:5003

---

### 2️⃣ 提交代码到Git

```bash
# 查看修改
git status

# 添加文件
git add .

# 提交
git commit -m "描述你的修改"

# 推送到GitHub
git push origin main
```

---

### 3️⃣ 服务器更新

#### 方式A：完整更新（有依赖变化）

```bash
# SSH登录服务器
ssh your-server

# 进入项目目录
cd /path/to/CBIT-AiForge

# 执行完整更新
./server_update.sh
```

**什么时候用完整更新？**
- ✅ 修改了 `requirements.txt` 或 `package.json`
- ✅ 修改了 `Dockerfile`
- ✅ 添加了新的Python/Node包
- ✅ 重大版本更新

**耗时：** 3-5分钟

---

#### 方式B：快速更新（仅代码修改）⚡

```bash
# SSH登录服务器
ssh your-server

# 进入项目目录
cd /path/to/CBIT-AiForge

# 执行快速更新
./server_quick_update.sh
```

**什么时候用快速更新？**
- ✅ 只修改了Python代码（.py文件）
- ✅ 只修改了前端代码（.tsx/.ts文件）
- ✅ 修改了配置预设
- ✅ 小的bug修复

**耗时：** 10-20秒

---

## 🎯 典型使用场景

### 场景1：修复Bug

```bash
# 1. 本地修改代码
vim backend/app/api/applications.py

# 2. 本地测试
python3 backend/run.py

# 3. 提交到Git
git add backend/app/api/applications.py
git commit -m "fix: 修复应用删除bug"
git push origin main

# 4. 服务器快速更新
ssh server
cd CBIT-AiForge
./server_quick_update.sh
```

---

### 场景2：添加新功能

```bash
# 1. 本地开发
# ... 编写新功能代码 ...

# 2. 本地测试通过

# 3. 提交到Git
git add .
git commit -m "feat: 添加XX功能"
git push origin main

# 4. 服务器快速更新
ssh server
cd CBIT-AiForge
./server_quick_update.sh
```

---

### 场景3：更新依赖

```bash
# 1. 本地修改依赖
echo "new-package==1.0.0" >> backend/requirements.txt

# 2. 本地测试
pip install new-package

# 3. 提交到Git
git add backend/requirements.txt
git commit -m "chore: 添加新依赖"
git push origin main

# 4. 服务器完整更新
ssh server
cd CBIT-AiForge
./server_update.sh  # ← 注意这里用完整更新
```

---

## 📊 更新方式对比

| 对比项 | 完整更新 | 快速更新 |
|-------|---------|---------|
| **脚本** | `./server_update.sh` | `./server_quick_update.sh` |
| **重建镜像** | ✅ 是 | ❌ 否 |
| **重启容器** | ✅ 是 | ✅ 是 |
| **耗时** | 3-5分钟 | 10-20秒 |
| **适用场景** | 依赖变化、重大更新 | 代码修改 |
| **数据保留** | ✅ 保留 | ✅ 保留 |
| **配置保留** | ✅ 保留 | ✅ 保留 |

---

## ✅ 最佳实践

### 1. 开发前先拉取最新代码

```bash
git pull origin main
```

### 2. 小步提交，频繁推送

```bash
# 好的做法 ✅
git commit -m "fix: 修复用户登录bug"
git commit -m "feat: 添加导出功能"

# 不好的做法 ❌
git commit -m "修改了很多东西"
```

### 3. 测试后再推送

```bash
# 本地测试通过后再推送
python3 backend/run.py  # 测试后端
npm run dev              # 测试前端
git push origin main     # 确认无误后推送
```

### 4. 定期备份数据库

```bash
# 在服务器上设置自动备份
crontab -e

# 添加：每天凌晨2点备份
0 2 * * * cd /path/to/CBIT-AiForge && cp backend/app/data/forge.db backend/app/data/forge.db.backup_$(date +\%Y\%m\%d)
```

---

## 🆘 常见问题

### Q: 更新后服务起不来怎么办？

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 如果还不行，重新构建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Q: 如何回滚到上一个版本？

```bash
# 查看提交历史
git log --oneline -10

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新构建
./server_update.sh
```

### Q: 配置文件丢失怎么办？

```bash
# 恢复备份
cp backend/app/data/api_config.json.backup backend/app/data/api_config.json

# 重启
docker-compose restart
```

---

## 📚 相关文档

- [服务器部署指南](SERVER_DEPLOYMENT.md)
- [Git提交规范](GIT_COMMIT_GUIDE.md)
- [快速参考](QUICK_REFERENCE.md)
- [核心框架](CORE_FRAMEWORK.md)

---

**© 2025 Reneverland, CBIT, CUHK**

