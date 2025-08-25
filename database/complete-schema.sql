-- =============================================
-- 完整的数据库架构初始化脚本
-- 包含所有必要的表和关系
-- =============================================

-- 1. 删除旧表（如果存在）避免结构冲突
DROP TABLE IF EXISTS project_recommendations CASCADE;
DROP TABLE IF EXISTS user_saved_papers CASCADE;
DROP TABLE IF EXISTS skill_gaps CASCADE;
DROP TABLE IF EXISTS job_thoughts CASCADE;
DROP TABLE IF EXISTS interview_resources CASCADE;
DROP TABLE IF EXISTS job_resources CASCADE;
DROP TABLE IF EXISTS job_paper_relations CASCADE;
DROP TABLE IF EXISTS user_insights CASCADE;
DROP TABLE IF EXISTS paper_insights CASCADE;
DROP TABLE IF EXISTS research_papers CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS analysis_cache CASCADE;

-- 2. 创建主要的jobs表（修正后的结构）
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    department TEXT,  -- 添加了department字段
    salary TEXT,      -- 添加了salary文本字段
    salary_min INTEGER,
    salary_max INTEGER,
    skills TEXT[],    -- 改为TEXT数组而不是JSONB
    description TEXT,
    url TEXT,         -- 改为可选字段
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 创建该工作的用户，NULL表示系统工作
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为jobs表创建索引
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_department ON jobs(department);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- 3. 创建研究论文表 (使用JSONB以获得更好性能)
CREATE TABLE research_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    authors JSONB DEFAULT '[]'::jsonb,
    publication_date DATE,
    abstract TEXT,
    url TEXT UNIQUE NOT NULL, -- 添加UNIQUE约束支持upsert
    arxiv_id TEXT,
    github_url TEXT,
    company TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 创建该paper的用户，NULL表示系统paper
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为research_papers表创建索引
CREATE INDEX idx_papers_company ON research_papers(company);
CREATE INDEX idx_papers_publication_date ON research_papers(publication_date DESC);
CREATE INDEX idx_papers_url ON research_papers(url);
CREATE INDEX idx_papers_arxiv ON research_papers(arxiv_id);
CREATE INDEX idx_papers_user_id ON research_papers(user_id);

-- 4. 创建job和paper的关联表
CREATE TABLE job_paper_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
    relevance_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, paper_id)
);

-- 为关联表创建索引
CREATE INDEX idx_relations_job_id ON job_paper_relations(job_id);
CREATE INDEX idx_relations_paper_id ON job_paper_relations(paper_id);

-- 5. 创建用户洞察表
CREATE TABLE user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('note', 'resource', 'experience')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为user_insights表创建索引
CREATE INDEX idx_insights_job_id ON user_insights(job_id);
CREATE INDEX idx_insights_user_id ON user_insights(user_id);

-- 6. 创建研究论文洞察表 (增强版，包含评分和类型)
CREATE TABLE paper_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    insight TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('note', 'analysis', 'relevance', 'application', 'other')),
    thought_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'key_takeaway', 'application', 'critique'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
    relevance_to_career INTEGER CHECK (relevance_to_career >= 1 AND relevance_to_career <= 5),
    implementation_difficulty INTEGER CHECK (implementation_difficulty >= 1 AND implementation_difficulty <= 5),
    visibility VARCHAR(10) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为paper_insights表创建索引
CREATE INDEX idx_paper_insights_paper_id ON paper_insights(paper_id);
CREATE INDEX idx_paper_insights_user_id ON paper_insights(user_id);

-- 7. 创建job个人想法表
CREATE TABLE job_thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL DEFAULT 'default',
    thought_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'pros', 'cons', 'questions', 'preparation'
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
    is_interested BOOLEAN DEFAULT true,
    visibility VARCHAR(10) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为job_thoughts表创建索引
CREATE INDEX idx_job_thoughts_job_id ON job_thoughts(job_id);
CREATE INDEX idx_job_thoughts_user_id ON job_thoughts(user_id);

-- 8. 创建interview资源表
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

-- 为interview_resources表创建索引
CREATE INDEX idx_interview_resources_job_id ON interview_resources(job_id);
CREATE INDEX idx_interview_resources_type ON interview_resources(resource_type);

