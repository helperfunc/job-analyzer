-- 为jobs表添加user_id字段以支持多用户功能
-- 这个字段可选，null表示系统默认工作（爬取或管理员添加的）

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 为新字段创建索引
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- 为user_id字段添加注释
COMMENT ON COLUMN jobs.user_id IS 'User who created this job. NULL for system/scraped jobs.';

-- 授予必要权限
GRANT ALL ON jobs TO postgres;
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON jobs TO anon;
GRANT ALL ON jobs TO service_role;

-- 更新RLS策略（如果启用）
-- 注意：目前jobs表可能没有启用RLS，所以先检查
DO $$
BEGIN
    -- 检查是否已启用RLS
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'jobs' 
        AND relrowsecurity = true
    ) THEN
        -- 如果启用了RLS，创建相应策略
        
        -- 删除可能存在的旧策略
        DROP POLICY IF EXISTS "Enable all operations for all users" ON jobs;
        DROP POLICY IF EXISTS "Users can view all jobs" ON jobs;
        DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
        DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
        DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
        
        -- 查看政策：所有人可以查看所有工作
        CREATE POLICY "Users can view all jobs" ON jobs 
            FOR SELECT 
            TO authenticated, anon
            USING (true);
            
        -- 创建政策：已登录用户可以创建工作
        CREATE POLICY "Authenticated users can create jobs" ON jobs 
            FOR INSERT 
            TO authenticated
            WITH CHECK (true);
            
        -- 更新政策：用户只能更新自己的工作，或无主工作（系统工作）
        CREATE POLICY "Users can update own jobs or system jobs" ON jobs 
            FOR UPDATE 
            TO authenticated
            USING (user_id IS NULL OR user_id = auth.uid());
            
        -- 删除政策：用户只能删除自己的工作，或无主工作（系统工作）
        CREATE POLICY "Users can delete own jobs or system jobs" ON jobs 
            FOR DELETE 
            TO authenticated
            USING (user_id IS NULL OR user_id = auth.uid());
            
        -- 匿名用户的政策：只能查看
        CREATE POLICY "Anonymous users can view jobs" ON jobs 
            FOR SELECT 
            TO anon
            USING (true);
            
    END IF;
END $$;