import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isSupabaseAvailable()) {
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
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
      const { 
        insight, 
        insight_type,
        thought_type,
        rating,
        relevance_to_career,
        implementation_difficulty
      } = req.body

      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (insight !== undefined) updateData.insight = insight
      if (insight_type !== undefined) updateData.insight_type = insight_type
      if (thought_type !== undefined) updateData.thought_type = thought_type
      if (rating !== undefined) updateData.rating = rating
      if (relevance_to_career !== undefined) updateData.relevance_to_career = relevance_to_career
      if (implementation_difficulty !== undefined) updateData.implementation_difficulty = implementation_difficulty

      const { data, error } = await supabase
        .from('paper_insights')
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
      console.error('Error updating paper insight:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update paper insight'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const supabase = getSupabase()
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