-- 9. 创建job资源表
CREATE TABLE job_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    description TEXT,
    resource_type TEXT CHECK (resource_type IN ('course', 'book', 'video', 'article', 'tool', 'preparation', 'question', 'experience', 'note', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为job_resources表创建索引
CREATE INDEX idx_resources_job_id ON job_resources(job_id);
CREATE INDEX idx_resources_user_id ON job_resources(user_id);

-- 10. 创建技能差距分析表
CREATE TABLE skill_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    required_skills JSONB DEFAULT '{}'::jsonb,
    current_skills JSONB DEFAULT '{}'::jsonb,
    gap_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- 为skill_gaps表创建索引
CREATE INDEX idx_skill_gaps_job_id ON skill_gaps(job_id);
CREATE INDEX idx_skill_gaps_user_id ON skill_gaps(user_id);

-- 11. 创建项目推荐表
CREATE TABLE project_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_gap_id UUID NOT NULL REFERENCES skill_gaps(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_time TEXT,
    resources JSONB DEFAULT '[]'::jsonb,
    implementation_guide TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为project_recommendations表创建索引
CREATE INDEX idx_project_rec_gap_id ON project_recommendations(skill_gap_id);
CREATE INDEX idx_project_rec_difficulty ON project_recommendations(difficulty);

-- 12. 创建用户收藏论文表
CREATE TABLE user_saved_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, paper_id)
);

-- 为user_saved_papers表创建索引
CREATE INDEX idx_saved_papers_user_id ON user_saved_papers(user_id);
CREATE INDEX idx_saved_papers_paper_id ON user_saved_papers(paper_id);
CREATE INDEX idx_saved_papers_job_id ON user_saved_papers(job_id);

-- 13. 创建分析缓存表（可选）
CREATE TABLE analysis_cache (
    url TEXT PRIMARY KEY,
    parsed_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- 为缓存表创建索引
CREATE INDEX idx_analysis_cache_expires ON analysis_cache(expires_at);

-- 14. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 15. 为所有需要的表添加更新时间触发器
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_papers_updated_at 
    BEFORE UPDATE ON research_papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insights_updated_at 
    BEFORE UPDATE ON user_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at 
    BEFORE UPDATE ON job_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_resources_updated_at 
    BEFORE UPDATE ON interview_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_insights_updated_at 
    BEFORE UPDATE ON paper_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_thoughts_updated_at 
    BEFORE UPDATE ON job_thoughts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_gaps_updated_at 
    BEFORE UPDATE ON skill_gaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. 创建一些有用的视图（可选）
CREATE OR REPLACE VIEW job_summary AS
SELECT 
    j.id,
    j.title,
    j.company,
    j.location,
    j.department,
    j.salary,
    j.salary_min,
    j.salary_max,
    COUNT(DISTINCT jpr.paper_id) as related_papers_count,
    COUNT(DISTINCT ui.id) as insights_count,
    COUNT(DISTINCT jr.id) as resources_count
FROM jobs j
LEFT JOIN job_paper_relations jpr ON j.id = jpr.job_id
LEFT JOIN user_insights ui ON j.id = ui.job_id
LEFT JOIN job_resources jr ON j.id = jr.job_id
GROUP BY j.id;

-- 17. 授予必要的权限（如果使用Supabase）
-- Supabase会自动处理RLS（行级安全），但这里是基本权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- 为特定用户角色授予权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 为匿名用户授予权限（Supabase需要）
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 17.5 启用行级安全（RLS）并创建策略
-- 为 interview_resources 表启用 RLS
ALTER TABLE interview_resources ENABLE ROW LEVEL SECURITY;

-- 创建 interview_resources 的 RLS 策略（允许所有操作）
CREATE POLICY "Enable all operations for all users" ON interview_resources
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 为 job_resources 表启用 RLS
ALTER TABLE job_resources ENABLE ROW LEVEL SECURITY;

-- 创建 job_resources 的 RLS 策略（允许所有操作）
CREATE POLICY "Enable all operations for all users" ON job_resources
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 为其他表也可以添加 RLS（根据需要）

-- 18. 创建资源与职位的多对多关联表
-- 允许一个资源链接到多个职位，解决资源共享问题

-- 创建 job_resource_relations 表 (用于 job_resources)
CREATE TABLE IF NOT EXISTS job_resource_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES job_resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, resource_id)
);

