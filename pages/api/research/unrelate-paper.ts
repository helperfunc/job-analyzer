import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
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
    
    const { job_id, paper_id } = req.body

    if (!job_id || !paper_id) {
      return res.status(400).json({
        success: false,
        error: 'Job ID and Paper ID are required'
      })
    }

    // Check if Supabase is configured
    if (!supabase) {
      return res.status(200).json({
        success: true,
        message: 'No database configured'
      })
    }

    // Delete the relation
    const { error } = await supabase
      .from('job_paper_relations')
      .delete()
      .eq('job_id', job_id)
      .eq('paper_id', paper_id)

    if (error) throw error

    res.status(200).json({
      success: true,
      message: 'Paper unlinked from job successfully'
    })

  } catch (error) {
    console.error('Error unlinking paper from job:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to unlink paper from job'
    })
  }
}