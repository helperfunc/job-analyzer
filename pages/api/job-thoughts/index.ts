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

  const { job_id } = req.query

  if (req.method === 'GET') {
    try {
      let query = supabase
        .from('job_thoughts')
        .select('*')
        .order('created_at', { ascending: false })

      if (job_id) {
        query = query.eq('job_id', job_id)
      }

      const { data, error } = await query

      if (error) throw error

      res.status(200).json({
        success: true,
        data: data || []
      })
    } catch (error) {
      console.error('Error fetching job thoughts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch job thoughts'
      })
    }
  } else if (req.method === 'POST') {
    try {
      const { job_id, thought_type, content, rating, is_interested } = req.body

      if (!job_id || !content) {
        return res.status(400).json({
          success: false,
          error: 'job_id and content are required'
        })
      }

      const { data, error } = await supabase
        .from('job_thoughts')
        .insert([{
          job_id,
          thought_type: thought_type || 'general',
          content,
          rating,
          is_interested: is_interested !== undefined ? is_interested : true,
          user_id: 'default' // In a real app, this would come from auth
        }])
        .select()
        .single()

      if (error) throw error

      res.status(201).json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error creating job thought:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create job thought'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}