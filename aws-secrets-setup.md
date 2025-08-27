# AWS Secrets Manager 设置指南

## 创建 Supabase 密钥

您需要在 AWS Secrets Manager 中创建两个新的密钥：

### 1. 创建 supabase-url 密钥

```bash
aws secretsmanager create-secret \
  --name "job-analyzer/supabase-url" \
  --description "Supabase Project URL" \
  --secret-string "https://xxxxxxxxxxxxx.supabase.co"
```

替换 `https://xxxxxxxxxxxxx.supabase.co` 为您的实际 Supabase Project URL。

### 2. 创建 supabase-anon-key 密钥

```bash
aws secretsmanager create-secret \
  --name "job-analyzer/supabase-anon-key" \
  --description "Supabase Anon Key" \
  --secret-string "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

替换 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 为您的实际 Supabase anon key。

### 3. 获取密钥 ARN

创建后，您会得到类似这样的 ARN：
- `arn:aws:secretsmanager:us-east-1:076181803263:secret:job-analyzer/supabase-url-XXXXX`
- `arn:aws:secretsmanager:us-east-1:076181803263:secret:job-analyzer/supabase-anon-key-XXXXX`

### 4. 更新 task-definition.json

使用实际的 ARN 更新 task-definition.json：

```json
{
  "name": "NEXT_PUBLIC_SUPABASE_URL",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:076181803263:secret:job-analyzer/supabase-url-XXXXX"
},
{
  "name": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:076181803263:secret:job-analyzer/supabase-anon-key-XXXXX"
}
```

### 5. 重新部署

```bash
# 1. 注册新的任务定义
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 2. 更新服务
aws ecs update-service \
  --cluster job-analyzer-cluster \
  --service job-analyzer-service \
  --task-definition job-analyzer \
  --force-new-deployment
```

## 获取 Supabase 配置值

1. 登录 https://app.supabase.com
2. 选择您的项目
3. 进入 Settings → API
4. 找到：
   - **Project URL**: 用于 supabase-url
   - **anon public**: 用于 supabase-anon-key

## 安全说明

- 这些值存储在 AWS Secrets Manager 中，不会泄露到代码库
- ECS 任务通过 IAM 角色安全地访问这些密钥
- 不要将这些值提交到 Git