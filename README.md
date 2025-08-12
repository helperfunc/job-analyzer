# AI 求职助手 Job Search Assistant
<img width="1900" height="3590" alt="localhost" src="https://github.com/user-attachments/assets/f58cf97b-0629-4410-9666-b7a350325382" />

一个功能完整的AI驱动求职助手，帮助你系统性地准备求职，从技能分析到论文研究，成为你找工作路上的智能伙伴。

## ✨ 核心功能

### 📊 职位分析
- 🔗 自动抓取OpenAI和Anthropic最新职位
- 💰 薪资范围分析和排序
- 🛠 技能要求统计和趋势
- 🏢 公司对比分析

### 🎓 Research Center (核心功能)
- 📚 **论文研究**: 一键抓取OpenAI/Anthropic最新论文，了解技术前沿
- 🔗 **职位关联**: 将论文与职位建立关联，准备面试谈话要点
- 💡 **个人见解**: 记录对每个职位的想法、经验和学习心得
- 🎯 **技能差距分析**: AI分析你的技能与职位要求的差距，提供学习建议
- 🛠 **求职资源库**: 收集和管理视频、文章、工具等求职相关资源

### 🎯 智能分析
- 🤖 GPT-4驱动的技能差距分析
- 📈 个性化学习路径推荐
- 🎪 技能匹配度评分

## 快速开始

### 1. 克隆项目
wo
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
3. 在 `SQL Editor` 中依次运行以下SQL文件：
   - `database/schema.sql` (基础表结构)
   - `database/research-schema.sql` (研究功能表)
   - `database/job-resources-schema.sql` (求职资源表)
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

## 🎯 使用场景

### 准备申请顶级AI公司
1. **研究公司技术方向**: 抓取最新论文，了解公司研究重点
2. **分析职位要求**: 使用AI分析技能差距，制定学习计划
3. **收集学习资源**: 建立个人求职资源库
4. **记录学习心得**: 系统性记录面试准备过程

### 系统性技能提升
1. **技能盘点**: 全面分析当前能力水平
2. **对比分析**: 了解不同公司对同一技能的要求差异  
3. **资源整合**: 收集最优质的学习资源
4. **进度跟踪**: 记录学习进度和效果

## 🆕 最新功能

### Research Center
- ✅ 论文抓取和管理
- ✅ 职位-论文关联
- ✅ 个人见解和笔记
- ✅ AI技能差距分析
- ✅ 求职资源收藏

### 数据管理
- ✅ Supabase云端存储
- ✅ 本地数据缓存
- ✅ 用户数据隔离

## 🚀 后续计划

### 近期功能
- 面试问题库和答案准备
- 求职进度跟踪和提醒
- 简历关键词优化建议
- LeetCode刷题进度管理

### 未来愿景
- 求职社区和经验分享
- AI模拟面试和反馈
- 薪资谈判策略建议
- 职业发展路径规划

## 贡献

欢迎提交 Pull Request 或创建 Issue！

## 许可证

MIT
