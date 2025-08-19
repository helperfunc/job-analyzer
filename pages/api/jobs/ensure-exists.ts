import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { job_id } = req.body

    if (!job_id) {
      return res.status(400).json({
        error: 'job_id is required'
      })
    }

    // Check if job exists
    const { data: existingJob, error: checkError } = await supabase
      .from('jobs')
      .select('id, title, company')
      .eq('id', job_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking job:', checkError)
      return res.status(500).json({
        error: 'Failed to check job existence',
        details: checkError.message
      })
    }

    if (existingJob) {
      return res.status(200).json({
        success: true,
        exists: true,
        job: existingJob
      })
    }

    // Job doesn't exist
    return res.status(200).json({
      success: true,
      exists: false,
      message: 'Job not found in database'
    })

  } catch (error) {
    console.error('Ensure job exists error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}