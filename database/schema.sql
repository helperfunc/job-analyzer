-- 创建jobs表
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    company TEXT,
    title TEXT,
    location TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    description TEXT,
    requirements JSONB,
    skills JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建URL索引
CREATE INDEX idx_jobs_url ON jobs(url);

-- 创建公司索引
CREATE INDEX idx_jobs_company ON jobs(company);

-- 创建时间索引
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- 创建分析缓存表
CREATE TABLE IF NOT EXISTS analysis_cache (
    url TEXT PRIMARY KEY,
    parsed_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- 创建过期时间索引
CREATE INDEX idx_analysis_cache_expires ON analysis_cache(expires_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();