-- =============================================
-- 修复 interview_resources 表缺失问题
-- =============================================

-- 1. 检查并创建 interview_resources 表
CREATE TABLE IF NOT EXISTS interview_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('preparation', 'question', 'experience', 'note', 'other')),
    content TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_interview_resources_job_id ON interview_resources(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_resources_type ON interview_resources(resource_type);

-- 3. 创建更新时间触发器（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_interview_resources_updated_at') THEN
        CREATE TRIGGER update_interview_resources_updated_at 
            BEFORE UPDATE ON interview_resources
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 4. 授予权限
GRANT ALL ON interview_resources TO postgres;
GRANT ALL ON interview_resources TO authenticated;
GRANT ALL ON interview_resources TO anon;
GRANT ALL ON interview_resources TO service_role;

-- 5. 启用 RLS (Row Level Security)
ALTER TABLE interview_resources ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略（允许所有操作）
CREATE POLICY "Enable all operations for all users" ON interview_resources
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. 验证表是否创建成功
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'interview_resources') THEN
        RAISE NOTICE '✅ interview_resources 表已成功创建';
    ELSE
        RAISE EXCEPTION '❌ interview_resources 表创建失败';
    END IF;
END
$$;