-- Create projects table
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

-- Create indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Add comments
COMMENT ON TABLE projects IS 'User-created projects for tracking job search progress and goals';
COMMENT ON COLUMN projects.status IS 'Project status: planning, in_progress, completed, on_hold, cancelled';
COMMENT ON COLUMN projects.priority IS 'Project priority: low, medium, high';
COMMENT ON COLUMN projects.progress IS 'Project completion percentage (0-100)';
COMMENT ON COLUMN projects.linked_jobs IS 'Array of job IDs associated with this project';
COMMENT ON COLUMN projects.linked_papers IS 'Array of paper IDs associated with this project';
COMMENT ON COLUMN projects.linked_resources IS 'Array of resource IDs associated with this project';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();