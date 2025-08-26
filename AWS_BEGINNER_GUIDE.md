# AWS 部署新手指南

本指南为完全没有使用过AWS的开发者准备，会详细解释每个步骤。

## 第一步：准备工作

### 1.1 创建AWS账号
1. 访问 https://aws.amazon.com/
2. 点击"创建 AWS 账户"
3. 填写邮箱、密码、账户名
4. 需要信用卡信息（AWS有12个月免费套餐）
5. 验证手机号码
6. 选择"基本支持 - 免费"

### 1.2 获取AWS访问密钥
1. 登录AWS控制台：https://console.aws.amazon.com/
2. 点击右上角你的用户名
3. 选择"安全凭证"
4. 找到"访问密钥"部分
5. 点击"创建访问密钥"
6. 选择"命令行界面(CLI)"
7. **重要**：下载CSV文件，保存好Access Key ID和Secret Access Key

### 1.3 安装必要工具

#### Windows系统：
```bash
# 1. 安装AWS CLI
# 下载安装程序：https://awscli.amazonaws.com/AWSCLIV2.msi
# 双击安装

# 2. 安装Terraform
# 下载：https://www.terraform.io/downloads
# 解压后将terraform.exe放到系统PATH中

# 3. 配置AWS CLI
aws configure
# 输入你的Access Key ID
# 输入你的Secret Access Key
# 输入默认区域：us-east-1
# 输出格式：json
```

## 第二步：部署前的准备

### 2.1 Fork或Clone项目到你的GitHub

```bash
# 如果还没有将项目推送到GitHub
cd D:\code\jobsfind\job-analyzer
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/job-analyzer.git
git push -u origin main
```

### 2.2 理解项目结构

我们的部署会用到这些文件：
- `Dockerfile` - 告诉Docker如何打包你的应用
- `.github/workflows/deploy-to-aws.yml` - GitHub自动部署配置
- `infrastructure/terraform/main.tf` - AWS基础设施配置
- `task-definition.json` - 告诉AWS如何运行你的应用

## 第三步：创建AWS基础设施（最简单方法）

由于Terraform对新手来说比较复杂，我们先用AWS控制台手动创建：

### 3.1 创建ECR（容器镜像仓库）

1. 登录AWS控制台
2. 搜索"ECR"并进入
3. 点击"创建存储库"
4. 存储库名称：`job-analyzer`
5. 其他保持默认，点击"创建存储库"
6. 记下URI，类似：`123456789.dkr.ecr.us-east-1.amazonaws.com/job-analyzer`

### 3.2 创建ECS集群

1. 搜索"ECS"并进入
2. 点击"创建集群"
3. 集群名称：`job-analyzer-cluster`
4. 选择"AWS Fargate"
5. 点击"创建"

### 3.3 创建任务定义

1. 在ECS中，点击"任务定义"
2. 点击"创建新任务定义"
3. 选择"Fargate"
4. 任务定义名称：`job-analyzer`
5. 任务角色：稍后创建
6. 任务内存：1GB
7. 任务CPU：0.5 vCPU
8. 添加容器：
   - 容器名称：`job-analyzer`
   - 镜像：先填写 `nginx`（稍后更新）
   - 端口映射：3000
9. 创建

### 3.4 创建ALB（负载均衡器）

1. 搜索"EC2"并进入
2. 左侧菜单找到"负载均衡器"
3. 点击"创建负载均衡器"
4. 选择"Application Load Balancer"
5. 名称：`job-analyzer-alb`
6. 方案：面向Internet
7. 选择默认VPC和至少两个可用区
8. 安全组：创建新的，允许80和443端口
9. 目标组：创建新的，名称`job-analyzer-tg`，端口3000
10. 创建

## 第四步：设置环境变量和密钥

### 4.1 使用AWS Secrets Manager（简化版）

1. 在AWS控制台搜索"Secrets Manager"
2. 点击"存储新密钥"
3. 选择"其他类型的密钥"
4. 键/值对：
   ```
   DATABASE_URL: 你的数据库连接字符串
   JWT_SECRET: 随机生成的32位字符串
   GOOGLE_CLIENT_ID: 你的Google OAuth ID
   GOOGLE_CLIENT_SECRET: 你的Google OAuth密钥
   ```
