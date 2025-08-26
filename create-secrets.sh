#!/bin/bash

# 创建AWS Secrets Manager密钥
echo "=== 创建应用密钥 ==="
echo "请准备好以下信息："
echo "1. 数据库连接URL (PostgreSQL/Supabase)"
echo "2. JWT密钥 (32位随机字符串)"
echo "3. Google OAuth客户端ID"
echo "4. Google OAuth客户端密钥"
echo ""

# 创建密钥的函数
create_secret() {
    local name=$1
    local description=$2
    local secret_value=$3
    
    echo "创建密钥: $name"
    aws secretsmanager create-secret \
        --name "$name" \
        --description "$description" \
        --secret-string "$secret_value" \
        --region us-east-1 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "$name" \
        --secret-string "$secret_value" \
        --region us-east-1
}

# 生成随机JWT密钥
generate_jwt_secret() {
    openssl rand -hex 32 2>/dev/null || \
    head -c 32 /dev/urandom | base64 | tr -d "=+/" | cut -c1-32
}

# 收集信息
echo "数据库设置："
echo "如果使用Supabase，URL格式类似："
echo "postgresql://postgres:[密码]@db.[项目ID].supabase.co:5432/postgres"
echo ""
read -p "请输入DATABASE_URL: " DATABASE_URL

echo ""
echo "JWT密钥设置："
DEFAULT_JWT=$(generate_jwt_secret)
echo "建议使用自动生成的密钥: $DEFAULT_JWT"
read -p "按Enter使用自动生成的密钥，或输入自定义密钥: " JWT_SECRET
JWT_SECRET=${JWT_SECRET:-$DEFAULT_JWT}

echo ""
echo "Google OAuth设置："
echo "从 https://console.cloud.google.com/apis/credentials 获取"
read -p "请输入GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -s -p "请输入GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
echo ""

# 创建密钥
echo ""
echo "创建AWS Secrets..."
create_secret "job-analyzer/database-url" "Database connection URL" "$DATABASE_URL"
create_secret "job-analyzer/jwt-secret" "JWT signing secret" "$JWT_SECRET"
create_secret "job-analyzer/google-client-id" "Google OAuth Client ID" "$GOOGLE_CLIENT_ID"
create_secret "job-analyzer/google-client-secret" "Google OAuth Client Secret" "$GOOGLE_CLIENT_SECRET"

echo ""
echo "=== 密钥创建完成！ ==="
echo ""
echo "已创建以下密钥："
echo "✓ job-analyzer/database-url"
echo "✓ job-analyzer/jwt-secret"
echo "✓ job-analyzer/google-client-id"
echo "✓ job-analyzer/google-client-secret"
echo ""
echo "提示：这些密钥已安全存储在AWS Secrets Manager中"