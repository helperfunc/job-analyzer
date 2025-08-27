# Supabase 环境变量设置指南

## 问题说明
您的应用使用 Supabase 客户端库，需要以下环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

但是您设置的是 `DATABASE_URL`，这是不匹配的。

## 解决方案

### 步骤 1：从 Supabase 获取正确的值

1. 登录您的 Supabase 项目：https://app.supabase.com
2. 选择您的项目
3. 在左侧菜单点击 "Settings" → "API"
4. 您会看到：
   - **Project URL**: 这是您的 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: 这是您的 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 步骤 2：更新 task-definition.json

替换占位符为实际值：

```json
{
  "name": "NEXT_PUBLIC_SUPABASE_URL",
  "value": "https://xxxxxxxxxxxxx.supabase.co"  // 替换为您的 Project URL
},
{
  "name": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // 替换为您的 anon key
}
```

### 步骤 3：创建数据库表

在 Supabase SQL 编辑器中运行 `database/minimal-schema.sql`：

1. 在 Supabase 控制台点击 "SQL Editor"
2. 点击 "New query"
3. 复制粘贴 minimal-schema.sql 的内容
4. 点击 "Run"

### 步骤 4：重新部署

```bash
# 1. 构建新镜像
docker build -t job-analyzer .

# 2. 标记镜像
docker tag job-analyzer:latest 076181803263.dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest

# 3. 推送镜像
docker push 076181803263.dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest

# 4. 更新 ECS 服务
aws ecs update-service --cluster job-analyzer-cluster --service job-analyzer-service --force-new-deployment
```

## 验证配置

部署后测试 API：
```bash
curl http://54.210.178.133/api/healthz
```

应该返回：
```json
{"status": "ok", "timestamp": "..."}
```