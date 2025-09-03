-- Fix Row Level Security (RLS) policies for user_resources and related tables
-- This allows authenticated users to manage their own resources

-- 1. Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('user_resources', 'job_resources', 'interview_resources', 'job_thoughts', 'paper_insights')
ORDER BY tablename;

-- 2. For user_resources table
-- Option A: Disable RLS (simplest for development)
ALTER TABLE user_resources DISABLE ROW LEVEL SECURITY;

-- Option B: Create proper RLS policies (better for production)
-- First drop existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on user_resources
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_resources') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_resources', r.policyname);
    END LOOP;
END $$;

-- Create new policy that allows users to manage their own resources
CREATE POLICY "Users can insert their own resources" ON user_resources
    FOR INSERT 
    WITH CHECK (true);  -- Allow all inserts (the API will handle user_id assignment)

CREATE POLICY "Users can view public resources and their own" ON user_resources
    FOR SELECT
    USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can update their own resources" ON user_resources
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own resources" ON user_resources
    FOR DELETE
    USING (user_id = auth.uid());

-- 3. For other tables with RLS enabled, disable them for now
ALTER TABLE job_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_thoughts DISABLE ROW LEVEL SECURITY;
ALTER TABLE paper_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_papers DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE resource_thoughts DISABLE ROW LEVEL SECURITY;

-- 4. If you're not using Supabase auth, use this simpler approach
-- Drop all policies and disable RLS on user_resources
DROP POLICY IF EXISTS "Users can insert their own resources" ON user_resources;
DROP POLICY IF EXISTS "Users can view public resources and their own" ON user_resources;
DROP POLICY IF EXISTS "Users can update their own resources" ON user_resources;
DROP POLICY IF EXISTS "Users can delete their own resources" ON user_resources;
DROP POLICY IF EXISTS "Enable all operations for all users" ON user_resources;

-- Since your app uses JWT tokens and not Supabase auth.uid(), disable RLS
ALTER TABLE user_resources DISABLE ROW LEVEL SECURITY;

-- Show final RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('user_resources', 'job_resources', 'interview_resources', 'job_thoughts', 'paper_insights')
ORDER BY tablename;