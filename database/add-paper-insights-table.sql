-- Add paper_insights table for storing user insights about research papers
-- Run this SQL in your Supabase SQL editor

-- Create the paper_insights table
CREATE TABLE IF NOT EXISTS paper_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    insight TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('note', 'analysis', 'relevance', 'application', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_paper_insights_paper_id ON paper_insights(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_insights_user_id ON paper_insights(user_id);

-- Create update trigger for updated_at column
CREATE TRIGGER update_paper_insights_updated_at 
    BEFORE UPDATE ON paper_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON paper_insights TO postgres;
GRANT ALL ON paper_insights TO authenticated;
GRANT ALL ON paper_insights TO anon;