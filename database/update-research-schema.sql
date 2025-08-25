-- 更新research_papers表，添加唯一约束
-- 如果表已存在且有数据，先删除可能的重复数据

-- 方法1：如果表为空或者你想重新开始，可以删除并重建表
-- DROP TABLE IF EXISTS research_papers CASCADE;
-- 然后重新运行 research-schema.sql

-- 方法2：如果表有数据，添加唯一约束
-- 首先删除可能的重复URL
DELETE FROM research_papers 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM research_papers 
    GROUP BY url
);

-- 然后添加唯一约束
ALTER TABLE research_papers 
ADD CONSTRAINT research_papers_url_unique UNIQUE (url);