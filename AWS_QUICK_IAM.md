# AWS IAM 快速设置（5分钟）

## 快速步骤

### 1. 保护Root账户（1分钟）
1. 登录AWS → 右上角账户名 → Security credentials
2. 启用MFA（用Google Authenticator扫码）
3. **以后不要再用root账户！**

### 2. 创建部署用户（2分钟）

打开CloudShell（AWS控制台右上角的终端图标）或本地终端，运行：

```bash
# 创建用户
aws iam create-user --user-name github-deploy

# 附加现成的策略（暂时使用，之后可以限制）
aws iam attach-user-policy --user-name github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-user-policy --user-name github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

# 创建access key
aws iam create-access-key --user-name github-deploy > deploy-keys.json

# 查看keys（记得保存！）
cat deploy-keys.json
```

### 3. 创建ECS角色（2分钟）

在AWS控制台：
1. 搜索IAM → Roles → Create role
2. 选择"AWS service" → "Elastic Container Service" → "Elastic Container Service Task"
3. 下一步 → 搜索并勾选 `AmazonECSTaskExecutionRolePolicy`
4. 角色名称：`ecsTaskExecutionRole`
5. 创建

## 在GitHub设置Secrets

1. 去你的GitHub仓库
2. Settings → Secrets and variables → Actions
3. 添加：
   - `AWS_ACCESS_KEY_ID`: 从deploy-keys.json复制
   - `AWS_SECRET_ACCESS_KEY`: 从deploy-keys.json复制

## 安全提醒

这是快速开始的设置，生产环境应该：
- 限制IAM用户权限（只给需要的）
- 使用GitHub OIDC而不是固定密钥
- 定期轮换access key
- 删除本地的deploy-keys.json文件

## 下一步

部署应用：
```bash
git add .
git commit -m "Add AWS deployment"
git push origin main
```

GitHub Actions会自动开始部署！

## 如果出错

最常见的权限错误解决方法：

```bash
# 给用户添加更多权限（临时解决）
aws iam attach-user-policy --user-name github-deploy \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

**注意**：PowerUserAccess权限很大，仅用于测试！