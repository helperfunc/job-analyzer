#!/bin/bash

echo "📊 Creating CloudWatch Log Group for ECS"
echo "======================================="

LOG_GROUP="/ecs/job-analyzer"
REGION="us-east-1"

# Create the log group
echo "Creating log group: $LOG_GROUP"
# Handle Windows Git Bash path conversion issue
MSYS_NO_PATHCONV=1 aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$REGION" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Log group created successfully!"
else
    echo "⚠️  Log group might already exist or there was an error."
fi

# Set retention policy (optional - 7 days to save costs)
echo "Setting retention policy to 7 days..."
aws logs put-retention-policy \
    --log-group-name "$LOG_GROUP" \
    --retention-in-days 7 \
    --region "$REGION"

# Verify the log group exists
echo -e "\n📋 Verifying log group:"
aws logs describe-log-groups \
    --log-group-name-prefix "$LOG_GROUP" \
    --region "$REGION" \
    --query 'logGroups[*].{Name:logGroupName,RetentionDays:retentionInDays}' \
    --output table

echo -e "\n✅ CloudWatch logs setup complete!"

# Force a new deployment to pick up the changes
echo -e "\n🔄 Forcing new ECS deployment..."
aws ecs update-service \
    --cluster job-analyzer-cluster \
    --service job-analyzer-service \
    --force-new-deployment \
    --region "$REGION"

echo "🚀 Deployment triggered! Check the ECS console for progress."