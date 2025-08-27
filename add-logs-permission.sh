#!/bin/bash

echo "🔧 Adding CloudWatch Logs permissions to ECS Task Execution Role"
echo "=============================================================="

# Create a policy for CloudWatch Logs
cat > ecs-logs-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": [
                "arn:aws:logs:us-east-1:076181803263:log-group:/ecs/job-analyzer",
                "arn:aws:logs:us-east-1:076181803263:log-group:/ecs/job-analyzer:*"
            ]
        }
    ]
}
EOF

echo "📄 Policy JSON created"

# Create or update the policy
echo "🔐 Creating/Updating IAM policy..."
aws iam create-policy \
    --policy-name ECSCloudWatchLogsPolicy \
    --policy-document file://ecs-logs-policy.json \
    --description "Allow ECS tasks to write to CloudWatch Logs" \
    --region us-east-1 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Policy might already exist, trying to create a new version..."
    # Get the policy ARN
    POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='ECSCloudWatchLogsPolicy'].Arn" --output text)
    
    if [ ! -z "$POLICY_ARN" ]; then
        # Create new policy version
        aws iam create-policy-version \
            --policy-arn "$POLICY_ARN" \
            --policy-document file://ecs-logs-policy.json \
            --set-as-default
    fi
fi

# Attach the policy to the ECS task execution role
echo "📎 Attaching policy to ecsTaskExecutionRole..."
aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::076181803263:policy/ECSCloudWatchLogsPolicy 2>/dev/null

echo "✅ Permissions updated!"

# Clean up
rm ecs-logs-policy.json

echo -e "\n📋 Current policies attached to ecsTaskExecutionRole:"
aws iam list-attached-role-policies --role-name ecsTaskExecutionRole