-- 创建 interview_resource_relations 表 (用于 interview_resources)
CREATE TABLE IF NOT EXISTS interview_resource_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES interview_resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, resource_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_job_resource_relations_job_id ON job_resource_relations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_resource_relations_resource_id ON job_resource_relations(resource_id);
CREATE INDEX IF NOT EXISTS idx_interview_resource_relations_job_id ON interview_resource_relations(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_resource_relations_resource_id ON interview_resource_relations(resource_id);

-- 授予权限
GRANT ALL ON job_resource_relations TO postgres;
GRANT ALL ON job_resource_relations TO authenticated;
GRANT ALL ON job_resource_relations TO anon;
GRANT ALL ON job_resource_relations TO service_role;

GRANT ALL ON interview_resource_relations TO postgres;
GRANT ALL ON interview_resource_relations TO authenticated;
GRANT ALL ON interview_resource_relations TO anon;
GRANT ALL ON interview_resource_relations TO service_role;

-- 启用 RLS
ALTER TABLE job_resource_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_resource_relations ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Enable all operations for all users" ON job_resource_relations
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON interview_resource_relations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 19. 添加表和字段注释
COMMENT ON TABLE job_thoughts IS 'Stores personal thoughts and insights about job positions';
COMMENT ON COLUMN job_thoughts.thought_type IS 'Type of thought: general, pros, cons, questions, preparation';
COMMENT ON COLUMN job_thoughts.rating IS 'Personal rating of the job from 1-5 stars';
COMMENT ON COLUMN job_thoughts.is_interested IS 'Whether the user is interested in this position';
COMMENT ON COLUMN job_thoughts.visibility IS 'Visibility setting: public, private, or friends only';

COMMENT ON COLUMN paper_insights.thought_type IS 'Type of thought: general, key_takeaway, application, critique';
COMMENT ON COLUMN paper_insights.rating IS 'Personal rating of the paper from 1-5 stars';
COMMENT ON COLUMN paper_insights.relevance_to_career IS 'How relevant is this paper to career goals (1-5)';
COMMENT ON COLUMN paper_insights.implementation_difficulty IS 'How difficult to implement the ideas (1-5)';
COMMENT ON COLUMN paper_insights.visibility IS 'Visibility setting: public, private, or friends only';

-- 添加更多表注释
COMMENT ON TABLE skill_gaps IS 'Stores skill gap analysis between job requirements and user current skills';
COMMENT ON TABLE project_recommendations IS 'AI-generated project recommendations to fill skill gaps';
COMMENT ON TABLE user_saved_papers IS 'Papers saved/bookmarked by users for specific jobs';
COMMENT ON TABLE projects IS 'User-created projects for tracking job search progress and goals';
COMMENT ON COLUMN projects.status IS 'Project status: planning, in_progress, completed, on_hold, cancelled';
COMMENT ON COLUMN projects.priority IS 'Project priority: low, medium, high';
COMMENT ON COLUMN projects.progress IS 'Project completion percentage (0-100)';

-- 添加新表注释
COMMENT ON TABLE job_resource_relations IS 'Many-to-many relationship table linking job_resources to multiple jobs';
COMMENT ON TABLE interview_resource_relations IS 'Many-to-many relationship table linking interview_resources to multiple jobs';

-- =============================================
-- 用户系统数据库架构
-- 支持用户注册、收藏、评论、点赞等功能
-- =============================================

-- 20. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    
    -- 用户状态
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    
    -- 用户偏好
    preferred_location TEXT,
    preferred_companies TEXT[],
    skills TEXT[],
    interests TEXT[],
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 为users表创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 21. 用户会话表（用于登录状态管理）
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为user_sessions表创建索引
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- 22. 用户收藏表（工作和论文）
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 支持收藏不同类型的内容
    bookmark_type VARCHAR(20) NOT NULL CHECK (bookmark_type IN ('job', 'paper', 'resource')),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    paper_id UUID REFERENCES research_papers(id) ON DELETE CASCADE,
    resource_id UUID, -- 可以是job_resources或interview_resources的ID
    resource_type VARCHAR(20), -- 'job_resource' 或 'interview_resource'
    
    -- 用户标记
    is_favorite BOOLEAN DEFAULT false,
    notes TEXT,
    tags TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保用户不能重复收藏同一个项目
    UNIQUE(user_id, bookmark_type, job_id),
    UNIQUE(user_id, bookmark_type, paper_id),
    UNIQUE(user_id, bookmark_type, resource_id, resource_type)
);

