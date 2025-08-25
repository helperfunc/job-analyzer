-- =============================================
-- 用户系统数据库架构
-- 支持用户注册、收藏、评论、点赞等功能
-- =============================================

-- 1. 用户表
CREATE TABLE users (
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
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 2. 用户会话表（用于登录状态管理）
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为user_sessions表创建索引
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- 3. 用户收藏表（工作和论文）
CREATE TABLE user_bookmarks (
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
CREATE INDEX idx_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX idx_bookmarks_type ON user_bookmarks(bookmark_type);
CREATE INDEX idx_bookmarks_job_id ON user_bookmarks(job_id);
CREATE INDEX idx_bookmarks_paper_id ON user_bookmarks(paper_id);

-- 4. 用户创建的资源（支持公开/私有）
CREATE TABLE user_resources (
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
CREATE INDEX idx_user_resources_user_id ON user_resources(user_id);
CREATE INDEX idx_user_resources_visibility ON user_resources(visibility);
CREATE INDEX idx_user_resources_type ON user_resources(resource_type);
CREATE INDEX idx_user_resources_category ON user_resources(category);
CREATE INDEX idx_user_resources_tags ON user_resources USING GIN(tags);

-- 5. 评论系统
CREATE TABLE comments (
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
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_target_type ON comments(target_type);
CREATE INDEX idx_comments_job_id ON comments(job_id);
CREATE INDEX idx_comments_paper_id ON comments(paper_id);
CREATE INDEX idx_comments_user_resource_id ON comments(user_resource_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- 6. 投票系统（点赞/点踩）
CREATE TABLE votes (
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
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_target_type ON votes(target_type);
CREATE INDEX idx_votes_job_id ON votes(job_id);
CREATE INDEX idx_votes_paper_id ON votes(paper_id);
CREATE INDEX idx_votes_comment_id ON votes(comment_id);

-- 7. 用户关注系统
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 防止用户关注自己和重复关注
    CHECK (follower_id != followed_id),
    UNIQUE(follower_id, followed_id)
);

-- 为user_follows表创建索引
CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_followed ON user_follows(followed_id);

-- 8. 用户通知系统
CREATE TABLE notifications (
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
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================
-- 触发器：自动更新计数和时间戳
-- =============================================

-- 更新user_resources的统计信息
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

-- 更新评论的投票计数
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

-- =============================================
-- RLS (Row Level Security) 策略
-- =============================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和编辑自己的数据
CREATE POLICY user_own_data ON users FOR ALL USING (auth.uid()::text = id::text);
CREATE POLICY user_sessions_policy ON user_sessions FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY user_bookmarks_policy ON user_bookmarks FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY user_notifications_policy ON notifications FOR ALL USING (auth.uid()::text = user_id::text);

-- 用户资源的可见性策略
CREATE POLICY user_resources_owner ON user_resources FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY user_resources_public ON user_resources FOR SELECT USING (visibility = 'public');

-- 评论的可见性策略
CREATE POLICY comments_public_read ON comments FOR SELECT USING (NOT is_deleted);
CREATE POLICY comments_owner_write ON comments FOR ALL USING (auth.uid()::text = user_id::text);

-- 投票策略
CREATE POLICY votes_owner ON votes FOR ALL USING (auth.uid()::text = user_id::text);

-- 关注策略
CREATE POLICY follows_public ON user_follows FOR SELECT TO authenticated;
CREATE POLICY follows_owner ON user_follows FOR ALL USING (
    auth.uid()::text = follower_id::text OR auth.uid()::text = followed_id::text
);