# Database Fix: Resource Type Constraint Error

## Problem
You encountered this error when adding a job resource:
```
Failed to create job resource: new row for relation "job_resources" violates check constraint "job_resources_resource_type_check"
```

## Root Cause
The database constraint for `job_resources.resource_type` only allowed:
- `'course', 'book', 'video', 'article', 'tool', 'other'`

But the frontend was trying to insert `'preparation'`, which wasn't in the allowed list.

## Solution
The database schema has been updated to include interview-related resource types:
- `'course', 'book', 'video', 'article', 'tool', 'preparation', 'question', 'experience', 'note', 'other'`

## How to Apply the Fix

### Option 1: Update Existing Database
If you have an existing Supabase database, run this migration:

```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE job_resources DROP CONSTRAINT IF EXISTS job_resources_resource_type_check;

ALTER TABLE job_resources ADD CONSTRAINT job_resources_resource_type_check 
CHECK (resource_type IN ('course', 'book', 'video', 'article', 'tool', 'preparation', 'question', 'experience', 'note', 'other'));

-- Optional: Verify the change
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'job_resources'::regclass 
AND conname = 'job_resources_resource_type_check';
```

### Option 2: Fresh Database Setup
If setting up a new database, use the updated `database/complete-schema.sql` file which now includes the fix.

## Files Updated
- `database/complete-schema.sql` - Updated constraint
- `database/migration-update-job-resources-types.sql` - Migration script
- This fix documentation

## Test the Fix
After applying the migration, you should be able to:
1. Add resources with type "preparation"
2. Add resources with other interview-related types
3. Continue using existing resource types without issues

The error should no longer occur when adding preparation materials or other interview resources.