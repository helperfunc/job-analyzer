# AWS IAM 安全设置指南

## 为什么不能用Root用户？

Root用户拥有AWS账户的所有权限，无法限制。如果泄露，攻击者可以：
- 删除所有资源
- 产生巨额费用
- 访问所有数据

## 正确的做法：创建IAM用户

### 步骤1：启用MFA保护Root账户

1. 登录AWS控制台（用root账户）
2. 右上角点击账户名 → "Security credentials"
3. 找到"Multi-factor authentication (MFA)"
4. 点击"Assign MFA device"
5. 使用手机APP（如Google Authenticator）扫码

### 步骤2：创建IAM用户

1. 在AWS控制台搜索"IAM"
2. 左侧菜单选择"Users"
3. 点击"Create user"
4. 用户名：`job-analyzer-deploy`
5. 勾选"Provide user access to the AWS Management Console"（可选）
6. 下一步

### 步骤3：创建部署策略

1. 在IAM中，选择"Policies"
2. 点击"Create policy"
3. 选择JSON标签，粘贴以下内容：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ECRPermissions",
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:CreateRepository",
                "ecr:DescribeRepositories"
            ],
            "Resource": "*"
        },
        {
            "Sid": "ECSPermissions",
            "Effect": "Allow",
            "Action": [
                "ecs:RegisterTaskDefinition",
                "ecs:DeregisterTaskDefinition",
                "ecs:DescribeTaskDefinition",
                "ecs:UpdateService",
                "ecs:DescribeServices",
                "ecs:CreateCluster",
                "ecs:DescribeClusters"
            ],
            "Resource": "*"
        },
        {
            "Sid": "PassRolePermission",
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": [
                "arn:aws:iam::*:role/ecsTaskExecutionRole",
                "arn:aws:iam::*:role/ecsTaskRole"
            ]
        },
        {
            "Sid": "SecretsManagerPermissions",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:CreateSecret",
                "secretsmanager:UpdateSecret"
            ],
            "Resource": "arn:aws:secretsmanager:*:*:secret:job-analyzer/*"
        },
        {
            "Sid": "CloudWatchLogsPermissions",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:log-group:/ecs/job-analyzer*"
        }
    ]
}
```

4. 策略名称：`JobAnalyzerDeployPolicy`
5. 创建策略

### 步骤4：附加策略到用户

1. 回到IAM Users
2. 选择刚创建的用户
3. 点击"Add permissions" → "Attach policies directly"
4. 搜索并选择：
   - `JobAnalyzerDeployPolicy`（刚创建的）
   - `AmazonEC2ContainerRegistryPowerUser`
5. 点击"Next" → "Add permissions"

### 步骤5：创建Access Key

1. 在用户详情页，选择"Security credentials"标签
2. 找到"Access keys"部分
3. 点击"Create access key"
4. 选择"Command Line Interface (CLI)"
5. 勾选确认框
6. 下一步，添加描述：`GitHub Actions Deploy`
7. 创建并下载CSV文件

### 步骤6：创建ECS任务角色

创建两个角色供ECS使用：

#### A. Task Execution Role
1. IAM → Roles → Create role
2. Trusted entity type: AWS service
3. Use case: Elastic Container Service → Elastic Container Service Task
4. 附加策略：
   - `AmazonECSTaskExecutionRolePolicy`
   - 创建自定义策略允许读取Secrets：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:*:*:secret:job-analyzer/*"
        }
    ]
}
```

5. 角色名称：`ecsTaskExecutionRole`

#### B. Task Role（应用运行时权限）
1. 创建另一个角色
2. 同样选择ECS Task
3. 暂时不附加策略（根据应用需要添加）
4. 角色名称：`ecsTaskRole`

## 使用Terraform的安全设置

如果使用Terraform，创建专门的IAM用户：

### Terraform用户策略

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "ecs:*",
                "ecr:*",
                "elasticloadbalancing:*",
                "iam:*",
                "logs:*",
                "secretsmanager:*",
                "s3:*"
            ],
            "Resource": "*"
        }
    ]
}
```

注意：这个权限较大，仅在初始设置时使用。

## GitHub Actions安全配置

在GitHub仓库设置中添加secrets：
- `AWS_ACCESS_KEY_ID`: IAM用户的Access Key（不是root！）
- `AWS_SECRET_ACCESS_KEY`: IAM用户的Secret Key

## 安全最佳实践

### 1. 定期轮换密钥
```bash
# 每90天更换一次access key
aws iam list-access-keys --user-name job-analyzer-deploy
aws iam create-access-key --user-name job-analyzer-deploy
# 更新GitHub secrets
aws iam delete-access-key --user-name job-analyzer-deploy --access-key-id 旧的KEY_ID
```

### 2. 使用临时凭证（更安全）

考虑使用GitHub OIDC provider：

```yaml
# .github/workflows/deploy-oidc.yml
name: Deploy with OIDC
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsRole
          aws-region: us-east-1
```

### 3. 监控和审计

1. 启用CloudTrail记录所有API调用
2. 设置预算警报防止意外费用
3. 定期审查IAM权限

### 4. 紧急情况处理

如果怀疑密钥泄露：
1. 立即在IAM中禁用/删除access key
2. 检查CloudTrail日志
3. 更改所有密码和密钥
4. 审查所有资源是否有异常

## 权限故障排除

如果部署时遇到权限错误：

```bash
# 查看当前用户/角色
aws sts get-caller-identity

# 测试特定权限
aws ecr describe-repositories
aws ecs list-clusters
```

常见错误及解决：
- `AccessDenied: User is not authorized to perform: ecs:RegisterTaskDefinition`
  → 添加相应权限到IAM策略
- `Invalid IAM Role: ecsTaskExecutionRole`
  → 确保角色存在并有正确的信任关系

## 总结

记住这些要点：
1. **永远不要使用root用户的access key**
2. **为每个用途创建专门的IAM用户/角色**
3. **只授予最小必要权限**
4. **定期审查和轮换凭证**
5. **启用MFA和审计日志**

这样配置后，即使access key泄露，损失也是可控的。