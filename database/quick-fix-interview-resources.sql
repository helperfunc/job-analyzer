-- =============================================
-- 快速修复 interview_resources 表
-- 直接创建缺失的表，无需检查
-- =============================================

-- 1. 首先创建 update_updated_at_column 函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. 创建 interview_resources 表
CREATE TABLE IF NOT EXISTS interview_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('preparation', 'question', 'experience', 'note', 'other')),
    content TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 添加外键约束（如果 jobs 表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
        ALTER TABLE interview_resources 
        ADD CONSTRAINT interview_resources_job_id_fkey 
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_interview_resources_job_id ON interview_resources(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_resources_type ON interview_resources(resource_type);

-- 5. 创建触发器
DROP TRIGGER IF EXISTS update_interview_resources_updated_at ON interview_resources;
CREATE TRIGGER update_interview_resources_updated_at 
    BEFORE UPDATE ON interview_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 授予权限（Supabase 需要）
GRANT ALL ON interview_resources TO postgres;
GRANT ALL ON interview_resources TO authenticated;
GRANT ALL ON interview_resources TO anon;
GRANT ALL ON interview_resources TO service_role;

-- 7. 启用 Row Level Security
ALTER TABLE interview_resources ENABLE ROW LEVEL SECURITY;

-- 8. 创建 RLS 策略（允许所有用户所有操作）
DROP POLICY IF EXISTS "Enable all operations for all users" ON interview_resources;
CREATE POLICY "Enable all operations for all users" ON interview_resources
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 9. 显示成功消息
SELECT 'interview_resources 表已成功创建！' as message;