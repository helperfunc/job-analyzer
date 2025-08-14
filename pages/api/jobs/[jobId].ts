import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

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
    const { jobId } = req.query

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required'
      })
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      })
    }

    // Delete the job (this will cascade delete related records due to foreign key constraints)
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (error) throw error

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting job:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete job'
    })
  }
}