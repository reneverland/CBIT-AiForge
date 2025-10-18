# Git版本管理建议

## 📝 当前版本

**版本**: v3.0  
**日期**: 2025-10-17  
**状态**: 稳定版本

---

## 🎯 建议的Git提交

### Commit 1: 项目清理
```bash
git add .
git commit -m "chore: 清理冗余文件和备份文件

- 删除前端备份文件（v2, v3, incomplete）
- 删除后端备份文件（database_old_backup, database_v3）
- 删除已完成的迁移脚本
- 删除旧的数据库备份文件
- 总计清理9个冗余文件
"
```

### Commit 2: 文档完善
```bash
git add CORE_FRAMEWORK.md QUICK_REFERENCE.md CLEANUP_SUMMARY.md .gitignore GIT_COMMIT_GUIDE.md
git commit -m "docs: 添加核心框架文档和快速参考

- 添加完整的核心框架文档（CORE_FRAMEWORK.md）
  - 项目结构说明
  - 数据库详解
  - API端点文档
  - 配置指南
- 添加快速参考卡片（QUICK_REFERENCE.md）
  - 关键信息速查
  - 常用命令集合
  - 快速问题解决
- 添加清理总结（CLEANUP_SUMMARY.md）
- 更新.gitignore规则
"
```

### Commit 3: v3.0功能完成
```bash
git add backend/ frontend/
git commit -m "feat: 完成v3.0核心功能开发

核心改进:
- ✅ 应用实例系统v3.0重构（模式化配置）
- ✅ 知识库关联功能完善
- ✅ 固定Q&A管理系统（手动/批量/智能提取）
- ✅ 智能文本分割引擎
- ✅ 联网搜索集成（Tavily/Google/Serper）
- ✅ 动态LLM模型加载
- ✅ 可配置知识库检索阈值
- ✅ 自定义系统提示词
- ✅ 独立联网搜索开关
- ✅ 优化的LLM提示词策略

技术栈:
- 后端: FastAPI + SQLite + SQLAlchemy
- 前端: React + TypeScript + Vite + Tailwind CSS
- 向量: Qdrant Cloud + ChromaDB（本地）
- AI: OpenAI, Anthropic, Google Gemini

数据库: backend/app/data/forge.db
"
```

### Commit 4: 创建版本标签
```bash
git tag -a v3.0 -m "CBIT-Forge v3.0 稳定版本

主要特性:
- 三种工作模式（安全/标准/增强）
- 混合检索引擎（固定Q&A + 向量KB + 联网搜索）
- 智能文本分割和Q&A提取
- 完整的配置管理界面
- Playground测试环境

数据库版本: SQLite v3.0
前后端版本: v3.0
"
```

---

## 🔍 版本标签策略

### 主版本号（Major）
```
v1.0 → v2.0 → v3.0
重大架构变更，不兼容旧版本
```

### 次版本号（Minor）
```
v3.0 → v3.1 → v3.2
新功能添加，向后兼容
```

### 修订号（Patch）
```
v3.0.0 → v3.0.1 → v3.0.2
Bug修复，小改进
```

---

## 📦 .gitignore 已配置

以下文件不会被Git追踪：
```
✓ 数据库文件（forge.db*）
✓ 向量数据（chromadb/）
✓ 上传文件（uploads/）
✓ 日志文件（*.log）
✓ Node模块（node_modules/）
✓ Python缓存（__pycache__/）
✓ 构建产物（dist/）
```

---

## 🌳 推荐的分支策略

### 主要分支
```
main        - 生产稳定版本
develop     - 开发主分支
```

### 功能分支
```
feature/xxx - 新功能开发
bugfix/xxx  - Bug修复
hotfix/xxx  - 紧急修复
```

### 工作流程
```
1. 从develop创建feature分支
2. 开发完成后合并回develop
3. 测试通过后合并到main
4. 在main上打版本标签
```

---

## 📊 提交消息规范

### 类型前缀
```
feat:     新功能
fix:      Bug修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构（不改变功能）
perf:     性能优化
test:     测试相关
chore:    构建/工具/配置
```

### 示例
```bash
# 好的提交消息
git commit -m "feat: 添加知识库检索阈值配置"
git commit -m "fix: 修复联网搜索未触发的问题"
git commit -m "docs: 更新API端点文档"

# 避免的提交消息
git commit -m "update"
git commit -m "fix bug"
git commit -m "改了一些东西"
```

---

## 🔄 版本发布流程

### 1. 准备发布
```bash
# 确认所有改动已提交
git status

# 更新版本号
# 修改相关配置文件中的版本号
```

### 2. 创建标签
```bash
# 创建带注释的标签
git tag -a v3.0.1 -m "版本说明"

# 查看标签
git tag -l
```

### 3. 推送到远程
```bash
# 推送代码
git push origin main

# 推送标签
git push origin v3.0.1

# 推送所有标签
git push origin --tags
```

---

## 🛡️ 数据安全提醒

### ⚠️ 永远不要提交
```
❌ API密钥
❌ 数据库文件（forge.db）
❌ 用户数据
❌ 敏感配置
```

### ✅ 应该提交
```
✓ 源代码
✓ 配置模板
✓ 文档
✓ 脚本
✓ 依赖清单
```

---

## 📞 常用Git命令

### 查看状态
```bash
git status              # 查看工作区状态
git log --oneline       # 查看提交历史
git diff                # 查看改动
```

### 撤销操作
```bash
git checkout -- file    # 撤销文件修改
git reset HEAD file     # 取消暂存
git reset --soft HEAD~1 # 撤销最后一次提交
```

### 分支操作
```bash
git branch              # 查看分支
git checkout -b feature # 创建并切换分支
git merge feature       # 合并分支
git branch -d feature   # 删除分支
```

---

**建议**: 保持小而频繁的提交，每个提交只做一件事情。

