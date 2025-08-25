-- =============================================
-- 添加资源与职位的多对多关联表
-- 允许一个资源链接到多个职位
-- =============================================

-- 1. 创建 job_resource_relations 表 (用于 job_resources)
CREATE TABLE IF NOT EXISTS job_resource_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES job_resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, resource_id)
);

-- 2. 创建 interview_resource_relations 表 (用于 interview_resources)
CREATE TABLE IF NOT EXISTS interview_resource_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES interview_resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, resource_id)
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_job_resource_relations_job_id ON job_resource_relations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_resource_relations_resource_id ON job_resource_relations(resource_id);
CREATE INDEX IF NOT EXISTS idx_interview_resource_relations_job_id ON interview_resource_relations(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_resource_relations_resource_id ON interview_resource_relations(resource_id);

-- 4. 授予权限
GRANT ALL ON job_resource_relations TO postgres;
GRANT ALL ON job_resource_relations TO authenticated;
GRANT ALL ON job_resource_relations TO anon;
GRANT ALL ON job_resource_relations TO service_role;

GRANT ALL ON interview_resource_relations TO postgres;
GRANT ALL ON interview_resource_relations TO authenticated;
GRANT ALL ON interview_resource_relations TO anon;
GRANT ALL ON interview_resource_relations TO service_role;

-- 5. 启用 RLS
ALTER TABLE job_resource_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_resource_relations ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略
CREATE POLICY "Enable all operations for all users" ON job_resource_relations
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON interview_resource_relations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. 显示成功消息
SELECT 'Resource-Job relation tables created successfully!' as message;