5. 密钥名称：`job-analyzer/prod`
6. 创建

### 4.2 创建IAM角色

1. 搜索"IAM"并进入
2. 点击"角色" → "创建角色"
3. 选择"AWS服务" → "Elastic Container Service" → "Elastic Container Service Task"
4. 附加策略：
   - `AmazonECSTaskExecutionRolePolicy`
   - 创建自定义策略允许读取Secrets Manager
5. 角色名称：`ecsTaskExecutionRole`

## 第五步：GitHub Actions配置

### 5.1 设置GitHub密钥

1. 在你的GitHub仓库，点击Settings
2. 左侧菜单选择"Secrets and variables" → "Actions"
3. 添加以下密钥：
   ```
   AWS_ACCESS_KEY_ID: 你的AWS Access Key
   AWS_SECRET_ACCESS_KEY: 你的AWS Secret Key
   DATABASE_URL: 数据库连接字符串
   JWT_SECRET: JWT密钥
   GOOGLE_CLIENT_ID: Google OAuth ID
   GOOGLE_CLIENT_SECRET: Google OAuth密钥
   ```

### 5.2 更新部署配置

编辑 `task-definition.json`，将其中的占位符替换为实际值：
- `${AWS_REGION}` → `us-east-1`
- `${AWS_ACCOUNT_ID}` → 你的12位AWS账号ID（在AWS控制台右上角）

## 第六步：首次部署

### 6.1 手动构建和推送Docker镜像

```bash
# 1. 获取ECR登录令牌
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 你的ECR_URI

# 2. 构建镜像
cd D:\code\jobsfind\job-analyzer
docker build -t job-analyzer .

# 3. 标记镜像
docker tag job-analyzer:latest 你的ECR_URI:latest

# 4. 推送镜像
docker push 你的ECR_URI:latest
```

### 6.2 创建ECS服务

1. 在ECS集群中，点击"创建服务"
2. 启动类型：Fargate
3. 任务定义：选择`job-analyzer`
4. 服务名称：`job-analyzer-service`
5. 任务数：1
6. 配置网络：
   - 选择默认VPC
   - 选择至少2个子网
   - 安全组：允许3000端口
   - 自动分配公共IP：启用
7. 负载均衡：
   - 选择Application Load Balancer
   - 选择之前创建的ALB
   - 选择目标组
8. 创建服务

## 第七步：验证部署

1. 等待几分钟让服务启动
2. 在EC2→负载均衡器中找到你的ALB
3. 复制DNS名称（类似：job-analyzer-alb-123456.us-east-1.elb.amazonaws.com）
4. 在浏览器访问：http://你的ALB_DNS名称

## 常见问题解决

### 问题1：容器无法启动
- 查看CloudWatch日志：ECS服务 → 任务 → 日志

### 问题2：数据库连接失败
- 确保数据库允许从AWS IP访问
- Supabase：在设置中添加0.0.0.0/0到允许列表

### 问题3：健康检查失败
- 确保应用在3000端口运行
- 检查`/api/health`端点是否正常

## 费用预估

使用AWS免费套餐：
- Fargate: 每月免费750小时（足够运行一个小实例）
- ALB: 每月免费750小时
- ECR: 每月500MB免费存储

超出免费额度后：
- Fargate: ~$20/月（0.5 vCPU, 1GB内存）
- ALB: ~$20/月
- 总计: ~$40/月

## 下一步

1. **添加域名**：
   - 在Route 53购买域名
   - 创建A记录指向ALB

2. **启用HTTPS**：
   - 在ACM申请SSL证书
   - 在ALB监听器添加443端口

3. **自动化部署**：
   - 推送代码到GitHub main分支
   - GitHub Actions会自动构建和部署

## 需要帮助？

1. AWS文档：https://docs.aws.amazon.com/
2. AWS免费培训：https://aws.amazon.com/training/
3. Stack Overflow：搜索相关错误信息

记住：AWS看起来很复杂，但核心概念就是：
- ECR = 存放Docker镜像的地方
- ECS = 运行Docker容器的地方
- ALB = 让用户能访问你应用的入口
- Secrets Manager = 安全存放密码的地方