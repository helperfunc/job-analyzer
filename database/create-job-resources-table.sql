-- Create job_resources table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    description TEXT,
    resource_type TEXT CHECK (resource_type IN ('course', 'book', 'video', 'article', 'tool', 'preparation', 'question', 'experience', 'note', 'other')),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resources_job_id ON job_resources(job_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON job_resources(user_id);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resources_updated_at 
    BEFORE UPDATE ON job_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();