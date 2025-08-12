# Research 模块快速开始

## 无需数据库配置即可体验

Research模块现在支持模拟数据模式，即使没有配置Supabase也能体验全部功能！

### 1. 启动项目
```bash
npm run dev
```

### 2. 访问Research模块
打开浏览器访问: http://localhost:3000/research

### 3. 功能体验

#### Papers & Research（论文研究）
- 查看AI领域重要论文列表
- 包含来自Google、OpenAI、Anthropic的经典论文
- 点击链接查看论文详情

#### My Insights（个人见解）
- 添加笔记（Note）：记录学习心得
- 添加资源（Resource）：保存有用的链接
- 添加经验（Experience）：分享相关经验

#### Skill Gap Analysis（技能差距分析）
- 输入你的技能列表（如：Python, PyTorch）
- 系统会分析与目标职位的差距
- 显示技能匹配百分比
- 提供学习建议

## 配置真实数据库

如需使用完整功能，请配置Supabase：

1. 注册Supabase账号
2. 创建新项目
3. 运行SQL脚本：
   - `database/schema.sql`
   - `database/research-schema.sql`
4. 在`.env.local`添加配置：
   ```
   NEXT_PUBLIC_SUPABASE_URL=你的URL
   SUPABASE_ANON_KEY=你的密钥
   ```

## 示例使用场景

### 场景1：准备面试
1. 查看目标公司发表的论文
2. 添加需要重点学习的论文笔记
3. 进行技能差距分析
4. 根据推荐制定学习计划

### 场景2：技能提升
1. 输入当前技能
2. 查看与理想职位的差距
3. 浏览相关论文和资源
4. 记录学习进度

## 常见问题

**Q: 为什么看到"使用模拟数据"的提示？**
A: 这表示系统正在使用预设的示例数据，配置数据库后会自动切换到真实数据。

**Q: 如何关联论文到特定职位？**
A: 从职位详情页点击"Research"按钮，会自动筛选相关论文。

**Q: 技能分析的结果准确吗？**
A: 模拟数据模式下显示的是示例分析，配置OpenAI API后会提供AI驱动的真实分析。