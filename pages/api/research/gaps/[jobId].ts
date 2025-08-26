import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

// Empty mock data fallback
const mockGapAnalysis = {
  job_id: '',
  user_id: 'default',
  gap_analysis: {
    missing_skills: [],
    suggestions: [],
    confidence_score: 0
  },
  projects: []
}

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
    try {
      const { user_id } = req.query

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        })
      }

      // If database is not configured, return mock data
      if (!isSupabaseAvailable()) {
        if (jobId === mockGapAnalysis.job_id && user_id === mockGapAnalysis.user_id) {
          return res.status(200).json({
            success: true,
            data: mockGapAnalysis
          })
        }
        return res.status(200).json({
          success: true,
          data: null
        })
      }

      // Get skill gap analysis and related project recommendations
      const { data, error } = await supabase
        .from('skill_gaps')
        .select(`
          *,
          project_recommendations(*)
        `)
        .eq('job_id', jobId)
        .eq('user_id', user_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned

      res.status(200).json({
        success: true,
        data: data || null
      })
    } catch (error) {
      console.error('Error fetching skill gap analysis:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch skill gap analysis'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}