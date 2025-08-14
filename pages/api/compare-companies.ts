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

interface CompanyData {
  name: string
  jobs: Job[]
  total_jobs: number
  jobs_with_salary: number
  avg_salary_min?: number
  avg_salary_max?: number
  highest_salary?: number
  lowest_salary?: number
  top_skills: { skill: string; count: number; percentage: number }[]
}

interface ComparisonResult {
  companies: CompanyData[]
  comparison: {
    salary_comparison: {
      winner: string
      openai_avg?: number
      anthropic_avg?: number
      difference?: number
    }
    skill_overlap: {
      common_skills: string[]
      openai_unique: string[]
      anthropic_unique: string[]
    }
    job_title_analysis: {
      similar_roles: Array<{
        role_type: string
        openai_count: number
        anthropic_count: number
        openai_avg_salary?: number
        anthropic_avg_salary?: number
      }>
    }
    insights: string[]
  }
}

function findSimilarRole(title: string): string {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('machine learning') || titleLower.includes('ml engineer')) return 'Machine Learning Engineer'
  if (titleLower.includes('research') && (titleLower.includes('scientist') || titleLower.includes('engineer'))) return 'Research Scientist/Engineer'
  if (titleLower.includes('software engineer') && titleLower.includes('infrastructure')) return 'Infrastructure Engineer'
  if (titleLower.includes('software engineer') && titleLower.includes('frontend')) return 'Frontend Engineer'
  if (titleLower.includes('software engineer')) return 'Software Engineer'
  if (titleLower.includes('data scientist')) return 'Data Scientist'
  if (titleLower.includes('product manager')) return 'Product Manager'
  if (titleLower.includes('security')) return 'Security Engineer'
  if (titleLower.includes('devops') || titleLower.includes('platform')) return 'DevOps/Platform'
  if (titleLower.includes('sales') || titleLower.includes('business development')) return 'Sales/Business'
  if (titleLower.includes('design')) return 'Design'
  if (titleLower.includes('finance') || titleLower.includes('accounting')) return 'Finance'
  if (titleLower.includes('legal')) return 'Legal'
  if (titleLower.includes('people') || titleLower.includes('hr')) return 'People/HR'
  
  return 'Other'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComparisonResult | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const dataDir = path.join(process.cwd(), 'data')
    
    if (!fs.existsSync(dataDir)) {
      return res.status(404).json({ error: 'No job data found' })
    }

    // Find latest files for both companies
    const files = fs.readdirSync(dataDir)
    
    // Find OpenAI data (prioritize REFINED > FIXED > latest)
    const openaiFiles = files.filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    let openaiFile = null
    
    const openaiRefined = openaiFiles.filter(f => f.includes('REFINED')).sort()
    const openaiFixed = openaiFiles.filter(f => f.includes('FIXED')).sort()
    
    if (openaiRefined.length > 0) {
      openaiFile = openaiRefined[openaiRefined.length - 1]
    } else if (openaiFixed.length > 0) {
      openaiFile = openaiFixed[openaiFixed.length - 1]
    } else if (openaiFiles.length > 0) {
      openaiFile = openaiFiles.sort().pop()!
    }

    // Find Anthropic data
    const anthropicFiles = files.filter(f => f.startsWith('anthropic-jobs-') && f.endsWith('.json'))
    let anthropicFile = null
    
    const anthropicRefined = anthropicFiles.filter(f => f.includes('REFINED')).sort()
    const anthropicFixed = anthropicFiles.filter(f => f.includes('FIXED')).sort()
    
    if (anthropicRefined.length > 0) {
      anthropicFile = anthropicRefined[anthropicRefined.length - 1]
    } else if (anthropicFixed.length > 0) {
      anthropicFile = anthropicFixed[anthropicFixed.length - 1]
    } else if (anthropicFiles.length > 0) {
      anthropicFile = anthropicFiles.sort().pop()!
    }

    if (!openaiFile && !anthropicFile) {
      return res.status(404).json({ error: 'No job data files found for comparison' })
    }

    const companies: CompanyData[] = []
    
    // Process OpenAI data
    if (openaiFile) {
      const openaiData = JSON.parse(fs.readFileSync(path.join(dataDir, openaiFile), 'utf8'))
      const openaiJobs: Job[] = openaiData.jobs || []
      
      const jobsWithSalary = openaiJobs.filter(j => j.salary_min && j.salary_max)
      const avgSalaryMin = jobsWithSalary.length > 0 ? jobsWithSalary.reduce((sum, j) => sum + (j.salary_min || 0), 0) / jobsWithSalary.length : 0
      const avgSalaryMax = jobsWithSalary.length > 0 ? jobsWithSalary.reduce((sum, j) => sum + (j.salary_max || 0), 0) / jobsWithSalary.length : 0
      
      // Count skills
      const skillCounts: { [key: string]: number } = {}
      openaiJobs.forEach(job => {
        job.skills?.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1
        })
      })
      
      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({
          skill,
          count,
          percentage: Math.round((count / openaiJobs.length) * 100)
        }))

      companies.push({
        name: 'OpenAI',
        jobs: openaiJobs,
        total_jobs: openaiJobs.length,
        jobs_with_salary: jobsWithSalary.length,
        avg_salary_min: Math.round(avgSalaryMin),
        avg_salary_max: Math.round(avgSalaryMax),
        highest_salary: Math.max(...jobsWithSalary.map(j => j.salary_max || 0)),
        lowest_salary: Math.min(...jobsWithSalary.map(j => j.salary_min || Infinity).filter(s => s !== Infinity)),
        top_skills: topSkills
      })
    }

    // Process Anthropic data
    if (anthropicFile) {
      const anthropicData = JSON.parse(fs.readFileSync(path.join(dataDir, anthropicFile), 'utf8'))
      const anthropicJobs: Job[] = anthropicData.jobs || []
      
      const jobsWithSalary = anthropicJobs.filter(j => j.salary_min && j.salary_max)
      const avgSalaryMin = jobsWithSalary.length > 0 ? jobsWithSalary.reduce((sum, j) => sum + (j.salary_min || 0), 0) / jobsWithSalary.length : 0
      const avgSalaryMax = jobsWithSalary.length > 0 ? jobsWithSalary.reduce((sum, j) => sum + (j.salary_max || 0), 0) / jobsWithSalary.length : 0
      
      // Count skills
      const skillCounts: { [key: string]: number } = {}
      anthropicJobs.forEach(job => {
        job.skills?.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1
        })
      })
      
      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({
          skill,
          count,
          percentage: Math.round((count / anthropicJobs.length) * 100)
        }))

      companies.push({
        name: 'Anthropic',
        jobs: anthropicJobs,
        total_jobs: anthropicJobs.length,
        jobs_with_salary: jobsWithSalary.length,
        avg_salary_min: Math.round(avgSalaryMin),
        avg_salary_max: Math.round(avgSalaryMax),
        highest_salary: Math.max(...jobsWithSalary.map(j => j.salary_max || 0)),
        lowest_salary: Math.min(...jobsWithSalary.map(j => j.salary_min || Infinity).filter(s => s !== Infinity)),
        top_skills: topSkills
      })
    }

    // Generate comparison insights
    let salaryComparison: any = {}
    let skillOverlap: any = { common_skills: [], openai_unique: [], anthropic_unique: [] }
    let jobTitleAnalysis: any = { similar_roles: [] }
    let insights: string[] = []

    if (companies.length === 2) {
      const [openai, anthropic] = companies[0].name === 'OpenAI' ? companies : [companies[1], companies[0]]
      
      // Salary comparison
      const openaiAvg = (openai.avg_salary_min! + openai.avg_salary_max!) / 2
      const anthropicAvg = (anthropic.avg_salary_min! + anthropic.avg_salary_max!) / 2
      
      salaryComparison = {
        winner: openaiAvg > anthropicAvg ? 'OpenAI' : 'Anthropic',
        openai_avg: Math.round(openaiAvg),
        anthropic_avg: Math.round(anthropicAvg),
        difference: Math.round(Math.abs(openaiAvg - anthropicAvg))
      }

      // Skill overlap analysis
      const openaiSkills = new Set(openai.top_skills.map(s => s.skill))
      const anthropicSkills = new Set(anthropic.top_skills.map(s => s.skill))
      
      skillOverlap.common_skills = Array.from(openaiSkills).filter(skill => anthropicSkills.has(skill))
      skillOverlap.openai_unique = Array.from(openaiSkills).filter(skill => !anthropicSkills.has(skill))
      skillOverlap.anthropic_unique = Array.from(anthropicSkills).filter(skill => !openaiSkills.has(skill))

      // Job title analysis
      const roleGroups: { [key: string]: { openai: Job[], anthropic: Job[] } } = {}
      
      openai.jobs.forEach(job => {
        const roleType = findSimilarRole(job.title)
        if (!roleGroups[roleType]) roleGroups[roleType] = { openai: [], anthropic: [] }
        roleGroups[roleType].openai.push(job)
      })
      
      anthropic.jobs.forEach(job => {
        const roleType = findSimilarRole(job.title)
        if (!roleGroups[roleType]) roleGroups[roleType] = { openai: [], anthropic: [] }
        roleGroups[roleType].anthropic.push(job)
      })

      jobTitleAnalysis.similar_roles = Object.entries(roleGroups)
        .filter(([_, data]) => data.openai.length > 0 || data.anthropic.length > 0)
        .map(([roleType, data]) => {
          const openaiWithSalary = data.openai.filter(j => j.salary_max)
          const anthropicWithSalary = data.anthropic.filter(j => j.salary_max)
          
          return {
            role_type: roleType,
            openai_count: data.openai.length,
            anthropic_count: data.anthropic.length,
            openai_avg_salary: openaiWithSalary.length > 0 ? 
              Math.round(openaiWithSalary.reduce((sum, j) => sum + (j.salary_max || 0), 0) / openaiWithSalary.length) : undefined,
            anthropic_avg_salary: anthropicWithSalary.length > 0 ? 
              Math.round(anthropicWithSalary.reduce((sum, j) => sum + (j.salary_max || 0), 0) / anthropicWithSalary.length) : undefined
          }
        })
        .sort((a, b) => (a.openai_count + a.anthropic_count) - (b.openai_count + b.anthropic_count))
        .reverse()

      // Generate insights
      insights.push(`💰 ${salaryComparison.winner} 平均薪资更高，差距约 $${salaryComparison.difference}k`)
      insights.push(`📊 OpenAI 有 ${openai.total_jobs} 个职位，Anthropic 有 ${anthropic.total_jobs} 个职位`)
      
      if (skillOverlap.common_skills.length > 0) {
        insights.push(`🔗 共同技能要求：${skillOverlap.common_skills.slice(0, 3).join(', ')}`)
      }
      
      const topRole = jobTitleAnalysis.similar_roles[0]
      if (topRole) {
        insights.push(`👥 最常见角色是 ${topRole.role_type}，OpenAI ${topRole.openai_count} 个，Anthropic ${topRole.anthropic_count} 个`)
      }

      if (openai.highest_salary! > anthropic.highest_salary!) {
        insights.push(`🏆 OpenAI 最高薪资达 $${openai.highest_salary}k，高于 Anthropic 的 $${anthropic.highest_salary}k`)
      } else if (anthropic.highest_salary! > openai.highest_salary!) {
        insights.push(`🏆 Anthropic 最高薪资达 $${anthropic.highest_salary}k，高于 OpenAI 的 $${openai.highest_salary}k`)
      }
    } else if (companies.length === 1) {
      insights.push(`📊 目前只有 ${companies[0].name} 的数据`)
      insights.push(`💼 总计 ${companies[0].total_jobs} 个职位，其中 ${companies[0].jobs_with_salary} 个有薪资信息`)
      if (companies[0].avg_salary_max) {
        insights.push(`💰 平均薪资范围：$${companies[0].avg_salary_min}k - $${companies[0].avg_salary_max}k`)
      }
    }

    const result: ComparisonResult = {
      companies,
      comparison: {
        salary_comparison: salaryComparison,
        skill_overlap: skillOverlap,
        job_title_analysis: jobTitleAnalysis,
        insights
      }
    }

    res.status(200).json(result)

  } catch (error) {
    console.error('Comparison error:', error)
    res.status(500).json({ 
      error: 'Failed to compare companies'
    })
  }
}