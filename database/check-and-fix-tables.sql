-- =============================================
-- 检查并修复所有可能缺失的表
-- =============================================

-- 显示当前数据库中的所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 检查必需的表是否存在
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    tbl_name TEXT;
BEGIN
    -- 检查 jobs 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'jobs') THEN
        missing_tables := array_append(missing_tables, 'jobs');
    END IF;
    
    -- 检查 research_papers 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'research_papers') THEN
        missing_tables := array_append(missing_tables, 'research_papers');
    END IF;
    
    -- 检查 job_resources 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'job_resources') THEN
        missing_tables := array_append(missing_tables, 'job_resources');
    END IF;
    
    -- 检查 interview_resources 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'interview_resources') THEN
        missing_tables := array_append(missing_tables, 'interview_resources');
    END IF;
    
    -- 检查 job_thoughts 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'job_thoughts') THEN
        missing_tables := array_append(missing_tables, 'job_thoughts');
    END IF;
    
    -- 检查 paper_insights 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'paper_insights') THEN
        missing_tables := array_append(missing_tables, 'paper_insights');
    END IF;
    
    -- 检查 job_paper_relations 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'job_paper_relations') THEN
        missing_tables := array_append(missing_tables, 'job_paper_relations');
    END IF;
    
    -- 报告结果
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ 缺失的表: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ 所有必需的表都存在';
    END IF;
END
$$;

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 如果你看到 interview_resources 表缺失，运行以下命令创建它：
/*
CREATE TABLE interview_resources (
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

CREATE INDEX idx_interview_resources_job_id ON interview_resources(job_id);
CREATE INDEX idx_interview_resources_type ON interview_resources(resource_type);

CREATE TRIGGER update_interview_resources_updated_at 
    BEFORE UPDATE ON interview_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 授予权限
GRANT ALL ON interview_resources TO postgres;
GRANT ALL ON interview_resources TO authenticated;
GRANT ALL ON interview_resources TO anon;
GRANT ALL ON interview_resources TO service_role;

-- 启用 RLS
ALTER TABLE interview_resources ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Enable all operations for all users" ON interview_resources
    FOR ALL
    USING (true)
    WITH CHECK (true);
*/