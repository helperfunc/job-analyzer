-- Test the UUID migration
-- This script helps verify the migration works correctly

-- First, show current state of user_id columns
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE column_name = 'user_id'
AND table_schema = 'public'
ORDER BY table_name;

-- Check if user_auth_providers table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_auth_providers'
) as auth_providers_table_exists;

-- Show any existing auth provider mappings (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_auth_providers') THEN
        RAISE NOTICE 'Auth provider mappings:';
        PERFORM * FROM user_auth_providers ORDER BY created_at DESC LIMIT 10;
    ELSE
        RAISE NOTICE 'user_auth_providers table does not exist yet';
    END IF;
END $$;

-- Check if users table exists and show demo user
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Demo user info:';
        PERFORM * FROM users WHERE username = 'demo_user';
    ELSE
        RAISE NOTICE 'users table does not exist';
    END IF;
END $$;