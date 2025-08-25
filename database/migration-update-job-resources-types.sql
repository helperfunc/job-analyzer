-- Migration: Update job_resources resource_type constraint
-- Date: 2025-08-14
-- Purpose: Add interview-related resource types to job_resources table

-- Drop the existing constraint
ALTER TABLE job_resources DROP CONSTRAINT IF EXISTS job_resources_resource_type_check;

-- Add the new constraint with additional types
ALTER TABLE job_resources ADD CONSTRAINT job_resources_resource_type_check 
CHECK (resource_type IN ('course', 'book', 'video', 'article', 'tool', 'preparation', 'question', 'experience', 'note', 'other'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'job_resources'::regclass 
AND conname = 'job_resources_resource_type_check';