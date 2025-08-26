import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured'
    })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Thought ID is required'
    })
  }

  if (req.method === 'PUT') {
    try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
      const { content, thought_type, rating, is_interested } = req.body

      const updateData: any = {}
      if (content !== undefined) updateData.content = content
      if (thought_type !== undefined) updateData.thought_type = thought_type
      if (rating !== undefined) updateData.rating = rating
      if (is_interested !== undefined) updateData.is_interested = is_interested

      const { data, error } = await supabase
        .from('job_thoughts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      res.status(200).json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error updating job thought:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update job thought'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('job_thoughts')
        .delete()
        .eq('id', id)

      if (error) throw error

      res.status(200).json({
        success: true,
        message: 'Job thought deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting job thought:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete job thought'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}