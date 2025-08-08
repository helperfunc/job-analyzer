import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface JobListing {
  title: string
  url: string
  company: string
  location: string
  department?: string
  salary_min?: number
  salary_max?: number
  skills?: string[]
  description?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { urls } = req.body

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'URLs array is required' })
  }

  try {
    const detailedJobs: JobListing[] = []
    const skillsCount: { [skill: string]: number } = {}
    
    // Process each URL
    for (const url of urls.slice(0, 20)) { // Limit to 20 jobs
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        
        if (!response.ok) continue
        
        const html = await response.text()
        const $ = cheerio.load(html)
        
        // Remove scripts and styles
        $('script, style').remove()
        
        // Get structured data
        let jobText = ''
        const structuredData = $('script[type="application/ld+json"]').text()
        if (structuredData) {
          jobText += structuredData + '\n\n'
        }
        
        // Get page text
        const bodyText = $('body').text()
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 4000)
        
        jobText += bodyText
        
        // Analyze with AI
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `Extract job information from the text. Return valid JSON only with these fields:
- title: job title (string)
- company: company name (string)
- location: job location (string)
- department: department or team (string)
- salary_min: minimum salary in thousands USD (number, e.g., 405 for $405K)
- salary_max: maximum salary in thousands USD (number, e.g., 590 for $590K)
- skills: array of technical skills mentioned (focus on programming languages, frameworks, tools)
- description: brief job description (max 200 chars)

IMPORTANT: Look for salary in various formats:
- "$405K – $590K" → salary_min: 405, salary_max: 590
- "$150,000 - $200,000" → salary_min: 150, salary_max: 200
- "150k-200k" → salary_min: 150, salary_max: 200
- "$405K – $590K + Offers Equity" → salary_min: 405, salary_max: 590

If no salary mentioned, return null for salary fields, do NOT estimate.`
            },
            {
              role: "user",
              content: `Extract job information from:\n\n${jobText}`
            }
          ],
          temperature: 0,
          max_tokens: 500,
        })
        
        const responseContent = completion.choices[0].message.content
        if (!responseContent) continue
        
        try {
          const parsed = JSON.parse(responseContent)
          
          // Add URL and ensure required fields
          parsed.url = url
          
          // Handle salary properly
          if (parsed.salary_min !== null && parsed.salary_min !== undefined) {
            parsed.salary_min = Number(parsed.salary_min)
          }
          if (parsed.salary_max !== null && parsed.salary_max !== undefined) {
            parsed.salary_max = Number(parsed.salary_max)
          }
          
          // Only estimate if no salary info at all
          if (!parsed.salary_min && !parsed.salary_max) {
            const titleLower = parsed.title?.toLowerCase() || ''
            if (titleLower.includes('principal') || titleLower.includes('staff')) {
              parsed.salary_min = 300
              parsed.salary_max = 500
            } else if (titleLower.includes('senior') || titleLower.includes('lead')) {
              parsed.salary_min = 200
              parsed.salary_max = 350
            } else if (titleLower.includes('manager') || titleLower.includes('director')) {
              parsed.salary_min = 250
              parsed.salary_max = 400
            } else {
              parsed.salary_min = 120
              parsed.salary_max = 200
            }
          }
          
          parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : []
          
          // Count skills
          parsed.skills.forEach((skill: string) => {
            skillsCount[skill] = (skillsCount[skill] || 0) + 1
          })
          
          detailedJobs.push(parsed)
        } catch (e) {
          console.error('Failed to parse job details:', e)
        }
      } catch (error) {
        console.error(`Error processing ${url}:`, error)
      }
    }
    
    // Sort and analyze
    const jobsWithSalary = detailedJobs.filter(job => job.salary_min)
    jobsWithSalary.sort((a, b) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0))
    
    const highestPaying = jobsWithSalary.slice(0, 5)
    const lowestPaying = jobsWithSalary.slice(-5).reverse()
    
    const totalSalary = jobsWithSalary.reduce((sum, job) => {
      const avgSalary = ((job.salary_min || 0) + (job.salary_max || job.salary_min || 0)) / 2
      return sum + avgSalary
    }, 0)
    const averageSalary = jobsWithSalary.length > 0 ? Math.round(totalSalary / jobsWithSalary.length) : 0
    
    // Sort skills
    const sortedSkills = Object.entries(skillsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }))
    
    // Categorize skills
    const programmingLanguages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB']
    const frameworks = ['React', 'Angular', 'Vue', 'Django', 'Flask', 'Spring', 'Express', 'FastAPI', 'Rails', 'Laravel', '.NET', 'Node.js', 'Next.js', 'TensorFlow', 'PyTorch', 'Keras']
    const tools = ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'Jenkins', 'Terraform', 'Ansible', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Kafka']
    
    const categorizedSkills = {
      programming_languages: [] as string[],
      frameworks: [] as string[],
      tools: [] as string[],
      other: [] as string[]
    }
    
    Object.keys(skillsCount).forEach(skill => {
      const skillLower = skill.toLowerCase()
      if (programmingLanguages.some(lang => skillLower.includes(lang.toLowerCase()))) {
        categorizedSkills.programming_languages.push(skill)
      } else if (frameworks.some(fw => skillLower.includes(fw.toLowerCase()))) {
        categorizedSkills.frameworks.push(skill)
      } else if (tools.some(tool => skillLower.includes(tool.toLowerCase()))) {
        categorizedSkills.tools.push(skill)
      } else {
        categorizedSkills.other.push(skill)
      }
    })
    
    // Location analysis
    const locationCount: { [location: string]: number } = {}
    detailedJobs.forEach(job => {
      if (job.location) {
        locationCount[job.location] = (locationCount[job.location] || 0) + 1
      }
    })
    
    res.status(200).json({
      total_jobs: detailedJobs.length,
      jobs: detailedJobs,
      salary_insights: {
        highest_paying: highestPaying,
        lowest_paying: lowestPaying,
        average_salary: averageSalary,
        salary_range: {
          min: Math.min(...jobsWithSalary.map(j => j.salary_min || 0)),
          max: Math.max(...jobsWithSalary.map(j => j.salary_max || j.salary_min || 0))
        }
      },
      skills_analysis: {
        most_common: sortedSkills,
        by_category: categorizedSkills
      },
      location_analysis: locationCount
    })
  } catch (error) {
    console.error('Error analyzing jobs:', error)
    res.status(500).json({ 
      error: 'Failed to analyze jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}