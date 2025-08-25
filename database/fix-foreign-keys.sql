-- =============================================
-- 修复外键关系问题的脚本
-- 如果遇到外键关系错误，请在Supabase中运行此脚本
-- =============================================

-- 1. 检查表是否存在
SELECT 'jobs table exists:' as info, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='jobs');
SELECT 'research_papers table exists:' as info, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='research_papers');
SELECT 'job_paper_relations table exists:' as info, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='job_paper_relations');

-- 2. 检查外键约束
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint 
WHERE contype = 'f' 
AND (conrelid::regclass::text = 'job_paper_relations');

-- 3. 如果需要重新创建外键约束，先删除旧的
-- ALTER TABLE job_paper_relations DROP CONSTRAINT IF EXISTS job_paper_relations_job_id_fkey;
-- ALTER TABLE job_paper_relations DROP CONSTRAINT IF EXISTS job_paper_relations_paper_id_fkey;

-- 4. 重新创建外键约束
-- ALTER TABLE job_paper_relations 
-- ADD CONSTRAINT job_paper_relations_job_id_fkey 
-- FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- ALTER TABLE job_paper_relations 
-- ADD CONSTRAINT job_paper_relations_paper_id_fkey 
-- FOREIGN KEY (paper_id) REFERENCES research_papers(id) ON DELETE CASCADE;

-- 5. 刷新Supabase schema缓存（在Supabase Dashboard中执行）
-- 在Supabase Dashboard -> SQL Editor 中运行：
-- NOTIFY pgrst, 'reload schema';

-- 6. 验证修复
SELECT 'Foreign key constraints:' as info;
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint 
WHERE contype = 'f' 
AND (conrelid::regclass::text = 'job_paper_relations');