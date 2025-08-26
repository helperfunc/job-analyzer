import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../lib/supabase'

interface Job {
  title: string
  url: string
  location: string
  department: string
  salary?: string
  salary_min?: number
  salary_max?: number
  skills?: string[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    // Get company parameter from query
    const { company } = req.query
    const companyFilter = company ? company.toString().toLowerCase() : 'openai'
    const companyName = companyFilter === 'deepmind' ? 'DeepMind' : 
                        companyFilter.charAt(0).toUpperCase() + companyFilter.slice(1)
    
    console.log(`📊 Getting summary for company: ${companyFilter}`)
    
    // Check if database is configured
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection'
      })
    }

    // Get data from database only
    const { data: dbJobs, error: dbError } = await supabase
      .from('jobs')
      .select('*')
      .ilike('company', companyName)
      .order('created_at', { ascending: false })
    
    if (dbError) {
      console.error('Database query error:', dbError)
      return res.status(500).json({ 
        error: 'Database query failed',
        details: dbError.message
      })
    }

    if (!dbJobs || dbJobs.length === 0) {
      console.log(`📊 No data found for ${companyName} in database`)
      return res.status(200).json({
        success: true,
        company: companyName,
        dataSource: 'database',
        timestamp: new Date().toISOString(),
        message: `No ${companyName} jobs found in database`,
        filepath: 'Database (empty)',
        summary: {
          total_jobs: 0,
          jobs_with_salary: 0,
          highest_paying_jobs: [],
          most_common_skills: []
        }
      })
    }

    console.log(`📊 Using database data for ${companyName}: ${dbJobs.length} jobs`)
    
    // Generate summary from database data
    const jobsWithSalary = dbJobs.filter(job => job.salary_min || job.salary_max).length
    
    const highestPayingJobs = dbJobs
      .filter(job => job.salary_max)
      .sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0))
      .slice(0, 20)
    
    // Generate skill statistics
    const skillCounts: { [key: string]: number } = {}
    dbJobs.forEach(job => {
      if (job.skills && Array.isArray(job.skills)) {
        job.skills.forEach((skill: string) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1
        })
      }
    })
    
    const mostCommonSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }))
    
    const summary = {
      success: true,
      company: companyName,
      dataSource: 'database',
      timestamp: new Date().toISOString(),
      message: `Analysis complete for ${companyName}`,
      filepath: 'Database records',
      summary: {
        total_jobs: dbJobs.length,
        jobs_with_salary: jobsWithSalary,
        highest_paying_jobs: highestPayingJobs,
        most_common_skills: mostCommonSkills
      }
    }
    
    res.status(200).json(summary)

  } catch (error) {
    console.error('Error reading job data:', error)
    res.status(500).json({ 
      error: 'Failed to read job data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}