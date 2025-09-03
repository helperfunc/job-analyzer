-- Create resource_thoughts table
CREATE TABLE IF NOT EXISTS resource_thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default',
    username TEXT,
    thought_type TEXT NOT NULL DEFAULT 'general' CHECK (thought_type IN ('general', 'pros', 'cons', 'questions', 'experience')),
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_helpful BOOLEAN DEFAULT true,
    visibility VARCHAR(10) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resource_thoughts_resource_id ON resource_thoughts(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_thoughts_user_id ON resource_thoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_thoughts_created_at ON resource_thoughts(created_at DESC);

-- Add comments
COMMENT ON TABLE resource_thoughts IS 'Stores user thoughts and feedback on resources';
COMMENT ON COLUMN resource_thoughts.thought_type IS 'Type of thought: general, pros, cons, questions, experience';
COMMENT ON COLUMN resource_thoughts.rating IS 'User rating of the resource from 1-5 stars';
COMMENT ON COLUMN resource_thoughts.is_helpful IS 'Whether the user found the resource helpful';
COMMENT ON COLUMN resource_thoughts.visibility IS 'Visibility setting: public, private, or friends only';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_resource_thoughts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_thoughts_updated_at
    BEFORE UPDATE ON resource_thoughts
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_thoughts_updated_at();