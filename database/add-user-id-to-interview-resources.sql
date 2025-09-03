-- Add user_id column to interview_resources table
ALTER TABLE interview_resources 
ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default';

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_interview_resources_user_id ON interview_resources(user_id);

-- Update any existing records to use 'default' user_id (already done by default value)
-- But if you want to update to a specific user, you can uncomment and modify:
-- UPDATE interview_resources SET user_id = 'your-user-id' WHERE user_id = 'default';