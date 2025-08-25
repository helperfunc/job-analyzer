-- Create table for job personal thoughts/insights
CREATE TABLE IF NOT EXISTS job_thoughts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'default',
  thought_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'pros', 'cons', 'questions', 'preparation'
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
  is_interested BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_job_thoughts_job_id ON job_thoughts(job_id);
CREATE INDEX idx_job_thoughts_user_id ON job_thoughts(user_id);

-- Create table for paper personal thoughts/insights (update existing paper_insights table)
-- First check if paper_insights exists and has the right structure
DO $$ 
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'paper_insights' 
                 AND column_name = 'thought_type') THEN
    ALTER TABLE paper_insights 
    ADD COLUMN thought_type TEXT NOT NULL DEFAULT 'general';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'paper_insights' 
                 AND column_name = 'rating') THEN
    ALTER TABLE paper_insights 
    ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'paper_insights' 
                 AND column_name = 'relevance_to_career') THEN
    ALTER TABLE paper_insights 
    ADD COLUMN relevance_to_career INTEGER CHECK (relevance_to_career >= 1 AND relevance_to_career <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'paper_insights' 
                 AND column_name = 'implementation_difficulty') THEN
    ALTER TABLE paper_insights 
    ADD COLUMN implementation_difficulty INTEGER CHECK (implementation_difficulty >= 1 AND implementation_difficulty <= 5);
  END IF;
END $$;

-- Add updated_at trigger for job_thoughts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_thoughts_updated_at BEFORE UPDATE
    ON job_thoughts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE job_thoughts IS 'Stores personal thoughts and insights about job positions';
COMMENT ON COLUMN job_thoughts.thought_type IS 'Type of thought: general, pros, cons, questions, preparation';
COMMENT ON COLUMN job_thoughts.rating IS 'Personal rating of the job from 1-5 stars';
COMMENT ON COLUMN job_thoughts.is_interested IS 'Whether the user is interested in this position';

COMMENT ON COLUMN paper_insights.thought_type IS 'Type of thought: general, key_takeaway, application, critique';
COMMENT ON COLUMN paper_insights.rating IS 'Personal rating of the paper from 1-5 stars';
COMMENT ON COLUMN paper_insights.relevance_to_career IS 'How relevant is this paper to career goals (1-5)';
COMMENT ON COLUMN paper_insights.implementation_difficulty IS 'How difficult to implement the ideas (1-5)';