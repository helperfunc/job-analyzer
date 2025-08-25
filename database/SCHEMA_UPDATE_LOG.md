# 数据库架构更新日志

## 最新更新 (2025-08-18)

### ✅ 已更新到 complete-schema.sql

所有新增的用户系统相关SQL语句已经全部添加到 `complete-schema.sql` 文件中。

### 新增表结构

1. **用户系统核心表**
   - `users` - 用户基本信息表
   - `user_sessions` - 用户会话管理表
   - `user_bookmarks` - 用户收藏表（支持收藏jobs、papers、resources）
   - `user_resources` - 用户创建的资源表（支持公开/私有设置）

2. **社交互动表**
   - `comments` - 评论系统（支持对所有内容类型的评论和回复）
   - `votes` - 投票系统（点赞/点踩功能）
   - `user_follows` - 用户关注系统
   - `notifications` - 通知系统

3. **之前已有的多对多关系表**
   - `job_resource_relations` - job_resources与jobs的多对多关系
   - `interview_resource_relations` - interview_resources与jobs的多对多关系

### 新增索引

为所有新表添加了必要的索引以优化查询性能：
- 用户名和邮箱的唯一索引
- 外键关系索引
- 时间戳索引（用于排序）
- GIN索引（用于标签搜索）

### 新增触发器

1. `update_resource_stats()` - 自动更新用户资源的收藏计数
2. `update_comment_votes()` - 自动更新评论的投票计数
3. 为所有带有updated_at字段的表添加了自动更新触发器

### 新增约束

- 唯一约束防止重复数据（如重复收藏、重复投票）
- CHECK约束确保数据有效性（如投票只能是1或-1）
- 外键约束确保数据完整性（CASCADE删除）

### 权限设置

为所有新表授予了必要的权限：
- postgres用户：完全权限
- authenticated用户：完全权限（用于登录用户）
- anon用户：根据需要设置（注释掉的RLS策略）

### 使用说明

1. **执行完整架构**
   ```sql
   -- 在Supabase SQL编辑器中执行
   -- 复制 complete-schema.sql 的全部内容并运行
   ```

2. **验证表创建**
   ```sql
   -- 检查用户系统表是否创建成功
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'user_sessions', 'user_bookmarks', 
                      'user_resources', 'comments', 'votes', 
                      'user_follows', 'notifications');
   ```

3. **设置环境变量**
   在 `.env.local` 文件中添加：
   ```
   JWT_SECRET=your-secure-jwt-secret-key
   ```

### 注意事项

1. **RLS策略**：目前RLS策略被注释掉了，如果需要启用，请根据Supabase的auth.uid()函数调整策略

2. **密码安全**：用户密码使用bcrypt加密存储，确保安全性

3. **会话管理**：使用JWT token和数据库会话表双重验证

4. **数据完整性**：所有外键都设置了CASCADE删除，确保数据一致性

### 下一步计划

- [ ] 实现推荐算法（基于用户行为）
- [ ] 添加全文搜索功能
- [ ] 实现实时通知（WebSocket）
- [ ] 添加数据分析视图