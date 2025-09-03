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
    
    // Get all interview resource relations with their resources
    const { data: interviewResourceRelations, error: interviewError } = await supabase
      .from('interview_resource_relations')
      .select(`
        id,
        job_id,
        resource_id,
        created_at,
        interview_resources!inner (
          id,
          title,
          url,
          resource_type,
          content,
          tags,
          created_at
        )
      `)

    if (interviewError) {
      console.error('Interview resources error:', interviewError)
      return res.status(500).json({ 
        error: 'Failed to fetch interview resource relations',
        details: interviewError.message
      })
    }

    return res.status(200).json({
      success: true,
      data: interviewResourceRelations || []
    })
  } catch (error) {
    console.error('Error fetching interview resource relations:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch interview resource relations',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}