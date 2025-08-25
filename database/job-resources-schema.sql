-- Job Resources Schema Extensions

-- 1. 求职资源表（视频、文章、工具等）
CREATE TABLE IF NOT EXISTS job_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    resource_type TEXT CHECK (resource_type IN ('video', 'article', 'tool', 'course', 'book', 'other')),
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_job_resources_user ON job_resources(user_id);
CREATE INDEX idx_job_resources_type ON job_resources(resource_type);
CREATE INDEX idx_job_resources_rating ON job_resources(rating DESC);

-- 2. 刷题记录表
CREATE TABLE IF NOT EXISTS leetcode_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    problem_title TEXT NOT NULL,
    problem_url TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status TEXT CHECK (status IN ('todo', 'attempted', 'solved', 'revisit')),
    topics JSONB DEFAULT '[]'::jsonb, -- array of topics like ['array', 'dp', 'graph']
    notes TEXT,
    solution_url TEXT, -- link to your solution
    time_complexity TEXT,
    space_complexity TEXT,
    attempts INTEGER DEFAULT 1,
    last_attempted TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_leetcode_user ON leetcode_progress(user_id);
CREATE INDEX idx_leetcode_status ON leetcode_progress(status);
CREATE INDEX idx_leetcode_difficulty ON leetcode_progress(difficulty);

-- 3. 求职申请跟踪表
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    application_url TEXT,
    status TEXT CHECK (status IN ('interested', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn')),
    applied_date DATE,
    deadline DATE,
    salary_expectation TEXT,
    notes TEXT,
    contacts JSONB DEFAULT '[]'::jsonb, -- array of {name, role, email, linkedin}
    interview_rounds JSONB DEFAULT '[]'::jsonb, -- array of {date, type, interviewer, notes}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_applications_user ON job_applications(user_id);
CREATE INDEX idx_applications_status ON job_applications(status);
CREATE INDEX idx_applications_company ON job_applications(company);

-- 4. 学习计划表
CREATE TABLE IF NOT EXISTS learning_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    skill_gap_id UUID REFERENCES skill_gaps(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT CHECK (status IN ('planning', 'in_progress', 'completed', 'paused')),
    tasks JSONB DEFAULT '[]'::jsonb, -- array of {task, status, deadline}
    resources JSONB DEFAULT '[]'::jsonb, -- links to resources
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_learning_plans_user ON learning_plans(user_id);
CREATE INDEX idx_learning_plans_status ON learning_plans(status);

-- 5. 面试准备笔记表
CREATE TABLE IF NOT EXISTS interview_prep_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company TEXT,
    topic TEXT NOT NULL, -- e.g., 'behavioral', 'system design', 'coding'
    question TEXT,
    answer TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_interview_prep_user ON interview_prep_notes(user_id);
CREATE INDEX idx_interview_prep_company ON interview_prep_notes(company);
CREATE INDEX idx_interview_prep_topic ON interview_prep_notes(topic);

-- 更新触发器
CREATE TRIGGER update_job_resources_updated_at BEFORE UPDATE ON job_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leetcode_progress_updated_at BEFORE UPDATE ON leetcode_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_plans_updated_at BEFORE UPDATE ON learning_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_prep_notes_updated_at BEFORE UPDATE ON interview_prep_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();