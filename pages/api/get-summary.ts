import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

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
    // Read the latest job data (same logic as jobs-by-skill)
    const dataDir = path.join(process.cwd(), 'data')
    
    if (!fs.existsSync(dataDir)) {
      return res.status(404).json({ error: 'No job data found' })
    }

    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'No job data files found' })
    }
    
    // Prioritize REFINED files first, then FIXED files, then latest by time
    let latestFile
    const refinedFiles = files.filter(f => f.includes('REFINED')).sort()
    const fixedFiles = files.filter(f => f.includes('FIXED')).sort()
    
    if (refinedFiles.length > 0) {
      latestFile = refinedFiles[refinedFiles.length - 1] // Latest REFINED file
      console.log(`📊 Summary using REFINED data file: ${latestFile}`)
    } else if (fixedFiles.length > 0) {
      latestFile = fixedFiles[fixedFiles.length - 1] // Latest FIXED file
      console.log(`📊 Summary using FIXED data file: ${latestFile}`)
    } else {
      latestFile = files.sort().pop()! // Fallback to latest regular file  
      console.log(`📊 Summary using latest data file: ${latestFile}`)
    }
    
    const filepath = path.join(dataDir, latestFile)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    // Generate fresh summary statistics
    const jobsWithSalary = data.jobs.filter((job: Job) => job.salary_min || job.salary_max).length
    
    const highestPayingJobs = data.jobs
      .filter((job: Job) => job.salary_max)
      .sort((a: Job, b: Job) => (b.salary_max || 0) - (a.salary_max || 0))
      .slice(0, 20)
    
    // Generate skill statistics
    const skillCounts: { [key: string]: number } = {}
    data.jobs.forEach((job: Job) => {
      job.skills?.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1
      })
    })
    
    const mostCommonSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }))
    
    const summary = {
      success: true,
      dataSource: latestFile,
      timestamp: new Date().toISOString(),
      summary: {
        total_jobs: data.jobs.length,
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