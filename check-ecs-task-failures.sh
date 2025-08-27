#!/bin/bash

echo "🔍 Checking ECS Task Failures"
echo "============================="

# Set variables
CLUSTER="job-analyzer-cluster"
SERVICE="job-analyzer-service"
REGION="us-east-1"

# Get stopped tasks
echo "📋 Getting recently stopped tasks..."
STOPPED_TASKS=$(aws ecs list-tasks --cluster $CLUSTER --service-name $SERVICE --desired-status STOPPED --region $REGION --query 'taskArns' --output json)

if [ "$STOPPED_TASKS" == "[]" ]; then
    echo "No recently stopped tasks found."
else
    echo "Found stopped tasks. Getting details..."
    
    # Describe stopped tasks
    aws ecs describe-tasks --cluster $CLUSTER --tasks $(echo $STOPPED_TASKS | jq -r '.[]') --region $REGION \
        --query 'tasks[*].{TaskArn:taskArn,LastStatus:lastStatus,StoppedReason:stoppedReason,StoppedAt:stoppedAt,Containers:containers[*].{Name:name,ExitCode:exitCode,Reason:reason}}' \
        --output json | jq '.'
fi

# Get task definition details
echo -e "\n📄 Current Task Definition:"
aws ecs describe-task-definition --task-definition job-analyzer --region $REGION \
    --query 'taskDefinition.{Family:family,Revision:revision,Cpu:cpu,Memory:memory,ExecutionRole:executionRoleArn}' \
    --output json | jq '.'

# Check ECS service configuration
echo -e "\n⚙️ Service Configuration:"
aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION \
    --query 'services[0].{ServiceName:serviceName,DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount,TaskDefinition:taskDefinition,LaunchType:launchType}' \
    --output json | jq '.'

# Check if log group exists
echo -e "\n📊 Checking CloudWatch Log Group:"
aws logs describe-log-groups --log-group-name-prefix "/ecs/job-analyzer" --region $REGION \
    --query 'logGroups[*].{LogGroupName:logGroupName,CreationTime:creationTime}' \
    --output table

# Get the latest log streams
echo -e "\n📜 Latest Log Streams:"
aws logs describe-log-streams --log-group-name "/ecs/job-analyzer" --region $REGION \
    --order-by LastEventTime --descending --limit 5 \
    --query 'logStreams[*].{StreamName:logStreamName,LastEvent:lastEventTimestamp}' \
    --output table 2>/dev/null || echo "Log group may not exist"

echo -e "\n✅ Analysis complete!"