import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

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
    const { jobs } = req.body

    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({
        success: false,
        error: 'Jobs array is required'
      })
    }

    // Check if Supabase is configured
    if (!supabase) {
      return res.status(200).json({
        success: false,
        message: 'No database configured'
      })
    }

    // Import jobs to database
    const { data, error } = await supabase
      .from('jobs')
      .upsert(jobs, { 
        onConflict: 'id',
        ignoreDuplicates: true 
      })
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

    res.status(200).json({
      success: true,
      message: 'Jobs imported successfully',
      count: data?.length || 0
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