import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

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
      error: 'Valid insight ID is required'
    })
  }

  if (req.method === 'PUT') {
    try {
      const { insight, insight_type } = req.body

      if (!insight) {
        return res.status(400).json({
          success: false,
          error: 'insight is required'
        })
      }

      const { data, error } = await supabase
        .from('paper_insights')
        .update({
          insight,
          insight_type: insight_type || 'note',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      res.status(200).json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error updating paper insight:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update paper insight'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('paper_insights')
        .delete()
        .eq('id', id)

      if (error) throw error

      res.status(200).json({
        success: true,
        message: 'Paper insight deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting paper insight:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete paper insight'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}