# Google OAuth 2.0 设置指南

## 步骤1：访问Google Cloud Console
1. 访问：https://console.cloud.google.com/
2. 登录你的Google账户

## 步骤2：创建或选择项目
1. 点击顶部的项目选择器（项目名称旁边的下拉箭头）
2. 点击"新建项目"或选择现有项目
3. 如果创建新项目：
   - 项目名称：job-analyzer
   - 点击"创建"

## 步骤3：启用必要的API
1. 在左侧菜单中，点击"API和服务" > "已启用的API"
2. 点击"+ 启用API和服务"
3. 搜索并启用：
   - Google+ API (如果可用)
   - Google Identity Toolkit API

## 步骤4：创建OAuth 2.0凭据
1. 在左侧菜单中，点击"API和服务" > "凭据"
2. 点击顶部的"+ 创建凭据"
3. 选择"OAuth 客户端 ID"

## 步骤5：配置OAuth同意屏幕（如果需要）
如果系统提示先配置OAuth同意屏幕：
1. 用户类型选择"外部"
2. 填写必填信息：
   - 应用名称：Job Analyzer
   - 用户支持电子邮件：你的邮箱
   - 开发者联系信息：你的邮箱
3. 点击"保存并继续"
4. 在"范围"页面，点击"保存并继续"
5. 在"测试用户"页面，可以添加测试邮箱
6. 点击"保存并继续"

## 步骤6：创建OAuth客户端ID
1. 返回"凭据"页面
2. 点击"+ 创建凭据" > "OAuth 客户端 ID"
3. 应用类型选择："Web 应用"
4. 名称：Job Analyzer Web Client
5. 已获授权的重定向URI，添加：
   - http://localhost:3000/api/auth/google/callback
   - 如果没有域名，暂时只添加localhost的URI
6. 点击"创建"

## 步骤7：保存凭据
创建成功后会显示：
- 客户端ID (GOOGLE_CLIENT_ID)
- 客户端密钥 (GOOGLE_CLIENT_SECRET)

请妥善保存这些信息！

## 关于域名的解决方案

### 选项1：开发阶段仅使用localhost
- 在开发阶段，只使用 `http://localhost:3000/api/auth/google/callback`
- 这对本地开发完全够用

### 选项2：使用AWS提供的临时域名
当部署到AWS ECS后，你会获得一个公网IP，可以临时使用：
- `http://[AWS-PUBLIC-IP]:3000/api/auth/google/callback`
- 部署后再回来添加这个URI

### 选项3：使用免费域名服务
1. **使用ngrok（临时解决方案）**：
   ```bash
   # 安装ngrok
   # 运行：ngrok http 3000
   # 会得到类似：https://abc123.ngrok.io
   ```

2. **使用免费DNS服务**：
   - DuckDNS: https://www.duckdns.org/
   - No-IP: https://www.noip.com/
   - 可以创建类似 `yourapp.duckdns.org` 的免费子域名

### 选项4：使用AWS Route 53（推荐生产环境）
1. 购买域名（约$12/年）
2. 或使用AWS提供的负载均衡器DNS名称

## 更新OAuth重定向URI的时机

1. **本地开发**：使用 `http://localhost:3000/api/auth/google/callback`
2. **部署到AWS后**：
   - 获取AWS公网IP或负载均衡器地址
   - 返回Google Console添加新的重定向URI
3. **获得域名后**：
   - 添加 `https://yourdomain.com/api/auth/google/callback`
   - 移除不需要的临时URI

## 下一步
1. 按照上述步骤创建OAuth凭据
2. 将获得的Client ID和Secret保存好
3. 在运行 `create-secrets.sh` 脚本时使用这些凭据
4. 部署后再回来更新重定向URI

## 注意事项
- Google OAuth在开发阶段支持localhost
- 生产环境建议使用HTTPS和正式域名
- 可以随时在Google Console中更新重定向URI
- 一个OAuth客户端可以配置多个重定向URI