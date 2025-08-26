# AWS 高级安全配置指南

## 方法1：AWS SSO (IAM Identity Center) - 最适合团队

### 什么是AWS SSO？
- 一个地方管理所有AWS账户访问
- 使用临时凭证（1-12小时）
- 支持多因素认证
- 免费使用

### 设置步骤

#### 1. 启用 IAM Identity Center
```bash
# 在AWS控制台搜索"IAM Identity Center"
# 点击"Enable"
# 选择区域（建议 us-east-1）
```

#### 2. 创建用户
1. 在IAM Identity Center → Users → Add user
2. 填写信息：
   - Username: 你的邮箱
   - Email: 你的邮箱
   - First name/Last name
3. 发送邀请邮件

#### 3. 创建权限集
1. Permission sets → Create permission set
2. 选择"Predefined permission set"
3. 选择"PowerUserAccess"（开发用）
4. 名称：`DeveloperAccess`

#### 4. 分配访问权限
1. AWS accounts → 选择你的账户
2. Assign users or groups
3. 选择你的用户和权限集

#### 5. 使用SSO登录
```bash
# 安装AWS CLI v2
# 配置SSO
aws configure sso

# 输入：
# SSO start URL: https://你的域名.awsapps.com/start
# SSO Region: us-east-1
# 选择账户和角色

# 使用
aws s3 ls --profile your-profile
```

### 在代码中使用
```javascript
// 自动使用SSO凭证
const AWS = require('aws-sdk');
AWS.config.credentials = new AWS.SsoCredentials({
  profile: 'your-profile'
});
```

## 方法2：GitHub OIDC - 最适合CI/CD

### 什么是OIDC？
- OpenID Connect，让GitHub直接向AWS证明身份
- 不需要存储任何密钥
- 每次运行时获取临时凭证
- GitHub和AWS直接通信

### 设置步骤

#### 1. 在AWS创建OIDC Provider

```bash
# 使用AWS CLI
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

或在控制台：
1. IAM → Identity providers → Add provider
2. Provider type: OpenID Connect
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`

#### 2. 创建IAM角色

创建信任策略文件 `trust-policy.json`：
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::你的账户ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:你的GitHub用户名/job-analyzer:*"
        }
      }
    }
  ]
}
```

创建角色：
```bash
# 创建角色
aws iam create-role \
  --role-name GitHubActionsRole \
  --assume-role-policy-document file://trust-policy.json

# 附加权限
aws iam attach-role-policy \
  --role-name GitHubActionsRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-role-policy \
  --role-name GitHubActionsRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
```

#### 3. 更新GitHub Actions

创建 `.github/workflows/deploy-oidc.yml`：
```yaml
name: Deploy with OIDC
on:
  push:
    branches: [main]

# 需要这些权限
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 使用OIDC获取AWS凭证
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/GitHubActionsRole
          role-session-name: GitHubActions
          aws-region: us-east-1

      # 正常使用AWS CLI
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        run: |
          docker build -t ${{ steps.login-ecr.outputs.registry }}/job-analyzer:latest .
          docker push ${{ steps.login-ecr.outputs.registry }}/job-analyzer:latest
```

#### 4. 设置GitHub变量
在GitHub仓库设置中添加变量（不是secrets）：
- 变量名：`AWS_ACCOUNT_ID`
- 值：你的12位AWS账户ID

## 方法3：AWS Organizations - 最适合生产环境

### 什么是AWS Organizations？
- 管理多个AWS账户
- 集中付费
- 设置预算限制
- 隔离环境（开发/测试/生产）

### 设置步骤

#### 1. 创建Organization
```bash
# 在主账户（管理账户）执行
aws organizations create-organization --feature-set ALL
```

#### 2. 创建子账户
```bash
# 创建生产账户
aws organizations create-account \
  --email prod-job-analyzer@你的域名.com \
  --account-name "Job Analyzer Production"

# 创建开发账户  
aws organizations create-account \
  --email dev-job-analyzer@你的域名.com \
  --account-name "Job Analyzer Development"
```

#### 3. 设置预算警报
```bash
# 为每个账户设置预算
aws budgets create-budget \
  --account-id 生产账户ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

`budget.json`:
```json
{
  "BudgetName": "MonthlyBudget",
  "BudgetLimit": {
    "Amount": "100",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

#### 4. 使用服务控制策略(SCP)限制
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "ec2:TerminateInstances",
        "rds:DeleteDBInstance"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalOrgID": "${aws:PrincipalOrgID}"
        }
      }
    }
  ]
}
```

## 组合使用：最佳实践架构

### 推荐的设置：
1. **AWS Organizations** 管理多个账户
2. **AWS SSO** 让开发者访问不同账户
3. **GitHub OIDC** 用于自动部署

```
AWS Organization (主账户)
├── 开发账户
│   ├── SSO用户访问
│   └── GitHub OIDC部署到开发环境
├── 测试账户
│   └── GitHub OIDC部署到测试环境
└── 生产账户
    ├── 只有高级开发者SSO访问
    ├── GitHub OIDC部署（需要审批）
    └── 预算限制$500/月
```

## 快速开始建议

### 如果你是个人开发者：
1. 先用GitHub OIDC（方法2）
2. 这样最安全，不需要管理密钥

### 如果你是小团队：
1. 设置AWS SSO（方法1）
2. 每个人有自己的登录
3. 配合GitHub OIDC自动部署

### 如果你要上生产：
1. 使用AWS Organizations（方法3）
2. 分离开发和生产账户
3. 设置预算警报
4. 使用SSO管理访问

## 迁移步骤

从IAM用户迁移到OIDC：
1. 先设置OIDC（不影响现有部署）
2. 测试OIDC工作正常
3. 更新GitHub secrets为variables
4. 删除IAM用户的access keys

## 成本

- **AWS SSO**: 免费
- **GitHub OIDC**: 免费
- **AWS Organizations**: 免费（只付实际资源费用）

## 故障排除

### OIDC常见错误：
```
Error: Could not assume role with OIDC: AccessDenied
```
解决：检查信任策略中的repo名称是否正确

### SSO常见错误：
```
Error: The SSO session has expired
```
解决：运行 `aws sso login --profile your-profile`

## 总结

安全等级（从高到低）：
1. 🥇 GitHub OIDC + Organizations + SSO
2. 🥈 GitHub OIDC 
3. 🥉 AWS SSO
4. ⚠️ IAM用户with MFA
5. ❌ Root用户access key（永远不要用！）

选择适合你的方案，安全和便利之间找平衡！