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

  const { skill, company } = req.query

  if (!skill || typeof skill !== 'string') {
    return res.status(400).json({ error: 'Skill parameter is required' })
  }

  // Default to openai if no company specified
  const companyFilter = company ? company.toString().toLowerCase() : 'openai'
  console.log(`🔍 Filtering jobs by skill '${skill}' for company: ${companyFilter}`)

  try {
    // Read the latest job data for the specified company
    const dataDir = path.join(process.cwd(), 'data')
    
    if (!fs.existsSync(dataDir)) {
      return res.status(404).json({ error: 'No job data found' })
    }

    const files = fs.readdirSync(dataDir).filter(f => f.startsWith(`${companyFilter}-jobs-`) && f.endsWith('.json'))
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'No job data files found' })
    }
    
    // Prioritize REFINED files first, then FIXED files, then latest by time
    let latestFile
    const refinedFiles = files.filter(f => f.includes('REFINED')).sort()
    const fixedFiles = files.filter(f => f.includes('FIXED')).sort()
    
    if (refinedFiles.length > 0) {
      latestFile = refinedFiles[refinedFiles.length - 1] // Latest REFINED file
      console.log(`📊 Using REFINED data file: ${latestFile}`)
    } else if (fixedFiles.length > 0) {
      latestFile = fixedFiles[fixedFiles.length - 1] // Latest FIXED file
      console.log(`📊 Using FIXED data file: ${latestFile}`)
    } else {
      latestFile = files.sort().pop()! // Fallback to latest regular file  
      console.log(`📊 Using latest data file: ${latestFile}`)
    }
    const filepath = path.join(dataDir, latestFile)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    // Filter jobs that have this skill
    const jobsWithSkill = data.jobs.filter((job: Job) => 
      job.skills && job.skills.includes(skill)
    )

    // Sort by salary (highest first)
    const sortedJobs = jobsWithSkill.sort((a: Job, b: Job) => 
      (b.salary_max || 0) - (a.salary_max || 0)
    )
    
    res.status(200).json({
      success: true,
      skill,
      total: sortedJobs.length,
      jobs: sortedJobs
    })

  } catch (error) {
    console.error('Error reading job data:', error)
    res.status(500).json({ 
      error: 'Failed to read job data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}