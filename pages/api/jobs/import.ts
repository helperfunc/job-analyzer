import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    const { jobs } = req.body

    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({
        success: false,
        error: 'Jobs array is required'
      })
    }

    // Check if Supabase is configured
    if (!isSupabaseAvailable()) {
      return res.status(200).json({
        success: false,
        message: 'No database configured'
      })
    }

    // Check for existing jobs to avoid duplicates
    // Use company + title + location as unique identifier
    const processedJobs = []
    const batchDuplicates = new Set<string>()
    
    for (const job of jobs) {
      // Create a unique key for this batch
      const batchKey = `${job.company?.toLowerCase() || ''}_${job.title?.toLowerCase() || ''}_${job.location?.toLowerCase() || ''}`
      
      // Skip if already processed in this batch
      if (batchDuplicates.has(batchKey)) {
        console.log(`Skipping batch duplicate: ${job.title} at ${job.company}`)
        continue
      }
      
      // Check if job already exists in database
      const { data: existingJobs, error: checkError } = await supabase
        .from('jobs')
        .select('id')
        .ilike('company', job.company)
        .ilike('title', job.title)
        .ilike('location', job.location || '')
        .limit(1)
      
      if (checkError) {
        console.error('Error checking for existing job:', checkError)
        continue
      }
      
      // If no existing job found, add to processed list
      if (!existingJobs || existingJobs.length === 0) {
        processedJobs.push(job)
        batchDuplicates.add(batchKey)
      } else {
        console.log(`Skipping database duplicate: ${job.title} at ${job.company}`)
      }
    }
    
    // Only import new jobs
    if (processedJobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new jobs to import - all jobs already exist in database',
        count: 0,
        skipped: jobs.length
      })
    }

    // Import new jobs to database
    const { data, error } = await supabase
      .from('jobs')
      .insert(processedJobs)
      .select()

    if (error) {
      // If jobs table doesn't exist or missing columns, return error with fix
      if (error.code === '42P01' || error.code === 'PGRST204') {
        const errorType = error.code === '42P01' ? 'table does not exist' : 'missing columns'
        
        return res.status(200).json({
          success: false,
          message: `Jobs ${errorType}. Please update your database structure.`,
          error: error.message,
          sql: `
-- Drop and recreate table with correct structure
DROP TABLE IF EXISTS jobs CASCADE;

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  department TEXT,
  salary TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  skills TEXT[],
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Or if you want to keep existing data, just add missing columns:
-- ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department TEXT;
          `
        })
      }
      
      // Other errors
      throw error
    }

    const importedCount = data?.length || 0
    const skippedCount = jobs.length - processedJobs.length
    
    res.status(200).json({
      success: true,
      message: importedCount > 0 
        ? `Successfully imported ${importedCount} new jobs${skippedCount > 0 ? `, skipped ${skippedCount} duplicates` : ''}`
        : 'No new jobs imported',
      count: importedCount,
      skipped: skippedCount,
      total: jobs.length
    })

  } catch (error) {
    console.error('Error importing jobs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to import jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}