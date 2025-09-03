#!/bin/bash

# Setup AWS Secrets Manager secrets
# Run this script before deploying

AWS_REGION=${AWS_REGION:-us-east-1}
APP_NAME="job-analyzer"

echo "Setting up AWS Secrets Manager secrets for $APP_NAME in region $AWS_REGION"

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" 2>/dev/null; then
        echo "Updating secret: $secret_name"
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION"
    else
        echo "Creating secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION"
    fi
}

# Read environment variables or prompt for values
read -p "Enter DATABASE_URL: " DATABASE_URL
read -p "Enter JWT_SECRET: " JWT_SECRET
read -p "Enter GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -s -p "Enter GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
echo
read -p "Enter DB_HOST: " DB_HOST
read -p "Enter DB_USER: " DB_USER
read -s -p "Enter DB_PASSWORD: " DB_PASSWORD
echo
read -p "Enter DB_NAME: " DB_NAME

# Create secrets
create_or_update_secret "$APP_NAME/database-url" "$DATABASE_URL"
create_or_update_secret "$APP_NAME/jwt-secret" "$JWT_SECRET"
create_or_update_secret "$APP_NAME/google-client-id" "$GOOGLE_CLIENT_ID"
create_or_update_secret "$APP_NAME/google-client-secret" "$GOOGLE_CLIENT_SECRET"
create_or_update_secret "$APP_NAME/db-host" "$DB_HOST"
create_or_update_secret "$APP_NAME/db-user" "$DB_USER"
create_or_update_secret "$APP_NAME/db-password" "$DB_PASSWORD"
create_or_update_secret "$APP_NAME/db-name" "$DB_NAME"

echo "Secrets setup complete!"