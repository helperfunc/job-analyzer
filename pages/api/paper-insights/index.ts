import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/auth'
import { getUserUUID } from '../../../lib/auth-helpers'

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

  if (req.method === 'GET') {
    try {
      const { paper_id, user_id } = req.query

      let query = supabase
        .from('paper_insights')
        .select('*')
        .order('created_at', { ascending: false })

      if (paper_id) {
        query = query.eq('paper_id', paper_id)
      }

      if (user_id) {
        query = query.eq('user_id', user_id)
      }

      const { data, error } = await query

      if (error) throw error

      res.status(200).json({
        success: true,
        data: data || []
      })
    } catch (error) {
      console.error('Error fetching paper insights:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch paper insights'
      })
    }
  } else if (req.method === 'POST') {
    try {
      const { 
        paper_id, 
        insight, 
        insight_type,
        thought_type,
        rating,
        relevance_to_career,
        implementation_difficulty,
        visibility
      } = req.body

      if (!paper_id || !insight) {
        return res.status(400).json({
          success: false,
          error: 'paper_id and insight are required'
        })
      }

      // Get current user
      const user = await getCurrentUser(req)
      const textUserId = user ? user.userId : 'default'
      const userId = await getUserUUID(textUserId)

      const { data, error } = await supabase
        .from('paper_insights')
        .insert([{
          paper_id,
          user_id: userId,
          insight,
          insight_type: insight_type || 'note',
          thought_type: thought_type || 'general',
          rating,
          relevance_to_career,
          implementation_difficulty,
          visibility: visibility || 'public'
        }])
        .select()
        .single()

      if (error) throw error

      res.status(201).json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error creating paper insight:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create paper insight'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}