-- 为user_bookmarks表创建索引
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON user_bookmarks(bookmark_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_job_id ON user_bookmarks(job_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_paper_id ON user_bookmarks(paper_id);

-- 23. 用户创建的资源（支持公开/私有）
CREATE TABLE IF NOT EXISTS user_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    url TEXT,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('article', 'video', 'course', 'tool', 'note', 'project', 'other')),
    
    -- 可见性设置
    visibility VARCHAR(10) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    
    -- 标签和分类
    tags TEXT[],
    category TEXT,
    
    -- 统计信息
    view_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为user_resources表创建索引
CREATE INDEX IF NOT EXISTS idx_user_resources_user_id ON user_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resources_visibility ON user_resources(visibility);
CREATE INDEX IF NOT EXISTS idx_user_resources_type ON user_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_user_resources_category ON user_resources(category);
CREATE INDEX IF NOT EXISTS idx_user_resources_tags ON user_resources USING GIN(tags);

-- 24. 评论系统
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 支持对不同类型内容评论
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('job', 'paper', 'resource', 'user_resource')),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    paper_id UUID REFERENCES research_papers(id) ON DELETE CASCADE,
    resource_id UUID, -- job_resources或interview_resources的ID
    user_resource_id UUID REFERENCES user_resources(id) ON DELETE CASCADE,
    
    -- 评论内容
    content TEXT NOT NULL,
    
    -- 支持回复评论
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- 统计信息
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    
    -- 状态管理
    is_deleted BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为comments表创建索引
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_target_type ON comments(target_type);
CREATE INDEX IF NOT EXISTS idx_comments_job_id ON comments(job_id);
CREATE INDEX IF NOT EXISTS idx_comments_paper_id ON comments(paper_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_resource_id ON comments(user_resource_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 25. 投票系统（点赞/点踩）
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 投票目标
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('job', 'paper', 'resource', 'user_resource', 'comment')),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    paper_id UUID REFERENCES research_papers(id) ON DELETE CASCADE,
    resource_id UUID,
    user_resource_id UUID REFERENCES user_resources(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- 投票类型（1为赞，-1为踩）
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保每个用户对同一个项目只能投票一次
    UNIQUE(user_id, target_type, job_id),
    UNIQUE(user_id, target_type, paper_id),
    UNIQUE(user_id, target_type, resource_id),
    UNIQUE(user_id, target_type, user_resource_id),
    UNIQUE(user_id, target_type, comment_id)
);

-- 为votes表创建索引
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_target_type ON votes(target_type);
CREATE INDEX IF NOT EXISTS idx_votes_job_id ON votes(job_id);
CREATE INDEX IF NOT EXISTS idx_votes_paper_id ON votes(paper_id);
CREATE INDEX IF NOT EXISTS idx_votes_comment_id ON votes(comment_id);

-- 26. 用户关注系统
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 防止用户关注自己和重复关注
    CHECK (follower_id != followed_id),
    UNIQUE(follower_id, followed_id)
);

-- 为user_follows表创建索引
CREATE INDEX IF NOT EXISTS idx_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON user_follows(followed_id);

-- 27. 项目管理表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold', 'cancelled')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category VARCHAR(50) NOT NULL DEFAULT 'job_search',
    target_date DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    tags TEXT[],
    linked_jobs UUID[],
    linked_papers UUID[],
    linked_resources UUID[],
    notes TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为projects表创建索引
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 28. 用户通知系统
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 通知类型
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'new_comment', 'comment_reply', 'vote_received', 'new_follower', 
        'resource_shared', 'job_match', 'paper_match'
    )),
    
    -- 通知内容
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- 相关链接
    link_url TEXT,
    
    -- 通知状态
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    
    -- 相关用户（如谁点赞了、谁评论了等）
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 为notifications表创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================
-- 触发器：自动更新计数和时间戳
-- =============================================

