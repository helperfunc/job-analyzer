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
    const { company, index, title } = req.body

    if (!company || index === undefined) {
      return res.status(400).json({
        error: 'Company and index are required'
      })
    }

    // First try to find by company and similar position
    let query = supabase
      .from('jobs')
      .select('*')
      .ilike('company', company)

    // If we have a title, try to match it
    if (title) {
      const { data: jobsByTitle, error } = await query
        .ilike('title', `%${title}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && jobsByTitle) {
        return res.status(200).json({
          success: true,
          job: jobsByTitle
        })
      }
    }

    // Otherwise, get all jobs for the company and return by index
    const { data: allJobs, error: allError } = await supabase
      .from('jobs')
      .select('*')
      .ilike('company', company)
      .order('salary_max', { ascending: false, nullsFirst: false })

    if (allError) {
      return res.status(500).json({
        error: 'Failed to fetch jobs',
        details: allError.message
      })
    }

    if (!allJobs || allJobs.length === 0) {
      return res.status(404).json({
        error: 'No jobs found for this company'
      })
    }

    // Return job by index
    const jobIndex = parseInt(index)
    if (jobIndex >= 0 && jobIndex < allJobs.length) {
      return res.status(200).json({
        success: true,
        job: allJobs[jobIndex]
      })
    }

    return res.status(404).json({
      error: 'Job not found at this index'
    })

  } catch (error) {
    console.error('Find job by details error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}