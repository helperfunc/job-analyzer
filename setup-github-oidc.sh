#!/bin/bash

# GitHub OIDC 快速设置脚本
echo "=== GitHub OIDC 设置向导 ==="
echo "这个脚本会帮你设置GitHub OIDC，这样就不需要在GitHub存储AWS密钥了"
echo ""

# 检查AWS CLI
if ! command -v aws &> /dev/null; then
    echo "错误：需要先安装AWS CLI"
    echo "访问：https://aws.amazon.com/cli/"
    exit 1
fi

# 获取AWS账户ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "错误：无法获取AWS账户ID，请先运行 aws configure"
    exit 1
fi

echo "检测到AWS账户ID: $AWS_ACCOUNT_ID"
echo ""

# 获取GitHub信息
read -p "请输入你的GitHub用户名: " GITHUB_USERNAME
read -p "请输入仓库名称 (默认: job-analyzer): " REPO_NAME
REPO_NAME=${REPO_NAME:-job-analyzer}

echo ""
echo "将为以下GitHub仓库设置OIDC："
echo "  https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
read -p "确认继续？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Step 1: 创建OIDC Provider
echo ""
echo "步骤1: 创建OIDC Provider..."
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  2>/dev/null || echo "OIDC Provider已存在"

# Step 2: 创建信任策略
echo ""
echo "步骤2: 创建IAM角色信任策略..."
cat > trust-policy.json <<EOF
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
EOF

# Step 3: 创建角色
echo "步骤3: 创建IAM角色..."
aws iam create-role \
  --role-name GitHubActions-${REPO_NAME} \
  --assume-role-policy-document file://trust-policy.json \
  2>/dev/null || echo "角色已存在"

# Step 4: 附加权限策略
echo "步骤4: 附加权限策略..."
# ECR权限
aws iam attach-role-policy \
  --role-name GitHubActions-${REPO_NAME} \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# ECS权限
aws iam attach-role-policy \
  --role-name GitHubActions-${REPO_NAME} \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

# Secrets Manager权限（创建自定义策略）
cat > secrets-policy.json <<EOF
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
EOF

aws iam put-role-policy \
  --role-name GitHubActions-${REPO_NAME} \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-policy.json

# Step 5: 创建GitHub Actions workflow
echo ""
echo "步骤5: 创建GitHub Actions配置..."
mkdir -p .github/workflows
cat > .github/workflows/deploy-aws-oidc.yml <<EOF
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
        role-to-assume: arn:aws:iam::${AWS_ACCOUNT_ID}:role/GitHubActions-${REPO_NAME}
        role-session-name: GitHubActions
        aws-region: \${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2

    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: \${{ github.sha }}
      run: |
        docker build -t \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG .
        docker push \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG
        echo "image=\$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG" >> \$GITHUB_OUTPUT

    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: \${{ env.ECS_TASK_DEFINITION }}
        container-name: \${{ env.CONTAINER_NAME }}
        image: \${{ steps.build-image.outputs.image }}

    - name: Deploy Amazon ECS task definition
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: \${{ steps.task-def.outputs.task-definition }}
        service: \${{ env.ECS_SERVICE }}
        cluster: \${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true
EOF

# 清理临时文件
rm -f trust-policy.json secrets-policy.json

echo ""
echo "=== 设置完成！ ==="
echo ""
echo "角色ARN: arn:aws:iam::${AWS_ACCOUNT_ID}:role/GitHubActions-${REPO_NAME}"
echo ""
echo "下一步："
echo "1. 提交这些更改："
echo "   git add .github/workflows/deploy-aws-oidc.yml"
echo "   git commit -m 'Add GitHub OIDC deployment'"
echo "   git push origin main"
echo ""
echo "2. 在GitHub仓库设置中添加以下Variables（不是Secrets！）："
echo "   - 名称: AWS_ACCOUNT_ID"
echo "   - 值: ${AWS_ACCOUNT_ID}"
echo ""
echo "3. 确保已经创建了ECR仓库、ECS集群等AWS资源"
echo ""
echo "完成后，每次推送到main分支都会自动部署，无需任何密钥！"