-- 28. 更新user_resources的统计信息
CREATE OR REPLACE FUNCTION update_resource_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新bookmark_count
    UPDATE user_resources 
    SET bookmark_count = (
        SELECT COUNT(*) 
        FROM user_bookmarks 
        WHERE bookmark_type = 'resource' 
        AND resource_id::text = user_resources.id::text
    )
    WHERE id = CASE 
        WHEN TG_OP = 'INSERT' THEN NEW.resource_id::uuid
        WHEN TG_OP = 'DELETE' THEN OLD.resource_id::uuid
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（分别为INSERT和DELETE创建）
CREATE TRIGGER trigger_update_resource_stats_insert
    AFTER INSERT ON user_bookmarks
    FOR EACH ROW
    WHEN (NEW.bookmark_type = 'resource')
    EXECUTE FUNCTION update_resource_stats();

CREATE TRIGGER trigger_update_resource_stats_delete
    AFTER DELETE ON user_bookmarks
    FOR EACH ROW
    WHEN (OLD.bookmark_type = 'resource')
    EXECUTE FUNCTION update_resource_stats();

-- 29. 更新评论的投票计数
CREATE OR REPLACE FUNCTION update_comment_votes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE comments
    SET upvotes = (
        SELECT COUNT(*) FROM votes 
        WHERE comment_id = comments.id AND vote_type = 1
    ),
    downvotes = (
        SELECT COUNT(*) FROM votes 
        WHERE comment_id = comments.id AND vote_type = -1
    )
    WHERE id = CASE 
        WHEN TG_OP = 'INSERT' THEN NEW.comment_id
        WHEN TG_OP = 'DELETE' THEN OLD.comment_id
        WHEN TG_OP = 'UPDATE' THEN NEW.comment_id
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（分别创建以避免WHEN条件冲突）
CREATE TRIGGER trigger_update_comment_votes_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    WHEN (NEW.target_type = 'comment')
    EXECUTE FUNCTION update_comment_votes();

CREATE TRIGGER trigger_update_comment_votes_update
    AFTER UPDATE ON votes
    FOR EACH ROW
    WHEN (NEW.target_type = 'comment')
    EXECUTE FUNCTION update_comment_votes();

CREATE TRIGGER trigger_update_comment_votes_delete
    AFTER DELETE ON votes
    FOR EACH ROW
    WHEN (OLD.target_type = 'comment')
    EXECUTE FUNCTION update_comment_votes();

-- 30. 为用户系统表添加更新时间触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_resources_updated_at 
    BEFORE UPDATE ON user_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 授予权限
-- =============================================

-- 为用户系统表授予权限
GRANT ALL ON users TO postgres;
GRANT ALL ON user_sessions TO postgres;
GRANT ALL ON user_bookmarks TO postgres;
GRANT ALL ON user_resources TO postgres;
GRANT ALL ON comments TO postgres;
GRANT ALL ON votes TO postgres;
GRANT ALL ON user_follows TO postgres;
GRANT ALL ON notifications TO postgres;

GRANT ALL ON users TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON user_bookmarks TO authenticated;
GRANT ALL ON user_resources TO authenticated;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON votes TO authenticated;
GRANT ALL ON user_follows TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- =============================================
-- RLS (Row Level Security) 策略 - 如果需要的话
-- =============================================

-- 注意：以下RLS策略是示例，实际使用时需要根据Supabase的auth.uid()函数调整

-- 启用RLS (如果需要)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_resources ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 结束
-- 运行此脚本将创建完整的数据库结构，包括：
-- - 所有核心表：jobs, research_papers, job_paper_relations
-- - 用户交互表：job_thoughts, paper_insights, user_insights
-- - 资源表：job_resources, interview_resources
-- - 资源关系表：job_resource_relations, interview_resource_relations (多对多关系)
-- - AI功能表：skill_gaps, project_recommendations
-- - 用户功能表：user_saved_papers
-- - 用户系统表：users, user_sessions, user_bookmarks, user_resources, comments, votes, user_follows, notifications
-- - job_thoughts表：职位个人想法和评分
-- - 增强的paper_insights表：论文个人见解和多维评分
-- - 技能差距分析和项目推荐系统
-- - 资源共享功能：允许一个资源链接到多个职位