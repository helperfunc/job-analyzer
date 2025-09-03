import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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
    
    // Get all job resource relations with their resources
    const { data: jobResourceRelations, error: jobError } = await supabase
      .from('job_resource_relations')
      .select(`
        id,
        job_id,
        resource_id,
        created_at,
        job_resources!inner (
          id,
          title,
          url,
          resource_type,
          description,
          user_id,
          created_at
        )
      `)

    if (jobError) {
      console.error('Job resources error:', jobError)
      return res.status(500).json({ 
        error: 'Failed to fetch job resource relations',
        details: jobError.message
      })
    }

    return res.status(200).json({
      success: true,
      data: jobResourceRelations || []
    })
  } catch (error) {
    console.error('Error fetching job resource relations:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch job resource relations',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}