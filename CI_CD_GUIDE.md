# CI/CD Guide | CI/CD 指南

## English

### 🔄 Continuous Integration Pipeline

CBIT-AiForge uses GitHub Actions for automated testing and deployment.

### Workflows

#### 1. CI Pipeline (`ci.yml`)
Runs on every push and pull request to `main` and `develop` branches.

**Steps:**
1. **Backend Tests**
   - Python syntax check (flake8)
   - Code formatting check (black)
   - Unit tests (pytest)

2. **Frontend Tests**
   - ESLint code quality check
   - Build test
   - Build size check

3. **Docker Build Test**
   - Build backend Docker image
   - Build frontend Docker image
   - Validate docker-compose configuration

4. **Security Scan**
   - Trivy vulnerability scanner
   - Upload results to GitHub Security

5. **Integration Tests**
   - Start services with docker-compose
   - Health check endpoints
   - API accessibility tests

#### 2. Docker Publish (`docker-publish.yml`)
Publishes Docker images to GitHub Container Registry on release.

**Trigger:**
- On release publication
- Manual workflow dispatch

**Images:**
- `ghcr.io/reneverland/cbit-aiforge-backend`
- `ghcr.io/reneverland/cbit-aiforge-frontend`

#### 3. CodeQL Security (`codeql.yml`)
Automated security scanning for Python and JavaScript code.

**Schedule:**
- Every push to main/develop
- Weekly scan on Monday

#### 4. Dependabot
Automated dependency updates for:
- Python packages (weekly)
- NPM packages (weekly)
- GitHub Actions (weekly)
- Docker base images (weekly)

### Status Badges

Add to your README:
```markdown
[![CI](https://github.com/reneverland/CBIT-AiForge/workflows/CI%20Pipeline/badge.svg)](https://github.com/reneverland/CBIT-AiForge/actions)
[![Security](https://github.com/reneverland/CBIT-AiForge/workflows/CodeQL%20Security%20Scan/badge.svg)](https://github.com/reneverland/CBIT-AiForge/security)
```

### Local Testing

Before pushing, test locally:

```bash
# Backend tests
cd backend
pip install pytest flake8 black
flake8 app --select=E9,F63,F7,F82
black --check app
pytest

# Frontend tests
cd frontend
npm run lint
npm run build

# Docker build test
docker-compose build
docker-compose up -d
./test_deployment.sh
docker-compose down
```

### CI Requirements

**Secrets (Optional):**
- None required for basic CI
- `DOCKER_USERNAME` and `DOCKER_PASSWORD` for Docker Hub (if used)

**Permissions:**
- Actions: read
- Contents: read
- Packages: write (for Docker publish)
- Security-events: write (for CodeQL)

### Troubleshooting

**Build fails on linting:**
```bash
# Fix Python formatting
cd backend
black app

# Fix JavaScript linting
cd frontend
npm run lint -- --fix
```

**Docker build timeout:**
- Use Docker layer caching (already configured)
- Reduce image size
- Split large steps

**Integration tests fail:**
- Increase service startup wait time in workflow
- Check container logs in GitHub Actions

---

## 中文

### 🔄 持续集成流水线

CBIT-AiForge 使用 GitHub Actions 进行自动化测试和部署。

### 工作流

#### 1. CI 流水线 (`ci.yml`)
在每次推送和 PR 到 `main` 和 `develop` 分支时运行。

**步骤：**
1. **后端测试**
   - Python 语法检查 (flake8)
   - 代码格式检查 (black)
   - 单元测试 (pytest)

2. **前端测试**
   - ESLint 代码质量检查
   - 构建测试
   - 构建大小检查

3. **Docker 构建测试**
   - 构建后端 Docker 镜像
   - 构建前端 Docker 镜像
   - 验证 docker-compose 配置

4. **安全扫描**
   - Trivy 漏洞扫描器
   - 上传结果到 GitHub Security

5. **集成测试**
   - 使用 docker-compose 启动服务
   - 健康检查端点
   - API 可访问性测试

#### 2. Docker 发布 (`docker-publish.yml`)
发布 Docker 镜像到 GitHub Container Registry。

**触发条件：**
- 发布 Release 时
- 手动触发

**镜像：**
- `ghcr.io/reneverland/cbit-aiforge-backend`
- `ghcr.io/reneverland/cbit-aiforge-frontend`

#### 3. CodeQL 安全扫描 (`codeql.yml`)
Python 和 JavaScript 代码的自动化安全扫描。

**计划：**
- 每次推送到 main/develop
- 每周一定期扫描

#### 4. Dependabot
自动依赖更新：
- Python 包（每周）
- NPM 包（每周）
- GitHub Actions（每周）
- Docker 基础镜像（每周）

### 状态徽章

添加到 README：
```markdown
[![CI](https://github.com/reneverland/CBIT-AiForge/workflows/CI%20Pipeline/badge.svg)](https://github.com/reneverland/CBIT-AiForge/actions)
[![Security](https://github.com/reneverland/CBIT-AiForge/workflows/CodeQL%20Security%20Scan/badge.svg)](https://github.com/reneverland/CBIT-AiForge/security)
```

### 本地测试

推送前本地测试：

```bash
# 后端测试
cd backend
pip install pytest flake8 black
flake8 app --select=E9,F63,F7,F82
black --check app
pytest

# 前端测试
cd frontend
npm run lint
npm run build

# Docker 构建测试
docker-compose build
docker-compose up -d
./test_deployment.sh
docker-compose down
```

### CI 要求

**密钥（可选）：**
- 基础 CI 无需密钥
- `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 用于 Docker Hub（如果使用）

**权限：**
- Actions: read
- Contents: read
- Packages: write（用于 Docker 发布）
- Security-events: write（用于 CodeQL）

### 故障排除

**代码检查失败：**
```bash
# 修复 Python 格式
cd backend
black app

# 修复 JavaScript 代码检查
cd frontend
npm run lint -- --fix
```

**Docker 构建超时：**
- 使用 Docker 层缓存（已配置）
- 减少镜像大小
- 拆分大步骤

**集成测试失败：**
- 增加工作流中服务启动等待时间
- 在 GitHub Actions 中检查容器日志

