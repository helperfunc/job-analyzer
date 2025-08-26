#!/bin/bash

# 简单部署脚本 - 适合AWS新手
echo "=== Job Analyzer AWS 部署脚本 ==="
echo "确保你已经："
echo "1. 安装了AWS CLI并运行了 aws configure"
echo "2. 安装了Docker"
echo "3. 有一个可用的数据库（Supabase）"
echo ""
read -p "准备好了吗？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 获取AWS账号ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
ECR_REPO="job-analyzer"

echo "AWS账号ID: $AWS_ACCOUNT_ID"
echo "AWS区域: $AWS_REGION"

# 步骤1：创建ECR仓库
echo ""
echo "步骤1：创建ECR仓库..."
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION 2>/dev/null || echo "ECR仓库已存在"

# 步骤2：构建并推送Docker镜像
echo ""
echo "步骤2：构建Docker镜像..."
docker build -t $ECR_REPO .

echo ""
echo "步骤3：推送到ECR..."
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
docker tag $ECR_REPO:latest $ECR_URI:latest
docker push $ECR_URI:latest

# 步骤4：创建基础设施
echo ""
echo "步骤4：创建ECS集群..."
aws ecs create-cluster --cluster-name $ECR_REPO-cluster --region $AWS_REGION 2>/dev/null || echo "集群已存在"

echo ""
echo "=== 部署准备完成！==="
echo ""
echo "接下来需要手动完成："
echo "1. 在AWS控制台创建任务定义"
echo "2. 创建ALB（负载均衡器）"
echo "3. 创建ECS服务"
echo ""
echo "你的Docker镜像URI: $ECR_URI:latest"
echo ""
echo "详细步骤请查看 AWS_BEGINNER_GUIDE.md"