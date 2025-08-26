import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../lib/supabase'

interface CompanyStats {
  name: string
  total_jobs: number
  jobs_with_salary: number
  avg_salary_min?: number
  avg_salary_max?: number
  highest_salary?: number
  lowest_salary?: number
  top_skills: { skill: string; count: number; percentage: number }[]
  departments: { department: string; count: number }[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { companies } = req.body

  if (!companies || !Array.isArray(companies) || companies.length < 2) {
    return res.status(400).json({ 
      error: 'Please select at least 2 companies to compare' 
    })
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
    
    if (!isSupabaseAvailable()) {
      return res.status(503).json({ 
        error: 'Database not configured' 
      })
    }

    const companyStats: CompanyStats[] = []

    // Get stats for each company
    for (const company of companies) {
      // Get all jobs for this company (case-insensitive)
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .ilike('company', company)

      if (error) throw error

      if (!jobs || jobs.length === 0) {
        continue
      }

      // Calculate salary stats
      const jobsWithSalary = jobs.filter(j => j.salary_min && j.salary_max)
      const avgSalaryMin = jobsWithSalary.length > 0 
        ? jobsWithSalary.reduce((sum, j) => sum + (j.salary_min || 0), 0) / jobsWithSalary.length 
        : undefined
      const avgSalaryMax = jobsWithSalary.length > 0 
        ? jobsWithSalary.reduce((sum, j) => sum + (j.salary_max || 0), 0) / jobsWithSalary.length 
        : undefined

      // Count skills
      const skillCounts: { [key: string]: number } = {}
      jobs.forEach(job => {
        if (job.skills && Array.isArray(job.skills)) {
          job.skills.forEach((skill: string) => {
            const normalizedSkill = skill.trim().toLowerCase()
            skillCounts[normalizedSkill] = (skillCounts[normalizedSkill] || 0) + 1
          })
        }
      })

      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([skill, count]) => ({
          skill: skill.charAt(0).toUpperCase() + skill.slice(1),
          count,
          percentage: Math.round((count / jobs.length) * 100)
        }))

      // Count departments
      const deptCounts: { [key: string]: number } = {}
      jobs.forEach(job => {
        if (job.department) {
          deptCounts[job.department] = (deptCounts[job.department] || 0) + 1
        }
      })

      const departments = Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([department, count]) => ({ department, count }))

      // Use the actual company name from the first job (to preserve original casing)
      const actualCompanyName = jobs[0].company || company
      
      companyStats.push({
        name: actualCompanyName,
        total_jobs: jobs.length,
        jobs_with_salary: jobsWithSalary.length,
        avg_salary_min: avgSalaryMin ? Math.round(avgSalaryMin) : undefined,
        avg_salary_max: avgSalaryMax ? Math.round(avgSalaryMax) : undefined,
        highest_salary: jobsWithSalary.length > 0 
          ? Math.max(...jobsWithSalary.map(j => j.salary_max || 0)) 
          : undefined,
        lowest_salary: jobsWithSalary.length > 0 
          ? Math.min(...jobsWithSalary.map(j => j.salary_min || Infinity).filter(s => s !== Infinity)) 
          : undefined,
        top_skills: topSkills,
        departments
      })
    }

    if (companyStats.length < 2) {
      return res.status(400).json({ 
        error: 'Not enough companies with job data to compare' 
      })
    }

    // Generate comparison insights
    const insights: string[] = []
    
    // Sort by total jobs
    const sortedByJobs = [...companyStats].sort((a, b) => b.total_jobs - a.total_jobs)
    insights.push(`📊 ${sortedByJobs[0].name} has the most jobs with ${sortedByJobs[0].total_jobs} positions`)

    // Salary comparison
    const companiesWithSalary = companyStats.filter(c => c.avg_salary_max)
    if (companiesWithSalary.length >= 2) {
      const sortedBySalary = [...companiesWithSalary].sort((a, b) => {
        const avgA = ((a.avg_salary_min || 0) + (a.avg_salary_max || 0)) / 2
        const avgB = ((b.avg_salary_min || 0) + (b.avg_salary_max || 0)) / 2
        return avgB - avgA
      })
      
      const topSalaryCompany = sortedBySalary[0]
      const avgSalary = ((topSalaryCompany.avg_salary_min || 0) + (topSalaryCompany.avg_salary_max || 0)) / 2
      insights.push(`💰 ${topSalaryCompany.name} offers the highest average salary at ~$${Math.round(avgSalary)}k`)
    }

    // Skill overlap analysis
    const allSkills = new Map<string, Set<string>>()
    companyStats.forEach(company => {
      company.top_skills.forEach(skill => {
        const key = skill.skill.toLowerCase()
        if (!allSkills.has(key)) {
          allSkills.set(key, new Set())
        }
        allSkills.get(key)!.add(company.name)
      })
    })

    const commonSkills = Array.from(allSkills.entries())
      .filter(([_, companies]) => companies.size >= 2)
      .map(([skill, _]) => skill)

    if (commonSkills.length > 0) {
      insights.push(`🔗 Common skills across companies: ${commonSkills.slice(0, 3).join(', ')}`)
    }

    // Find company with most diverse departments
    const sortedByDepts = [...companyStats].sort((a, b) => b.departments.length - a.departments.length)
    if (sortedByDepts[0].departments.length > 0) {
      insights.push(`🏢 ${sortedByDepts[0].name} has the most diverse departments with ${sortedByDepts[0].departments.length} different teams`)
    }

    res.status(200).json({
      success: true,
      companies: companyStats,
      insights,
      skillOverlap: {
        common: commonSkills.slice(0, 10),
        byCompany: Object.fromEntries(
          companyStats.map(company => [
            company.name,
            company.top_skills.map(s => s.skill.toLowerCase())
              .filter(skill => !commonSkills.includes(skill))
              .slice(0, 10)
          ])
        )
      }
    })

  } catch (error) {
    console.error('Comparison error:', error)
    res.status(500).json({ 
      error: 'Failed to compare companies',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}