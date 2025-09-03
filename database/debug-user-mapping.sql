-- Debug user mapping issues

-- 1. Show all auth provider mappings
SELECT 
    uap.provider,
    uap.provider_user_id,
    uap.user_id as uuid,
    u.username,
    u.email
FROM user_auth_providers uap
JOIN users u ON uap.user_id = u.id
ORDER BY uap.created_at DESC;

-- 2. Show comments that might be orphaned (no matching user)
SELECT 
    'job_thoughts' as table_name,
    COUNT(*) as orphaned_count
FROM job_thoughts jt
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = jt.user_id)
UNION ALL
SELECT 
    'paper_insights' as table_name,
    COUNT(*) as orphaned_count
FROM paper_insights pi
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pi.user_id)
UNION ALL
SELECT 
    'resource_thoughts' as table_name,
    COUNT(*) as orphaned_count
FROM resource_thoughts rt
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = rt.user_id);

-- 3. If you know your JWT token user ID, replace 'YOUR_JWT_USER_ID' below:
-- For example, if your token has userId: 'google-aHVpeHVjb21AZ21haWwuY29t'
-- This will show if there's a mapping for it
SELECT * FROM user_auth_providers WHERE provider_user_id = 'google-aHVpeHVjb21AZ21haWwuY29t';

-- 4. Show all data for a specific user UUID (replace with actual UUID from results above)
-- SELECT 
--     'job_thoughts' as type,
--     COUNT(*) as count
-- FROM job_thoughts 
-- WHERE user_id = 'YOUR-UUID-HERE'
-- UNION ALL
-- SELECT 
--     'paper_insights' as type,
--     COUNT(*) as count
-- FROM paper_insights 
-- WHERE user_id = 'YOUR-UUID-HERE'
-- UNION ALL
-- SELECT 
--     'resource_thoughts' as type,
--     COUNT(*) as count
-- FROM resource_thoughts 
-- WHERE user_id = 'YOUR-UUID-HERE';