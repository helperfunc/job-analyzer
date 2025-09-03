# 最简单的AWS部署方法 - Elastic Beanstalk

如果你觉得ECS太复杂，可以使用AWS Elastic Beanstalk，它会自动处理很多配置。

## 方法一：使用EB CLI（推荐）

### 1. 安装EB CLI

```bash
# Windows用户使用pip
pip install awsebcli
```

### 2. 初始化Elastic Beanstalk

```bash
cd D:\code\jobsfind\job-analyzer

# 初始化EB
eb init

# 选择：
# 1. 区域：us-east-1
# 2. 应用名称：job-analyzer
# 3. 平台：Docker
# 4. SSH：No
```

### 3. 创建环境变量文件

创建 `.ebextensions/environment.config`：

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 3000
    DATABASE_URL: 你的数据库URL
    JWT_SECRET: 你的JWT密钥
    GOOGLE_CLIENT_ID: 你的Google客户端ID
    GOOGLE_CLIENT_SECRET: 你的Google客户端密钥
```

### 4. 部署

```bash
# 创建环境并部署
eb create job-analyzer-prod

# 等待几分钟...

# 打开应用
eb open
```

## 方法二：使用Vercel（最简单）

如果AWS还是太复杂，可以考虑使用Vercel，它是专门为Next.js设计的：

### 1. 安装Vercel CLI

```bash
npm i -g vercel
```

### 2. 部署

```bash
cd D:\code\jobsfind\job-analyzer
vercel

# 按提示操作：
# 1. 登录/注册Vercel账号
# 2. 确认项目设置
# 3. 添加环境变量
```

### 3. 添加环境变量

在Vercel控制台添加：
- DATABASE_URL
- JWT_SECRET  
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

## 方法三：使用Railway（一键部署）

Railway提供最简单的部署体验：

1. 访问 https://railway.app/
2. 用GitHub登录
3. 选择"Deploy from GitHub repo"
4. 选择你的job-analyzer仓库
5. 添加环境变量
6. 点击Deploy

## 比较

| 方案 | 难度 | 费用 | 控制力 | 适合场景 |
|------|------|------|--------|----------|
| AWS ECS | 困难 | $40/月 | 完全控制 | 生产环境 |
| Elastic Beanstalk | 中等 | $30/月 | 较好控制 | 中小型应用 |
| Vercel | 简单 | 免费-$20/月 | 有限控制 | Next.js应用 |
| Railway | 最简单 | $5-20/月 | 有限控制 | 快速原型 |

## 我的建议

1. **如果你想学AWS**：从Elastic Beanstalk开始
2. **如果你想快速上线**：用Vercel
3. **如果你想最简单**：用Railway
4. **如果你要做大项目**：学习ECS

## 需要的环境变量（所有方案都需要）

```env
DATABASE_URL=postgresql://用户:密码@主机:5432/数据库名
JWT_SECRET=生成一个32位随机字符串
GOOGLE_CLIENT_ID=从Google Console获取
GOOGLE_CLIENT_SECRET=从Google Console获取
NODE_ENV=production
```

## 数据库选择

1. **Supabase**（推荐）
   - 免费套餐够用
   - 自带用户认证
   - 提供PostgreSQL

2. **Neon**
   - PostgreSQL
   - 免费套餐
   - 自动暂停省钱

3. **PlanetScale**
   - MySQL兼容
   - 免费套餐
   - 自动扩展

## 快速开始清单

- [ ] 选择部署平台
- [ ] 准备数据库
- [ ] 获取Google OAuth凭证
- [ ] 生成JWT密钥
- [ ] 推送代码到GitHub
- [ ] 运行部署命令
- [ ] 测试应用

记住：不要被AWS的复杂性吓到，先让应用跑起来，以后再优化！