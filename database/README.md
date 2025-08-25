# 数据库初始化指南

## 🚀 快速开始

### 在 Supabase 中运行 SQL

1. **登录到你的 Supabase 项目**
   - 访问 https://app.supabase.com
   - 选择你的项目

2. **打开 SQL 编辑器**
   - 在左侧菜单中点击 "SQL Editor"
   - 点击 "New query" 创建新查询

3. **运行完整架构**
   - 复制 `complete-schema.sql` 的全部内容
   - 粘贴到 SQL 编辑器
   - 点击 "Run" 执行

## 📁 SQL 文件说明

### 主要文件（推荐使用）
- **`complete-schema.sql`** - ⭐ 完整的数据库架构，包含所有表和关系

### 其他文件（历史遗留）
- `schema.sql` - 旧版本的基础架构（不推荐）
- `research-schema.sql` - 研究功能相关表
- `job-resources-schema.sql` - 工作资源相关表
- `update-research-schema.sql` - 更新补丁

## 🏗️ 数据库结构

### 核心表
1. **jobs** - 工作职位信息
   - 包含: id, title, company, location, department, salary等
   - 修复了缺少department字段的问题

2. **research_papers** - 研究论文
   - 存储OpenAI和Anthropic的论文信息

3. **job_paper_relations** - 工作与论文的关联
   - 多对多关系表

4. **user_insights** - 用户洞察笔记
   - 用户对特定职位的想法和经验

5. **job_resources** - 工作相关资源
   - 学习资源、工具等

## ⚠️ 重要提示

1. **运行 `complete-schema.sql` 会删除现有表**
   - 如果你有重要数据，请先备份
   - 脚本包含 `DROP TABLE IF EXISTS` 语句

2. **如果只想修复 department 字段问题**
   ```sql
   ALTER TABLE jobs 
   ADD COLUMN IF NOT EXISTS department TEXT;
   ```

3. **检查表结构**
   ```sql
   -- 查看jobs表的所有列
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'jobs';
   ```

## 🔄 更新历史

- **2024-01** - 初始版本
- **2024-08** - 添加research功能表
- **2024-08-12** - 修复jobs表缺少department字段问题

## 💡 故障排除

### 常见错误

1. **"Could not find the 'department' column"**
   - 运行 `complete-schema.sql` 重建表结构

2. **外键约束错误**
   - 确保先导入jobs数据，再关联papers

3. **权限错误**
   - 检查Supabase的RLS策略设置

4. **"Could not find a relationship between 'job_paper_relations' and 'jobs'"**
   - 这是Supabase schema缓存问题
   - 解决方案：
     1. 在Supabase Dashboard -> SQL Editor 运行 `fix-foreign-keys.sql`
     2. 或运行: `NOTIFY pgrst, 'reload schema';`
     3. 或重启Supabase项目
   - 系统已自动处理此问题，使用备用查询方法

5. **Research页面JavaScript错误**
   - 如果看到 "jobSearchFilter is not defined"，请刷新页面
   - 已修复：在PapersTab组件中添加了缺失的状态变量