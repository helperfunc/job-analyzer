#!/bin/bash

echo "🔍 Debugging ECS Deployment Issues"
echo "================================="

# Set variables
CLUSTER="job-analyzer-cluster"
SERVICE="job-analyzer-service"
REGION="us-east-1"

# Get the latest task ARN
echo "📋 Getting latest task information..."
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER --service-name $SERVICE --region $REGION --query 'taskArns[0]' --output text)

if [ -z "$TASK_ARN" ]; then
    echo "❌ No tasks found for service"
    exit 1
fi

echo "Task ARN: $TASK_ARN"

# Describe the task
echo -e "\n📄 Task Details:"
aws ecs describe-tasks --cluster $CLUSTER --tasks $TASK_ARN --region $REGION \
    --query 'tasks[0].{Status:lastStatus,DesiredStatus:desiredStatus,StoppedReason:stoppedReason,Containers:containers[*].{Name:name,Status:lastStatus,Reason:reason,ExitCode:exitCode}}' \
    --output json

# Get CloudWatch logs
echo -e "\n📊 CloudWatch Logs:"
TASK_ID=$(echo $TASK_ARN | rev | cut -d'/' -f1 | rev)
LOG_STREAM="ecs/job-analyzer/$TASK_ID"

echo "Fetching logs from stream: $LOG_STREAM"
aws logs get-log-events \
    --log-group-name "/ecs/job-analyzer" \
    --log-stream-name $LOG_STREAM \
    --region $REGION \
    --query 'events[*].message' \
    --output text 2>/dev/null || echo "No logs found or log stream doesn't exist yet"

# Check service events
echo -e "\n🔔 Recent Service Events:"
aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION \
    --query 'services[0].events[0:5].{Time:createdAt,Message:message}' \
    --output table

# Check secrets
echo -e "\n🔐 Verifying Secrets Manager Access:"
aws secretsmanager list-secrets --region $REGION \
    --query 'SecretList[?contains(Name, `job-analyzer`)].{Name:Name,ARN:ARN}' \
    --output table

echo -e "\n✅ Debug information collected!"