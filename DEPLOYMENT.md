# 部署指南 - Job Analyzer

本指南说明如何将 Job Analyzer 应用部署到 AWS。

## 架构概述

- **前端/后端**: Next.js (React + API Routes)
- **数据库**: Supabase (PostgreSQL)
- **容器**: Docker image deployed to Amazon ECR
- **计算**: AWS ECS Fargate
- **负载均衡**: Application Load Balancer (ALB)
- **密钥管理**: AWS Secrets Manager
- **CI/CD**: GitHub Actions

## 前置要求

- AWS CLI 已配置
- Docker 已安装
- AWS 账号具有以下权限：
  - ECS (创建集群、服务、任务)
  - ECR (推送镜像)
  - Secrets Manager (创建和读取密钥)
  - IAM (创建角色)
  - ALB (创建负载均衡器)
  - CloudWatch Logs (创建日志组)

## 部署步骤

### 1. 设置 Supabase

1. 创建 Supabase 项目：
   - 访问 https://app.supabase.com
   - 创建新项目并等待初始化完成

2. 获取配置信息：
   - 进入 Settings → API
   - 记录 **Project URL** 和 **anon public** key

3. 创建数据库表：
   - 在 SQL Editor 中运行 `database/minimal-schema.sql`

### 2. 配置 AWS Secrets Manager

```bash
# 创建 Supabase URL 密钥
aws secretsmanager create-secret \
  --name "job-analyzer/supabase-url" \
  --secret-string "https://你的项目.supabase.co"

# 创建 Supabase Anon Key 密钥
aws secretsmanager create-secret \
  --name "job-analyzer/supabase-anon-key" \
  --secret-string "你的anon key"

# 其他必需的密钥（如果还没创建）
aws secretsmanager create-secret \
  --name "job-analyzer/jwt-secret" \
  --secret-string "你的JWT密钥"

aws secretsmanager create-secret \
  --name "job-analyzer/google-client-id" \
  --secret-string "你的Google客户端ID"

aws secretsmanager create-secret \
  --name "job-analyzer/google-client-secret" \
  --secret-string "你的Google客户端密钥"

# DATABASE_URL 可以留空，因为应用使用 Supabase 客户端
aws secretsmanager create-secret \
  --name "job-analyzer/database-url" \
  --secret-string "not-used"
```

### 3. 更新 task-definition.json

获取创建密钥后的完整 ARN，更新 `task-definition.json` 中的：
- 第 55 行的 supabase-url ARN (添加后缀如 -XXXXX)
- 第 59 行的 supabase-anon-key ARN (添加后缀如 -XXXXX)

### 4. 创建 ECR 仓库（如果不存在）

```bash
aws ecr create-repository --repository-name job-analyzer
```

### 5. 构建和推送 Docker 镜像

```bash
# 登录 ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 076181803263.dkr.ecr.us-east-1.amazonaws.com

# 构建镜像
docker build -t job-analyzer .

# 标记镜像
docker tag job-analyzer:latest 076181803263.dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest

# 推送镜像
docker push 076181803263.dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest
```

### 6. 创建 ECS 资源

```bash
# 创建集群（如果不存在）
aws ecs create-cluster --cluster-name job-analyzer-cluster

# 创建日志组
aws logs create-log-group --log-group-name /ecs/job-analyzer

# 注册任务定义
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 创建 ALB（通过控制台更简单）
# 1. EC2 控制台 → Load Balancers → Create
# 2. 选择 Application Load Balancer
# 3. 配置安全组允许端口 80/443
# 4. 创建目标组（端口 3000）

# 创建/更新 ECS 服务
aws ecs create-service \
  --cluster job-analyzer-cluster \
  --service-name job-analyzer-service \
  --task-definition job-analyzer:latest \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=job-analyzer,containerPort=3000"
```

### 7. 配置安全组

确保安全组规则：
- **ALB 安全组**: 允许入站 80/443
- **ECS 任务安全组**: 允许来自 ALB 安全组的 3000 端口

### 8. 验证部署

```bash
# 检查服务状态
aws ecs describe-services --cluster job-analyzer-cluster --services job-analyzer-service

# 测试健康检查
curl http://ALB-DNS-名称/api/healthz

# 查看日志
aws logs tail /ecs/job-analyzer --follow
```

## 更新部署

当代码更新后：

```bash
# 1. 构建新镜像
docker build -t job-analyzer .

# 2. 推送到 ECR
docker tag job-analyzer:latest 076181803263.dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest
docker push 076181803263.dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest

# 3. 强制新部署
aws ecs update-service \
  --cluster job-analyzer-cluster \
  --service job-analyzer-service \
  --force-new-deployment
```

## 环境变量说明

| 变量名 | 说明 | 存储位置 |
|--------|------|----------|
| NODE_ENV | 运行环境 | task-definition.json |
| PORT | 应用端口 | task-definition.json |
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目 URL | Secrets Manager |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 公开密钥 | Secrets Manager |
| JWT_SECRET | JWT 签名密钥 | Secrets Manager |
| GOOGLE_CLIENT_ID | Google OAuth ID | Secrets Manager |
| GOOGLE_CLIENT_SECRET | Google OAuth 密钥 | Secrets Manager |

## 故障排查

### 常见问题

1. **503 Service Unavailable**
   - 检查目标组健康检查
   - 确认 ECS 任务正在运行
   - 查看 CloudWatch 日志

2. **500 Internal Server Error**
   - 检查环境变量配置
   - 确认 Secrets Manager 权限
   - 查看应用日志

3. **任务无法启动**
   - 检查 IAM 角色权限
   - 确认密钥 ARN 正确
   - 查看任务停止原因

### 有用的命令

```bash
# 查看任务日志
aws logs get-log-events \
  --log-group-name /ecs/job-analyzer \
  --log-stream-name ecs/job-analyzer/任务ID

# 查看任务停止原因
aws ecs describe-tasks \
  --cluster job-analyzer-cluster \
  --tasks 任务ARN

# 查看服务事件
aws ecs describe-services \
  --cluster job-analyzer-cluster \
  --services job-analyzer-service \
  --query 'services[0].events[:10]'
```

## GitHub Actions 自动部署

项目包含 `.github/workflows/deploy.yml` 用于自动部署：

1. 在 GitHub 仓库设置中添加 secrets：
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - 其他必需的环境变量

2. 推送到 main 分支自动触发部署

## 成本优化

- 使用 Fargate Spot 实例可降低成本
- 配置自动扩缩容策略
- 在非生产环境关闭服务

## 下一步

1. 添加自定义域名 (Route 53)
2. 配置 SSL/TLS 证书 (ACM)
3. 设置监控告警 (CloudWatch)
4. 实现自动扩缩容
5. 添加 CDN (CloudFront)