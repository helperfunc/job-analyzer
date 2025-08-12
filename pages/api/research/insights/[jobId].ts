import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabase'
import { mockInsights } from '../../../../data/mock-research-data'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { jobId } = req.query
  
  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Job ID is required'
    })
  }

  if (req.method === 'GET') {
    if (!supabase) {
      // Return mock data when database is not configured
      const { user_id } = req.query
      let filteredInsights = mockInsights.filter(i => i.job_id === jobId)
      
      if (user_id) {
        filteredInsights = filteredInsights.filter(i => i.user_id === user_id)
      }
      
      return res.status(200).json({
        success: true,
        data: filteredInsights
      })
    }
    
    try {
      const { user_id } = req.query
      
      let query = supabase
        .from('user_insights')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

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
      console.error('Error fetching insights:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch insights'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}