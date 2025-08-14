import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Check if Supabase is configured
    if (!supabase) {
      // Return mock data if no database
      return res.status(200).json({
        success: true,
        jobs: [],
        message: 'No database configured'
      })
    }

    // Fetch jobs from database
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')

    if (error) {
      // If jobs table doesn't exist, return empty array
      if (error.code === '42P01') {
        return res.status(200).json({
          success: true,
          jobs: [],
          message: 'Jobs table not found'
        })
      }
      throw error
    }

    res.status(200).json({
      success: true,
      jobs: jobs || []
    })

  } catch (error) {
    console.error('Error fetching jobs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}