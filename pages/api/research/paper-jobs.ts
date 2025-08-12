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
    const { paperId } = req.query

    if (!paperId) {
      return res.status(400).json({
        success: false,
        error: 'Paper ID is required'
      })
    }

    // Check if Supabase is configured
    if (!supabase) {
      return res.status(200).json({
        success: true,
        data: []
      })
    }

    // Try to get all jobs related to this paper using foreign key relationship
    let { data, error } = await supabase
      .from('job_paper_relations')
      .select(`
        job_id,
        jobs (
          id,
          title,
          company,
          location,
          department,
          salary,
          salary_min,
          salary_max
        )
      `)
      .eq('paper_id', paperId)

    // If foreign key relationship fails, try alternative approach
    if (error && error.code === 'PGRST200') {
      console.log('Foreign key relationship not found, using alternative approach...')
      
      // Get job IDs first
      const { data: relationData, error: relationError } = await supabase
        .from('job_paper_relations')
        .select('job_id')
        .eq('paper_id', paperId)

      if (relationError) throw relationError

      if (relationData && relationData.length > 0) {
        // Get job details separately
        const jobIds = relationData.map(r => r.job_id)
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id, title, company, location, department, salary, salary_min, salary_max')
          .in('id', jobIds)

        if (jobsError) throw jobsError

        // Format the data to match expected structure
        data = jobsData || []
      } else {
        data = []
      }
    } else if (error) {
      throw error
    } else {
      // Extract jobs from the relation data (normal case)
      data = data?.map(relation => relation.jobs).filter(Boolean) || []
    }

    const relatedJobs = data || []

    res.status(200).json({
      success: true,
      data: relatedJobs
    })

  } catch (error) {
    console.error('Error fetching paper jobs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paper jobs'
    })
  }
}