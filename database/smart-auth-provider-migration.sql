-- Smart migration that handles both TEXT and UUID user_id columns
-- This migration safely converts all user_id columns to UUID and sets up auth provider mapping

-- 1. Create the auth provider mapping table first
CREATE TABLE IF NOT EXISTS user_auth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'local', etc.
    provider_user_id TEXT NOT NULL, -- The ID from the auth provider
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique provider + provider_user_id combination
    UNIQUE(provider, provider_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_auth_providers_user_id ON user_auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_providers_provider ON user_auth_providers(provider);
CREATE INDEX IF NOT EXISTS idx_user_auth_providers_provider_user_id ON user_auth_providers(provider_user_id);

-- 2. Insert demo user if not exists
INSERT INTO users (id, username, email, password_hash, display_name, is_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'demo_user',
    'demo@example.com',
    'no_password_oauth_user',
    'Demo User',
    true
) ON CONFLICT (id) DO NOTHING;

-- Map the demo user auth providers
INSERT INTO user_auth_providers (user_id, provider, provider_user_id)
VALUES 
    ('00000000-0000-0000-0000-000000000001'::uuid, 'demo', 'demo-user'),
    ('00000000-0000-0000-0000-000000000001'::uuid, 'demo', 'default')
ON CONFLICT (provider, provider_user_id) DO NOTHING;

-- 3. Create helper function that handles both TEXT and UUID inputs
CREATE OR REPLACE FUNCTION get_or_create_user_uuid(input_user_id TEXT)
RETURNS UUID AS $$
DECLARE
    result_uuid UUID;
    provider_name TEXT;
BEGIN
    -- Check if it's already a valid UUID
    BEGIN
        result_uuid := input_user_id::UUID;
        RETURN result_uuid;
    EXCEPTION
        WHEN invalid_text_representation THEN
            -- Not a UUID, continue to mapping logic
            NULL;
    END;
    
    -- Check if mapping already exists
    SELECT user_id INTO result_uuid
    FROM user_auth_providers
    WHERE provider_user_id = input_user_id
    LIMIT 1;
    
    IF result_uuid IS NOT NULL THEN
        RETURN result_uuid;
    END IF;
    
    -- Determine provider from ID format
    IF input_user_id LIKE 'google-%' THEN
        provider_name := 'google';
    ELSIF input_user_id LIKE 'github-%' THEN
        provider_name := 'github';
    ELSIF input_user_id IN ('demo-user', 'default') THEN
        -- Return demo user UUID
        RETURN '00000000-0000-0000-0000-000000000001'::uuid;
    ELSE
        provider_name := 'migrated';
    END IF;
    
    -- Create new user
    INSERT INTO users (username, email, password_hash, display_name, is_verified)
    VALUES (
        input_user_id,
        input_user_id || '@migrated.local',
        'oauth_no_password',
        input_user_id,
        true
    ) RETURNING id INTO result_uuid;
    
    -- Create mapping
    INSERT INTO user_auth_providers (user_id, provider, provider_user_id)
    VALUES (result_uuid, provider_name, input_user_id);
    
    RETURN result_uuid;
END;
$$ LANGUAGE plpgsql;

-- 4. Check and update each table based on its current column type
DO $$ 
DECLARE
    col_type TEXT;
    table_record RECORD;
    has_default BOOLEAN;
BEGIN
    -- List of tables that need user_id as UUID with foreign key
    FOR table_record IN 
        SELECT unnest(ARRAY[
            'user_resources',
            'job_thoughts',
            'paper_insights',
            'interview_resources',
            'job_resources',
            'skill_gaps',
            'user_insights',
            'user_saved_papers',
            'resource_thoughts'
        ]) AS table_name
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_record.table_name) THEN
            -- Get current column type
            SELECT data_type INTO col_type
            FROM information_schema.columns
            WHERE table_name = table_record.table_name 
            AND column_name = 'user_id';
            
            -- Check if column has a default value
            SELECT column_default IS NOT NULL INTO has_default
            FROM information_schema.columns
            WHERE table_name = table_record.table_name 
            AND column_name = 'user_id';
            
            IF col_type = 'text' OR col_type = 'character varying' THEN
                -- Column is TEXT, needs conversion
                RAISE NOTICE 'Converting %.user_id from TEXT to UUID', table_record.table_name;
                
                -- Drop existing constraints
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_user_id_fkey', 
                    table_record.table_name, table_record.table_name);
                
                -- Remove default BEFORE type conversion (only if it exists)
                IF has_default THEN
                    RAISE NOTICE 'Removing default value from %.user_id', table_record.table_name;
                    EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id DROP DEFAULT', table_record.table_name);
                END IF;
                
                -- Convert column to UUID
                EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id TYPE UUID USING get_or_create_user_uuid(user_id)', 
                    table_record.table_name);
                
                -- Add foreign key
                EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE', 
                    table_record.table_name, table_record.table_name);
                
            ELSIF col_type = 'uuid' THEN
                -- Column is already UUID, just ensure foreign key exists
                RAISE NOTICE '%.user_id is already UUID, ensuring foreign key exists', table_record.table_name;
                
                -- Drop and recreate foreign key to ensure it's correct
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_user_id_fkey', 
                    table_record.table_name, table_record.table_name);
                EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE', 
                    table_record.table_name, table_record.table_name);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 5. Create backward compatibility view for user_resources
CREATE OR REPLACE VIEW user_resources_compat AS
SELECT 
    ur.*,
    uap.provider_user_id as text_user_id
FROM user_resources ur
LEFT JOIN user_auth_providers uap ON ur.user_id = uap.user_id;

-- 6. Grant permissions
GRANT ALL ON user_auth_providers TO postgres;
GRANT ALL ON user_auth_providers TO authenticated;
GRANT SELECT ON user_auth_providers TO anon;

-- 7. Clean up the helper function (optional, uncomment if you want to remove it)
-- DROP FUNCTION IF EXISTS get_or_create_user_uuid(TEXT);

-- Done! This migration:
-- - Creates the auth provider mapping table
-- - Safely converts all TEXT user_id columns to UUID
-- - Ensures all foreign key constraints are properly set
-- - Handles tables that already have UUID columns
-- - Creates mappings for existing text-based user IDs