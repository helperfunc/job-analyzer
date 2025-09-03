# GitHub OIDC Setup Script (Windows PowerShell)
Write-Host "=== GitHub OIDC Setup Wizard ===" -ForegroundColor Cyan
Write-Host "This script will help you set up GitHub OIDC so you don't need to store AWS keys in GitHub"
Write-Host ""

# Check AWS CLI
try {
    $awsVersion = aws --version
    Write-Host "[OK] AWS CLI detected: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: AWS CLI needs to be installed first" -ForegroundColor Red
    Write-Host "Visit: https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Yellow
    exit 1
}

# Get AWS Account ID
try {
    $AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    Write-Host "[OK] AWS Account ID: $AWS_ACCOUNT_ID" -ForegroundColor Green
} catch {
    Write-Host "Error: Cannot get AWS account ID, please run 'aws configure' first" -ForegroundColor Red
    exit 1
}

# Get GitHub info
$GITHUB_USERNAME = Read-Host "Enter your GitHub username"
$REPO_NAME = Read-Host "Enter repository name (press Enter for default: job-analyzer)"
if ([string]::IsNullOrEmpty($REPO_NAME)) {
    $REPO_NAME = "job-analyzer"
}

Write-Host ""
Write-Host "Will set up OIDC for the following GitHub repository:" -ForegroundColor Yellow
Write-Host "  https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    exit 0
}

# Step 1: Create OIDC Provider
Write-Host ""
Write-Host "Step 1: Creating OIDC Provider..." -ForegroundColor Cyan
$null = aws iam create-open-id-connect-provider `
    --url https://token.actions.githubusercontent.com `
    --client-id-list sts.amazonaws.com `
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 `
    2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] OIDC Provider created successfully" -ForegroundColor Green
} else {
    Write-Host "[OK] OIDC Provider already exists" -ForegroundColor Yellow
}

# Step 2: Create trust policy
Write-Host ""
Write-Host "Step 2: Creating IAM role trust policy..." -ForegroundColor Cyan
$trustPolicy = @"
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
"@
$trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding UTF8

# Step 3: Create role
Write-Host "Step 3: Creating IAM role..." -ForegroundColor Cyan
$roleName = "GitHubActions-$REPO_NAME"
$null = aws iam create-role `
    --role-name $roleName `
    --assume-role-policy-document file://trust-policy.json `
    2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Role created successfully" -ForegroundColor Green
} else {
    Write-Host "[OK] Role already exists" -ForegroundColor Yellow
}

# Step 4: Attach permission policies
Write-Host "Step 4: Attaching permission policies..." -ForegroundColor Cyan

# ECR permissions
aws iam attach-role-policy `
    --role-name $roleName `
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# ECS permissions
aws iam attach-role-policy `
    --role-name $roleName `
    --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

Write-Host "[OK] Permission policies attached successfully" -ForegroundColor Green

# Create Secrets Manager permission policy
$secretsPolicy = @"
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
"@
$secretsPolicy | Out-File -FilePath "secrets-policy.json" -Encoding UTF8

aws iam put-role-policy `
    --role-name $roleName `
    --policy-name SecretsManagerAccess `
    --policy-document file://secrets-policy.json

# Step 5: Create GitHub Actions workflow
Write-Host ""
Write-Host "Step 5: Creating GitHub Actions configuration..." -ForegroundColor Cyan
if (!(Test-Path ".github\workflows")) {
    New-Item -ItemType Directory -Path ".github\workflows" -Force | Out-Null
}

$workflowContent = @"
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
        role-to-assume: arn:aws:iam::${AWS_ACCOUNT_ID}:role/${roleName}
        role-session-name: GitHubActions
        aws-region: `${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2

    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: `${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: `${{ github.sha }}
      run: |
        docker build -t `$ECR_REGISTRY/`$ECR_REPOSITORY:`$IMAGE_TAG .
        docker push `$ECR_REGISTRY/`$ECR_REPOSITORY:`$IMAGE_TAG
        echo "image=`$ECR_REGISTRY/`$ECR_REPOSITORY:`$IMAGE_TAG" >> `$GITHUB_OUTPUT

    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: `${{ env.ECS_TASK_DEFINITION }}
        container-name: `${{ env.CONTAINER_NAME }}
        image: `${{ steps.build-image.outputs.image }}

    - name: Deploy Amazon ECS task definition
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: `${{ steps.task-def.outputs.task-definition }}
        service: `${{ env.ECS_SERVICE }}
        cluster: `${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true
"@
$workflowContent | Out-File -FilePath ".github\workflows\deploy-aws-oidc.yml" -Encoding UTF8

# Clean up temporary files
Remove-Item -Path "trust-policy.json" -ErrorAction SilentlyContinue
Remove-Item -Path "secrets-policy.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Role ARN: arn:aws:iam::${AWS_ACCOUNT_ID}:role/${roleName}" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit these changes:"
Write-Host "   git add .github/workflows/deploy-aws-oidc.yml" -ForegroundColor Yellow
Write-Host "   git commit -m 'Add GitHub OIDC deployment'" -ForegroundColor Yellow
Write-Host "   git push origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Add the following Variables in GitHub repository settings (not Secrets!):"
Write-Host "   - Name: AWS_ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "   - Value: $AWS_ACCOUNT_ID" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Ensure AWS resources (ECR repository, ECS cluster, etc.) are created"
Write-Host ""
Write-Host "Done! Pushes to main branch will now deploy automatically without any keys!" -ForegroundColor Green