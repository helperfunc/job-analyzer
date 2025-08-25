-- Research Module Database Schema

-- 1. 研究论文表
CREATE TABLE IF NOT EXISTS research_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    authors JSONB DEFAULT '[]'::jsonb,
    publication_date DATE,
    abstract TEXT,
    url TEXT,
    arxiv_id TEXT,
    github_url TEXT,
    company TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_research_papers_company ON research_papers(company);
CREATE INDEX idx_research_papers_arxiv ON research_papers(arxiv_id);
CREATE INDEX idx_research_papers_date ON research_papers(publication_date DESC);

-- 创建唯一约束 (for upsert functionality)
ALTER TABLE research_papers ADD CONSTRAINT research_papers_url_unique UNIQUE (url);

-- 2. 职位-论文关联表
CREATE TABLE IF NOT EXISTS job_paper_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
    relevance_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, paper_id)
);

-- 创建索引
CREATE INDEX idx_job_paper_job ON job_paper_relations(job_id);
CREATE INDEX idx_job_paper_paper ON job_paper_relations(paper_id);
CREATE INDEX idx_job_paper_score ON job_paper_relations(relevance_score DESC);

-- 3. 用户见解表
CREATE TABLE IF NOT EXISTS user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- 暂时用session/email标识
    insight_type TEXT CHECK (insight_type IN ('note', 'resource', 'experience')),
    content TEXT NOT NULL,
    resources JSONB DEFAULT '[]'::jsonb, -- links, papers, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_insights_job ON user_insights(job_id);
CREATE INDEX idx_user_insights_user ON user_insights(user_id);
CREATE INDEX idx_user_insights_type ON user_insights(insight_type);

-- 4. 技能差距表
CREATE TABLE IF NOT EXISTS skill_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    required_skills JSONB DEFAULT '{}'::jsonb,
    current_skills JSONB DEFAULT '{}'::jsonb,
    gap_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- 创建索引
CREATE INDEX idx_skill_gaps_job ON skill_gaps(job_id);
CREATE INDEX idx_skill_gaps_user ON skill_gaps(user_id);

-- 5. 项目推荐表
CREATE TABLE IF NOT EXISTS project_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_gap_id UUID NOT NULL REFERENCES skill_gaps(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_time TEXT,
    resources JSONB DEFAULT '[]'::jsonb,
    implementation_guide TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_project_rec_gap ON project_recommendations(skill_gap_id);
CREATE INDEX idx_project_rec_difficulty ON project_recommendations(difficulty);

-- 6. 用户收藏的论文（可选）
CREATE TABLE IF NOT EXISTS user_saved_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, paper_id)
);

-- 创建索引
CREATE INDEX idx_saved_papers_user ON user_saved_papers(user_id);
CREATE INDEX idx_saved_papers_paper ON user_saved_papers(paper_id);

-- 更新触发器
CREATE TRIGGER update_research_papers_updated_at BEFORE UPDATE ON research_papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_insights_updated_at BEFORE UPDATE ON user_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_gaps_updated_at BEFORE UPDATE ON skill_gaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();