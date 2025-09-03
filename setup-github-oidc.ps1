# GitHub OIDC 设置脚本 (PowerShell版本)
Write-Host "=== GitHub OIDC 设置向导 ===" -ForegroundColor Cyan
Write-Host "这个脚本会帮你设置GitHub OIDC，这样就不需要在GitHub存储AWS密钥了"
Write-Host ""

# 检查AWS CLI
try {
    $awsVersion = aws --version
    Write-Host "✓ 检测到AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "错误：需要先安装AWS CLI" -ForegroundColor Red
    Write-Host "访问：https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Yellow
    exit 1
}

# 获取AWS账户ID
try {
    $AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    Write-Host "✓ AWS账户ID: $AWS_ACCOUNT_ID" -ForegroundColor Green
} catch {
    Write-Host "错误：无法获取AWS账户ID，请先运行 aws configure" -ForegroundColor Red
    exit 1
}

# 获取GitHub信息
$GITHUB_USERNAME = Read-Host "请输入你的GitHub用户名"
$REPO_NAME = Read-Host "请输入仓库名称 (直接回车使用默认值: job-analyzer)"
if ([string]::IsNullOrEmpty($REPO_NAME)) {
    $REPO_NAME = "job-analyzer"
}

Write-Host ""
Write-Host "将为以下GitHub仓库设置OIDC：" -ForegroundColor Yellow
Write-Host "  https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "确认继续？(y/n)"
if ($confirm -ne 'y') {
    exit 0
}

# Step 1: 创建OIDC Provider
Write-Host ""
Write-Host "步骤1: 创建OIDC Provider..." -ForegroundColor Cyan
try {
    aws iam create-open-id-connect-provider `
        --url https://token.actions.githubusercontent.com `
        --client-id-list sts.amazonaws.com `
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 `
        2>$null
    Write-Host "✓ OIDC Provider创建成功" -ForegroundColor Green
} catch {
    Write-Host "✓ OIDC Provider已存在" -ForegroundColor Yellow
}

# Step 2: 创建信任策略
Write-Host ""
Write-Host "步骤2: 创建IAM角色信任策略..." -ForegroundColor Cyan
$trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_USERNAME}/${REPO_NAME}:*"
        }
      }
    }
  ]
}
"@
$trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding UTF8

# Step 3: 创建角色
Write-Host "步骤3: 创建IAM角色..." -ForegroundColor Cyan
$roleName = "GitHubActions-$REPO_NAME"
try {
    aws iam create-role `
        --role-name $roleName `
        --assume-role-policy-document file://trust-policy.json `
        2>$null
    Write-Host "✓ 角色创建成功" -ForegroundColor Green
} catch {
    Write-Host "✓ 角色已存在" -ForegroundColor Yellow
}

# Step 4: 附加权限策略
Write-Host "步骤4: 附加权限策略..." -ForegroundColor Cyan

# ECR权限
aws iam attach-role-policy `
    --role-name $roleName `
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# ECS权限
aws iam attach-role-policy `
    --role-name $roleName `
    --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

Write-Host "✓ 权限策略附加成功" -ForegroundColor Green

# 创建Secrets Manager权限策略
$secretsPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:CreateSecret",
        "secretsmanager:UpdateSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:${AWS_ACCOUNT_ID}:secret:job-analyzer/*"
    }
  ]
}
"@
$secretsPolicy | Out-File -FilePath "secrets-policy.json" -Encoding UTF8

aws iam put-role-policy `
    --role-name $roleName `
    --policy-name SecretsManagerAccess `
    --policy-document file://secrets-policy.json

# Step 5: 创建GitHub Actions workflow
Write-Host ""
Write-Host "步骤5: 创建GitHub Actions配置..." -ForegroundColor Cyan
if (!(Test-Path ".github\workflows")) {
    New-Item -ItemType Directory -Path ".github\workflows" -Force | Out-Null
}

$workflowContent = @"
name: Deploy to AWS (OIDC)

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: job-analyzer
  ECS_SERVICE: job-analyzer-service
  ECS_CLUSTER: job-analyzer-cluster
  ECS_TASK_DEFINITION: task-definition.json
  CONTAINER_NAME: job-analyzer

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::${AWS_ACCOUNT_ID}:role/${roleName}
        role-session-name: GitHubActions
        aws-region: `${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2

    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: `${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: `${{ github.sha }}
      run: |
        docker build -t `$ECR_REGISTRY/`$ECR_REPOSITORY:`$IMAGE_TAG .
        docker push `$ECR_REGISTRY/`$ECR_REPOSITORY:`$IMAGE_TAG
        echo "image=`$ECR_REGISTRY/`$ECR_REPOSITORY:`$IMAGE_TAG" >> `$GITHUB_OUTPUT

    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: `${{ env.ECS_TASK_DEFINITION }}
        container-name: `${{ env.CONTAINER_NAME }}
        image: `${{ steps.build-image.outputs.image }}

    - name: Deploy Amazon ECS task definition
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: `${{ steps.task-def.outputs.task-definition }}
        service: `${{ env.ECS_SERVICE }}
        cluster: `${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true
"@
$workflowContent | Out-File -FilePath ".github\workflows\deploy-aws-oidc.yml" -Encoding UTF8

# 清理临时文件
Remove-Item -Path "trust-policy.json" -ErrorAction SilentlyContinue
Remove-Item -Path "secrets-policy.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== 设置完成！ ===" -ForegroundColor Green
Write-Host ""
Write-Host "角色ARN: arn:aws:iam::${AWS_ACCOUNT_ID}:role/${roleName}" -ForegroundColor Yellow
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. 提交这些更改："
Write-Host "   git add .github/workflows/deploy-aws-oidc.yml" -ForegroundColor Yellow
Write-Host "   git commit -m 'Add GitHub OIDC deployment'" -ForegroundColor Yellow
Write-Host "   git push origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. 在GitHub仓库设置中添加以下Variables（不是Secrets！）："
Write-Host "   - 名称: AWS_ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "   - 值: $AWS_ACCOUNT_ID" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. 确保已经创建了ECR仓库、ECS集群等AWS资源"
Write-Host ""
Write-Host "完成后，每次推送到main分支都会自动部署，无需任何密钥！" -ForegroundColor Green