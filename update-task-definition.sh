#!/bin/bash

# 自动更新task-definition.json中的占位符
echo "=== 更新task-definition.json ==="

# 获取AWS账户信息
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"

echo "AWS账户ID: $AWS_ACCOUNT_ID"
echo "AWS区域: $AWS_REGION"

# 创建更新后的task-definition.json
cat > task-definition-updated.json <<EOF
{
  "family": "job-analyzer",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "job-analyzer",
      "image": "job-analyzer",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:job-analyzer/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:job-analyzer/jwt-secret"
        },
        {
          "name": "GOOGLE_CLIENT_ID",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:job-analyzer/google-client-id"
        },
        {
          "name": "GOOGLE_CLIENT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:job-analyzer/google-client-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/job-analyzer",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole"
}
EOF

# 替换原文件
mv task-definition-updated.json task-definition.json

echo "✓ task-definition.json 已更新！"