# AWS Deployment Guide

This guide explains how to deploy the Job Analyzer application to AWS using GitHub Actions, Docker, and AWS ECS.

## Architecture Overview

- **Container**: Docker image deployed to Amazon ECR
- **Compute**: AWS ECS Fargate
- **Load Balancer**: Application Load Balancer (ALB)
- **Database**: External PostgreSQL (Supabase or RDS)
- **Secrets**: AWS Secrets Manager
- **CI/CD**: GitHub Actions

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured locally
3. Terraform installed (for infrastructure setup)
4. GitHub repository with secrets configured

## Setup Steps

### 1. Set up AWS Infrastructure

First, create the S3 bucket for Terraform state:

```bash
aws s3 mb s3://job-analyzer-terraform-state --region us-east-1
```

Then apply Terraform:

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

This creates:
- VPC with public subnets
- ECS Cluster
- ECR Repository
- Application Load Balancer
- Security Groups
- IAM Roles

### 2. Configure AWS Secrets

Run the setup script to create secrets in AWS Secrets Manager:

```bash
cd infrastructure
chmod +x setup-secrets.sh
./setup-secrets.sh
```

Enter the following when prompted:
- `DATABASE_URL`: Your Supabase/PostgreSQL connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `GOOGLE_CLIENT_ID`: From Google OAuth console
- `GOOGLE_CLIENT_SECRET`: From Google OAuth console
- Database connection details (for migrations)

### 3. Configure GitHub Secrets

In your GitHub repository settings, add these secrets:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `DATABASE_URL`: Same as above
- `JWT_SECRET`: Same as above
- `GOOGLE_CLIENT_ID`: Same as above
- `GOOGLE_CLIENT_SECRET`: Same as above
- `DB_HOST`: Database host
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name

### 4. Update Task Definition

Replace placeholders in `task-definition.json`:
- `${AWS_REGION}`: Your AWS region (e.g., us-east-1)
- `${AWS_ACCOUNT_ID}`: Your AWS account ID

### 5. Deploy

Push to the main branch to trigger deployment:

```bash
git add .
git commit -m "Deploy to AWS"
git push origin main
```

GitHub Actions will:
1. Build Docker image
2. Push to ECR
3. Update ECS task definition
4. Deploy to ECS
5. Run database migrations

## Environment Variables

The application uses these environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `NODE_ENV`: Set to "production"
- `PORT`: Set to 3000

## Database Setup

The deployment automatically runs:
1. `complete-schema.sql`: Creates all tables
2. `smart-auth-provider-migration.sql`: Sets up UUID user system

For manual migration:

```bash
psql $DATABASE_URL -f database/complete-schema.sql
psql $DATABASE_URL -f database/smart-auth-provider-migration.sql
```

## Monitoring

### Logs
View logs in CloudWatch:
```bash
aws logs tail /ecs/job-analyzer --follow
```

### Health Check
The application exposes `/api/health` endpoint for ALB health checks.

### ECS Service
Monitor service status:
```bash
aws ecs describe-services --cluster job-analyzer-cluster --services job-analyzer-service
```

## Scaling

### Manual Scaling
Update desired count:
```bash
aws ecs update-service --cluster job-analyzer-cluster --service job-analyzer-service --desired-count 3
```

### Auto Scaling
To add auto-scaling, create an Application Auto Scaling policy targeting the ECS service.

## Troubleshooting

### Container Fails to Start
1. Check CloudWatch logs
2. Verify environment variables in task definition
3. Ensure database is accessible from ECS tasks

### Database Connection Issues
1. Verify DATABASE_URL format
2. Check security group rules
3. Ensure database allows connections from ECS subnet

### Health Check Failures
1. Check `/api/health` endpoint locally
2. Verify security group allows traffic on port 3000
3. Check container logs for startup errors

## Cost Optimization

1. Use Fargate Spot for non-critical environments
2. Set appropriate CloudWatch log retention
3. Use Application Auto Scaling to reduce costs during low traffic

## Security Best Practices

1. Use AWS Secrets Manager for all sensitive data
2. Enable container image scanning in ECR
3. Use least privilege IAM roles
4. Enable VPC Flow Logs for network monitoring
5. Use HTTPS with ACM certificate on ALB

## Backup and Recovery

1. Database: Set up automated backups in Supabase/RDS
2. Infrastructure: Terraform state is stored in S3 with versioning
3. Container images: ECR maintains image history

## Next Steps

1. Add custom domain with Route 53
2. Set up SSL/TLS with AWS Certificate Manager
3. Implement CDN with CloudFront
4. Add monitoring with CloudWatch dashboards
5. Set up alerts for critical metrics