# AI 职位分析器 MVP
<img width="1900" height="3590" alt="localhost" src="https://github.com/user-attachments/assets/f58cf97b-0629-4410-9666-b7a350325382" />

一个简单的职位分析工具，帮你快速了解职位的薪资范围和技能要求。

## 功能特点

- 🔗 输入职位URL，自动解析职位信息
- 💰 显示薪资范围（特别是加州地区的职位）
- 🛠 提取所需技能列表
- 🚀 快速部署，2周内上线

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/job-analyzer.git
cd job-analyzer
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
```

### 3. 配置环境变量

复制 `.env.local.example` 到 `.env.local` 并填写你的API密钥：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`:

```
OPENAI_API_KEY=你的OpenAI API密钥
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL（可选）
SUPABASE_ANON_KEY=你的Supabase匿名密钥（可选）
```

### 4. 设置数据库（可选）

如果你想使用数据库功能：

1. 注册 [Supabase](https://supabase.com) 账号
2. 创建新项目
3. 运行 `database/schema.sql` 中的SQL语句
4. 将Supabase的URL和密钥添加到 `.env.local`

### 5. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入你的仓库
3. 配置环境变量
4. 点击部署

## 技术栈

- **前端**: Next.js, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **AI**: OpenAI GPT-3.5
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel

## 项目结构

```
job-analyzer/
├── pages/
│   ├── api/
│   │   └── analyze.ts    # 职位分析API
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx         # 主页面
├── lib/
│   └── supabase.ts       # 数据库连接
├── database/
│   └── schema.sql        # 数据库结构
├── styles/
│   └── globals.css       # 全局样式
└── package.json
```

## 成本估算

- Vercel: 免费套餐
- Supabase: 免费套餐
- OpenAI API: ~$10-50/月（取决于使用量）
- 域名: $12/年

**总计: < $50/月**

## 后续计划

### Phase 2 (第3-4周)
- 批量分析功能
- 技能趋势图表
- 职位对比功能
- CSV导出

### Phase 3 (第5-6周)
- 用户注册/登录
- 收藏职位
- 申请跟踪
- 个人看板

### Phase 4 (第7-8周)
- 智能推荐
- 薪资预测
- 技能差距分析

## 贡献

欢迎提交 Pull Request 或创建 Issue！

## 许可证

MIT
