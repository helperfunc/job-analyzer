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
    
    const { id } = req.body

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Paper ID is required'
      })
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      })
    }

    const { error } = await supabase
      .from('research_papers')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.status(200).json({
      success: true,
      message: 'Paper deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting paper:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete paper'
    })
  }
}