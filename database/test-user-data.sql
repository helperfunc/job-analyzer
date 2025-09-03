-- Test query to verify user data and comments

-- Show all users
SELECT id, username, email FROM users;

-- Show auth provider mappings
SELECT * FROM user_auth_providers;

-- Count thoughts/insights by user
SELECT 
    u.username,
    u.id as user_uuid,
    (SELECT COUNT(*) FROM job_thoughts jt WHERE jt.user_id = u.id) as job_thoughts_count,
    (SELECT COUNT(*) FROM paper_insights pi WHERE pi.user_id = u.id) as paper_insights_count,
    (SELECT COUNT(*) FROM resource_thoughts rt WHERE rt.user_id = u.id) as resource_thoughts_count
FROM users u
ORDER BY u.username;

-- Show recent job thoughts
SELECT 
    jt.id,
    jt.user_id,
    jt.content,
    jt.created_at,
    u.username
FROM job_thoughts jt
LEFT JOIN users u ON jt.user_id = u.id
ORDER BY jt.created_at DESC
LIMIT 5;

-- Show recent paper insights  
SELECT 
    pi.id,
    pi.user_id,
    pi.insight,
    pi.created_at,
    u.username
FROM paper_insights pi
LEFT JOIN users u ON pi.user_id = u.id
ORDER BY pi.created_at DESC
LIMIT 5;

-- Show recent resource thoughts
SELECT 
    rt.id,
    rt.user_id,
    rt.content,
    rt.created_at,
    u.username
FROM resource_thoughts rt
LEFT JOIN users u ON rt.user_id = u.id
ORDER BY rt.created_at DESC
LIMIT 5;