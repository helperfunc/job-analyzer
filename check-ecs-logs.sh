#!/bin/bash

echo "📊 Checking ECS Task Logs"
echo "========================"

CLUSTER="job-analyzer-cluster"
SERVICE="job-analyzer-service"
REGION="us-east-1"

# Get the most recent task
echo "Getting most recent task..."
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER --service-name $SERVICE --region $REGION --desired-status STOPPED --query 'taskArns[0]' --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
    echo "No stopped tasks found. Checking running tasks..."
    TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER --service-name $SERVICE --region $REGION --query 'taskArns[0]' --output text)
fi

if [ "$TASK_ARN" != "None" ] && [ ! -z "$TASK_ARN" ]; then
    echo "Task ARN: $TASK_ARN"
    
    # Extract task ID from ARN
    TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
    echo "Task ID: $TASK_ID"
    
    # Get task details
    echo -e "\n📋 Task Details:"
    aws ecs describe-tasks --cluster $CLUSTER --tasks $TASK_ARN --region $REGION \
        --query 'tasks[0].{Status:lastStatus,StoppedReason:stoppedReason,HealthStatus:healthStatus,Containers:containers[*].{Name:name,Status:lastStatus,ExitCode:exitCode,Reason:reason,HealthStatus:healthStatus}}' \
        --output json
    
    # Get CloudWatch logs
    echo -e "\n📜 Application Logs:"
    LOG_STREAM="ecs/job-analyzer/$TASK_ID"
    
    # Use MSYS_NO_PATHCONV to prevent path conversion on Windows
    MSYS_NO_PATHCONV=1 aws logs get-log-events \
        --log-group-name "/ecs/job-analyzer" \
        --log-stream-name "$LOG_STREAM" \
        --region $REGION \
        --start-from-head \
        --limit 50 \
        --query 'events[*].message' \
        --output text 2>/dev/null || echo "No logs found for this task"
else
    echo "No tasks found"
fi

# Check recent service events
echo -e "\n🔔 Recent Service Events:"
aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION \
    --query 'services[0].events[0:3].{Time:createdAt,Message:message}' \
    --output table