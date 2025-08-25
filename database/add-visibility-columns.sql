-- Add visibility column to job_thoughts table
ALTER TABLE job_thoughts 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'public' 
CHECK (visibility IN ('public', 'private', 'friends'));

-- Add visibility column to paper_insights table  
ALTER TABLE paper_insights
ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'public'
CHECK (visibility IN ('public', 'private', 'friends'));

-- Add comments
COMMENT ON COLUMN job_thoughts.visibility IS 'Visibility setting: public, private, or friends only';
COMMENT ON COLUMN paper_insights.visibility IS 'Visibility setting: public, private, or friends only';