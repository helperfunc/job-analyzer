import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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
    
    if (!supabase) {
      throw new Error('Database not configured')
    }

    // Create job_resource_relations table
    const { error: jobRelationsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create job_resource_relations table
        CREATE TABLE IF NOT EXISTS job_resource_relations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            resource_id UUID NOT NULL REFERENCES job_resources(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(job_id, resource_id)
        );

        -- Create interview_resource_relations table
        CREATE TABLE IF NOT EXISTS interview_resource_relations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            resource_id UUID NOT NULL REFERENCES interview_resources(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(job_id, resource_id)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_job_resource_relations_job_id ON job_resource_relations(job_id);
        CREATE INDEX IF NOT EXISTS idx_job_resource_relations_resource_id ON job_resource_relations(resource_id);
        CREATE INDEX IF NOT EXISTS idx_interview_resource_relations_job_id ON interview_resource_relations(job_id);
        CREATE INDEX IF NOT EXISTS idx_interview_resource_relations_resource_id ON interview_resource_relations(resource_id);
      `
    })

    if (jobRelationsError) {
      // Try individual table creation
      console.log('Trying individual table creation...')
      
      const { error: table1Error } = await supabase
        .from('job_resource_relations')
        .select('id')
        .limit(1)

      if (table1Error && table1Error.code === '42P01') { // Table doesn't exist
        // Create tables using raw SQL queries
        const createJobRelationsTable = `
          CREATE TABLE job_resource_relations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id UUID NOT NULL,
            resource_id UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(job_id, resource_id)
          );
        `
        
        const createInterviewRelationsTable = `
          CREATE TABLE interview_resource_relations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id UUID NOT NULL,
            resource_id UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(job_id, resource_id)
          );
        `

        // Since we can't execute DDL through Supabase client directly,
        // we'll return instructions for manual execution
        return res.status(200).json({
          success: true,
          message: 'Migration SQL prepared. Please execute the database/add-resource-job-relations.sql file in your Supabase SQL editor.',
          sql: `${createJobRelationsTable}\n${createInterviewRelationsTable}`,
          instructions: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to SQL Editor',
            '3. Execute the SQL from database/add-resource-job-relations.sql file',
            '4. The tables will be created with proper permissions and RLS policies'
          ]
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Resource relation tables migration completed successfully'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      instructions: [
        'Please manually execute the SQL file:',
        '1. Go to your Supabase project dashboard',
        '2. Navigate to SQL Editor',
        '3. Copy and paste the contents of database/add-resource-job-relations.sql',
        '4. Execute the SQL to create the tables'
      ]
    })
  }
}