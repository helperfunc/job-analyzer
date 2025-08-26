# GitHub OIDC AWS部署完整指南

本指南将帮助你使用GitHub OIDC（无需存储密钥）部署应用到AWS。

## 目录
1. [前置要求](#前置要求)
2. [配置AWS CLI](#配置aws-cli)
3. [设置GitHub OIDC](#设置github-oidc)
4. [创建AWS资源](#创建aws资源)
5. [配置密钥](#配置密钥)
6. [部署应用](#部署应用)
7. [验证部署](#验证部署)
8. [故障排除](#故障排除)

## 前置要求

- AWS账户（已创建，不使用root用户）
- GitHub账户和仓库
- Windows系统with Git Bash
- 基本的命令行知识

## 配置AWS CLI

### 1. 安装AWS CLI

1. 下载AWS CLI安装程序：
   - 访问：https://awscli.amazonaws.com/AWSCLIV2.msi
   - 双击安装

2. 验证安装：
   ```bash
   aws --version
   # 应该显示: aws-cli/2.x.x Python/3.x.x Windows/10 exe/AMD64
   ```

### 2. 创建IAM用户（用于初始配置）

由于你还没有配置AWS，需要先在AWS控制台创建一个IAM用户：

1. 登录AWS控制台：https://console.aws.amazon.com/

2. 创建IAM用户：
   - 搜索并进入 "IAM"
   - 左侧菜单选择 "Users"（用户）
   - 点击 "Create user"（创建用户）
   - 用户名：`initial-setup`
   - 勾选 "Provide user access to the AWS Management Console"（可选）

3. 设置权限：
   - 选择 "Attach policies directly"
   - 搜索并勾选：`AdministratorAccess`（仅用于初始设置！）
   - 点击 "Next" → "Create user"

4. 创建Access Key：
   - 进入刚创建的用户详情
   - 点击 "Security credentials" 标签
   - 在 "Access keys" 部分，点击 "Create access key"
   - 选择 "Command Line Interface (CLI)"
   - 勾选确认框
   - 点击 "Create access key"
   - **重要**：下载CSV文件或记录Access Key ID和Secret Access Key

### 3. 配置AWS CLI

打开Git Bash或命令提示符：

```bash
aws configure
```

输入以下信息：
- AWS Access Key ID: [从上一步获取]
- AWS Secret Access Key: [从上一步获取]
- Default region name: us-east-1
- Default output format: json

验证配置：
```bash
aws sts get-caller-identity
```

应该显示类似：
```json
{
    "UserId": "AIDAXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/initial-setup"
}
```

**记下Account数字，这是你的AWS账户ID！**

## 设置GitHub OIDC

### 1. 运行OIDC设置脚本

```bash
cd D:\code\jobsfind\job-analyzer
bash setup-github-oidc.sh
```

脚本会询问：
- GitHub用户名（例如：helperfunc）
- 仓库名称（默认：job-analyzer）

### 2. 在GitHub添加AWS账户ID

1. 打开你的GitHub仓库
2. Settings → Secrets and variables → Actions
3. 点击 "Variables" 标签（不是Secrets！）
4. 点击 "New repository variable"
5. 添加：
   - Name: `AWS_ACCOUNT_ID`
   - Value: [你的12位AWS账户ID]

## 创建AWS资源

### 1. 运行资源创建脚本

```bash
bash setup-aws-resources.sh
```

这会创建：
- ECR容器仓库
- ECS集群
- CloudWatch日志组
- 必要的IAM角色

### 2. 更新任务定义

```bash
bash update-task-definition.sh
```

这会自动更新task-definition.json中的账户ID和区域。

## 配置密钥

### 1. 准备密钥信息

你需要准备：

1. **数据库URL**（Supabase示例）：
   ```
   postgresql://postgres:[你的密码]@db.[项目ID].supabase.co:5432/postgres
   ```
   
   获取方法：
   - 登录Supabase
   - 选择你的项目
   - Settings → Database
   - Connection string → URI

2. **Google OAuth凭证**：
   - 访问：https://console.cloud.google.com/
   - APIs & Services → Credentials
   - 创建OAuth 2.0 Client ID
   - Authorized redirect URIs添加：
     - `http://localhost:3000/api/auth/google/callback`
     - `http://你的域名/api/auth/google/callback`

### 2. 创建AWS Secrets

```bash
bash create-secrets.sh
```

按提示输入：
- DATABASE_URL
- JWT_SECRET（可以使用自动生成的）
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

## 部署应用

### 1. 创建初始的ECS服务

由于是首次部署，需要先创建服务：

```bash
# 创建任务定义
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1

# 创建服务（简化版，使用默认VPC）
aws ecs create-service \
  --cluster job-analyzer-cluster \
  --service-name job-analyzer-service \
  --task-definition job-analyzer:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(aws ec2 describe-subnets --filters 'Name=default-for-az,Values=true' --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')],securityGroups=[$(aws ec2 create-security-group --group-name job-analyzer-sg --description 'Job Analyzer Security Group' --query 'GroupId' --output text 2>/dev/null || aws ec2 describe-security-groups --group-names job-analyzer-sg --query 'SecurityGroups[0].GroupId' --output text)],assignPublicIp=ENABLED}" \
  --region us-east-1
```

### 2. 提交代码触发自动部署

```bash
# 添加所有文件
git add .

# 提交
git commit -m "Add AWS deployment with GitHub OIDC"

# 推送（触发自动部署）
git push origin main
```

## 验证部署

### 1. 查看GitHub Actions

1. 打开GitHub仓库
2. 点击 "Actions" 标签
3. 查看workflow运行状态

### 2. 查看ECS服务

```bash
# 查看服务状态
aws ecs describe-services \
  --cluster job-analyzer-cluster \
  --services job-analyzer-service \
  --query 'services[0].{Status:status,DesiredCount:desiredCount,RunningCount:runningCount}'

# 查看运行的任务
aws ecs list-tasks \
  --cluster job-analyzer-cluster \
  --service-name job-analyzer-service
```

### 3. 查看日志

```bash
# 实时查看日志
aws logs tail /ecs/job-analyzer --follow
```

### 4. 获取公网IP访问应用

```bash
# 获取任务详情
TASK_ARN=$(aws ecs list-tasks --cluster job-analyzer-cluster --service job-analyzer-service --query 'taskArns[0]' --output text)

# 获取ENI
ENI=$(aws ecs describe-tasks --cluster job-analyzer-cluster --tasks $TASK_ARN --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)

# 获取公网IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI --query 'NetworkInterfaces[0].Association.PublicIp' --output text)

echo "应用地址: http://$PUBLIC_IP:3000"
```

## 故障排除

### 问题1：AWS CLI未配置
```
Unable to locate credentials. You can configure credentials by running "aws configure".
```
**解决**：按照"配置AWS CLI"部分设置

### 问题2：Could not assume role with OIDC
```
Error: Could not assume role with OIDC
```
**解决**：
1. 检查GitHub仓库名称是否正确
2. 确认AWS_ACCOUNT_ID变量已设置
3. 检查信任策略中的repo路径

### 问题3：Task failed to start
**解决**：
1. 查看CloudWatch日志
2. 检查Secrets Manager中的密钥
3. 确认安全组允许出站流量

### 问题4：Cannot pull container image
**解决**：
1. 确保ECR仓库存在
2. 检查任务执行角色权限
3. 手动推送镜像：
   ```bash
   # 登录ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [你的账户ID].dkr.ecr.us-east-1.amazonaws.com
   
   # 构建并推送
   docker build -t job-analyzer .
   docker tag job-analyzer:latest [你的账户ID].dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest
   docker push [你的账户ID].dkr.ecr.us-east-1.amazonaws.com/job-analyzer:latest
   ```

## 清理资源（可选）

如果需要删除所有创建的资源：

```bash
# 删除ECS服务
aws ecs update-service --cluster job-analyzer-cluster --service job-analyzer-service --desired-count 0
aws ecs delete-service --cluster job-analyzer-cluster --service job-analyzer-service

# 删除ECS集群
aws ecs delete-cluster --cluster job-analyzer-cluster

# 删除ECR仓库
aws ecr delete-repository --repository-name job-analyzer --force

# 删除CloudWatch日志组
aws logs delete-log-group --log-group-name /ecs/job-analyzer

# 删除IAM角色（需要先分离策略）
aws iam detach-role-policy --role-name GitHubActions-job-analyzer --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
aws iam detach-role-policy --role-name GitHubActions-job-analyzer --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
aws iam delete-role --role-name GitHubActions-job-analyzer
```

## 后续步骤

1. **添加负载均衡器**：为生产环境添加ALB
2. **配置域名**：使用Route 53添加自定义域名
3. **启用HTTPS**：使用ACM证书
4. **设置自动扩展**：配置ECS Service Auto Scaling
5. **监控和告警**：设置CloudWatch告警

## 安全建议

完成初始设置后：
1. 删除或禁用`initial-setup` IAM用户
2. 使用更严格的IAM策略
3. 启用CloudTrail审计
4. 设置预算告警防止意外费用

## 需要帮助？

- AWS文档：https://docs.aws.amazon.com/
- GitHub Actions文档：https://docs.github.com/en/actions
- 本项目Issues：https://github.com/你的用户名/job-analyzer/issues