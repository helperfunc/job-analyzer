#!/bin/bash

# 创建AWS基础资源脚本
echo "=== 创建AWS基础资源 ==="

AWS_REGION="us-east-1"
APP_NAME="job-analyzer"

# 1. 创建ECR仓库
echo "创建ECR仓库..."
aws ecr create-repository \
    --repository-name $APP_NAME \
    --region $AWS_REGION \
    2>/dev/null || echo "ECR仓库已存在"

# 2. 创建ECS集群
echo "创建ECS集群..."
aws ecs create-cluster \
    --cluster-name $APP_NAME-cluster \
    --region $AWS_REGION \
    2>/dev/null || echo "ECS集群已存在"

# 3. 创建CloudWatch日志组
echo "创建CloudWatch日志组..."
aws logs create-log-group \
    --log-group-name /ecs/$APP_NAME \
    --region $AWS_REGION \
    2>/dev/null || echo "日志组已存在"

# 4. 创建ECS任务执行角色
echo "创建ECS任务执行角色..."
cat > task-execution-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
    --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file://task-execution-trust-policy.json \
    2>/dev/null || echo "任务执行角色已存在"

# 附加必要的策略
aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    2>/dev/null

# 5. 创建任务角色
aws iam create-role \
    --role-name ecsTaskRole \
    --assume-role-policy-document file://task-execution-trust-policy.json \
    2>/dev/null || echo "任务角色已存在"

# 清理
rm -f task-execution-trust-policy.json

echo ""
echo "=== 基础资源创建完成 ==="
echo ""
echo "已创建："
echo "✓ ECR仓库: $APP_NAME"
echo "✓ ECS集群: $APP_NAME-cluster"
echo "✓ CloudWatch日志组: /ecs/$APP_NAME"
echo "✓ ECS任务执行角色: ecsTaskExecutionRole"
echo "✓ ECS任务角色: ecsTaskRole"
echo ""
echo "下一步："
echo "1. 更新 task-definition.json 中的占位符"
echo "2. 提交并推送代码以触发部署"