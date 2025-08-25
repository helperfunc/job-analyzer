-- Create the interview_resources table
-- This table was referenced in the code but missing from the database

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_resources_job_id ON interview_resources(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_resources_type ON interview_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_interview_resources_created_at ON interview_resources(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_interview_resources_updated_at 
    BEFORE UPDATE ON interview_resources
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();