#!/bin/bash

echo "🔧 Fixing ECS IAM Permissions for Secrets Manager"
echo "================================================"

# Create a policy that allows reading secrets
cat > ecs-secrets-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": [
                "arn:aws:secretsmanager:us-east-1:076181803263:secret:job-analyzer/*"
            ]
        }
    ]
}
EOF

echo "📄 Policy JSON created"

# Create the policy
echo "🔐 Creating IAM policy..."
aws iam create-policy \
    --policy-name ECSSecretsManagerPolicy \
    --policy-document file://ecs-secrets-policy.json \
    --description "Allow ECS tasks to read job-analyzer secrets from Secrets Manager" \
    --region us-east-1

# Attach the policy to the ECS task execution role
echo "📎 Attaching policy to ecsTaskExecutionRole..."
aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::076181803263:policy/ECSSecretsManagerPolicy \
    --region us-east-1

echo "✅ IAM permissions updated!"

# List current policies attached to the role
echo -e "\n📋 Current policies attached to ecsTaskExecutionRole:"
aws iam list-attached-role-policies --role-name ecsTaskExecutionRole --region us-east-1

# Clean up
rm ecs-secrets-policy.json

echo -e "\n🎉 Done! The ECS service should now be able to read secrets."
echo "The ECS service will automatically retry with the updated permissions."