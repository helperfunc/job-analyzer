import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../lib/supabase'

interface Job {
  id: string
  title: string
  company: string
  location: string
  department?: string
  salary?: string
  salary_min?: number
  salary_max?: number
  skills?: string[]
  description?: string
  url?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { skill, company } = req.query

  if (!skill || typeof skill !== 'string') {
    return res.status(400).json({ error: 'Skill parameter is required' })
  }

  // Default to openai if no company specified
  const companyFilter = company ? company.toString().toLowerCase() : 'openai'
  console.log(`🔍 Filtering jobs by skill '${skill}' for company: ${companyFilter}`)

  try {
    // Query jobs from Supabase that have the specified skill
    console.log(`🔍 Querying Supabase for jobs with skill: ${skill}`)
    
    let query = supabase
      .from('jobs')
      .select('*')
    
    // Apply company filter if specified
    if (companyFilter !== 'all') {
      query = query.ilike('company', companyFilter)
    }
    
    const { data: allJobs, error: dbError } = await query
    
    if (dbError) {
      console.error('Database error:', dbError)
      return res.status(500).json({ 
        error: 'Failed to fetch jobs from database',
        details: dbError.message
      })
    }
    
    if (!allJobs || allJobs.length === 0) {
      return res.status(404).json({ 
        error: 'No jobs found',
        skill,
        company: companyFilter
      })
    }
    
    // Filter jobs that have this skill (case-insensitive)
    const jobsWithSkill = allJobs.filter((job: Job) => 
      job.skills && job.skills.some(s => 
        s.toLowerCase() === skill.toLowerCase()
      )
    )
    
    console.log(`📊 Found ${jobsWithSkill.length} jobs with ${skill} skill out of ${allJobs.length} total jobs`)

    // Sort by salary (highest first)
    const sortedJobs = jobsWithSkill.sort((a: Job, b: Job) => 
      (b.salary_max || 0) - (a.salary_max || 0)
    )
    
    res.status(200).json({
      success: true,
      skill,
      company: companyFilter,
      total: sortedJobs.length,
      jobs: sortedJobs
    })

  } catch (error) {
    console.error('Error fetching job data:', error)
    res.status(500).json({ 
      error: 'Failed to fetch job data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}