import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { job_id, user_id, insight_type, content, resources } = req.body

      if (!job_id || !user_id || !content) {
        return res.status(400).json({
          success: false,
          error: 'Job ID, User ID, and content are required'
        })
      }

      if (insight_type && !['note', 'resource', 'experience'].includes(insight_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid insight type'
        })
      }

      const { data, error } = await supabase
        .from('user_insights')
        .insert([{
          job_id,
          user_id,
          insight_type: insight_type || 'note',
          content,
          resources: resources || []
        }])
        .select()
        .single()

      if (error) throw error

      res.status(201).json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error creating insight:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create insight'
      })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, content, resources } = req.body

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        })
      }

      const updateData: any = {}
      if (content !== undefined) updateData.content = content
      if (resources !== undefined) updateData.resources = resources

      const { data, error } = await supabase
        .from('user_insights')
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
      console.error('Error updating insight:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update insight'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Insight ID is required'
        })
      }

      const { error } = await supabase
        .from('user_insights')
        .delete()
        .eq('id', id)

      if (error) throw error

      res.status(200).json({
        success: true,
        message: 'Insight deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting insight:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete insight'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}