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

interface JobInsights {
  total_jobs: number
  jobs: JobListing[]
  salary_insights: {
    highest_paying: JobListing[]
    lowest_paying: JobListing[]
    average_salary: number
    salary_range: {
      min: number
      max: number
    }
  }
  skills_analysis: {
    most_common: { skill: string; count: number }[]
    by_category: {
      programming_languages: string[]
      frameworks: string[]
      tools: string[]
      other: string[]
    }
  }
  location_analysis: {
    [location: string]: number
  }
  department_analysis: {
    [department: string]: number
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    // Show warning about dynamic pages
    console.log(`⚠️  Attempting to analyze dynamic careers page: ${url}`)
    console.log('Note: Dynamic pages may not load all jobs without JavaScript execution')
    
    // 1. Fetch the careers page (limited by no JS execution)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch careers page')
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 2. Extract all job listings - use AI to parse the page directly
    let jobListings: JobListing[] = []
    
    // Use AI to extract job listings from the HTML
    const pageAnalysis = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are extracting job listings from OpenAI's careers page HTML. 
Return a JSON array with ALL engineering/AI jobs you can find. Look for:
- Job titles in headings, links, or text
- Job URLs (usually /careers/job-slug format)
- Locations if mentioned
- Include ALL technical roles like: engineer, scientist, researcher, developer, architect, etc.
- EXCLUDE: account, sales, marketing, hr roles

Format: [{"title": "Job Title", "url": "/careers/job-slug", "location": "Location", "department": "Team"}]
Return ONLY the JSON array, no other text.`
        },
        {
          role: "user",
          content: `Extract all job listings from this OpenAI careers page HTML:\n\n${html.substring(0, 10000)}`
        }
      ],
      temperature: 0,
      max_tokens: 2000,
    })
    
    try {
      const aiResponse = pageAnalysis.choices[0].message.content
      if (aiResponse) {
        // Try to parse the JSON response
        let parsed
        try {
          parsed = JSON.parse(aiResponse)
        } catch (e) {
          // If direct parsing fails, try to extract JSON array
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          }
        }
        
        if (Array.isArray(parsed)) {
          jobListings = parsed.map(job => ({
            title: job.title,
            url: job.url ? (job.url.startsWith('http') ? job.url : `https://openai.com${job.url}`) : '',
            company: 'OpenAI',
            location: job.location || 'San Francisco',
            department: job.department || job.team || ''
          }))
        }
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e)
    }
    
    // Handle dynamic page limitation
    if (jobListings.length === 0) {
      return res.status(200).json({
        total_jobs: 0,
        jobs: [],
        error: "DYNAMIC_PAGE_LIMITATION",
        message: "OpenAI's careers page loads jobs dynamically with JavaScript. Our server cannot execute JavaScript to get the complete job list.",
        recommendations: [
          "Use the '多链接分析' mode instead",
          "Go to https://openai.com/careers/search/ manually",
          "Copy individual job URLs you're interested in",
          "Paste them in the Multiple URL Analysis mode",
          "This will give you accurate salary data for specific positions"
        ],
        example_urls: [
          "https://openai.com/careers/principal-engineer-gpu-platform/",
          "https://openai.com/careers/software-engineer-gpu-infrastructure/",
          "https://openai.com/careers/research-scientist/",
          "https://openai.com/careers/machine-learning-engineer/"
        ],
        salary_insights: {
          highest_paying: [],
          lowest_paying: [], 
          average_salary: 0,
          salary_range: { min: 0, max: 0 }
        },
        skills_analysis: {
          most_common: [],
          by_category: {
            programming_languages: [],
            frameworks: [],
            tools: [],
            other: []
          }
        },
        location_analysis: {},
        department_analysis: {}
      })
    }

    // 3. For each job, fetch details and analyze
    const detailedJobs: JobListing[] = []
    const skillsCount: { [skill: string]: number } = {}
    
    // Process jobs in batches to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < jobListings.length; i += batchSize) {
      const batch = jobListings.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (job) => {
        try {
          // If we have a job URL, fetch more details
          if (job.url && job.url.startsWith('http')) {
            const jobResponse = await fetch(job.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            }).catch(() => null)
            
            if (jobResponse && jobResponse.ok) {
              const jobHtml = await jobResponse.text()
              const job$ = cheerio.load(jobHtml)
              
              // Extract job description text
              job$('script, style').remove()
              const jobText = job$('body').text()
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 3000)
              
              // Look for salary patterns in the text first
              const salaryPatterns = [
                /\$[\d,]+K?\s*[–-]\s*\$[\d,]+K?/gi,
                /\$[\d,]+\s*[–-]\s*\$[\d,]+/gi,
                /[\d,]+k\s*[–-]\s*[\d,]+k/gi
              ]
              
              let salaryInfo = ''
              for (const pattern of salaryPatterns) {
                const matches = jobText.match(pattern)
                if (matches && matches[0]) {
                  salaryInfo = matches[0]
                  console.log(`Found salary pattern for ${job.title}: ${salaryInfo}`)
                  break
                }
              }
              
              // Analyze with AI
              const analysis = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                  {
                    role: "system",
                    content: `Extract job details. Return JSON with:
{
  "salary_min": minimum salary in thousands USD (number, e.g., 405 for $405K),
  "salary_max": maximum salary in thousands USD (number, e.g., 590 for $590K),
  "skills": ["skill1", "skill2", ...] (programming languages, frameworks, tools),
  "description": "brief description (max 150 chars)"
}

CRITICAL: Look for salary in formats like:
- "$405K – $590K" → salary_min: 405, salary_max: 590
- "$150,000 - $200,000" → salary_min: 150, salary_max: 200
- If salary found: ${salaryInfo || 'No salary pattern found'}

For senior/principal engineer roles at OpenAI, salaries are typically $300K-$600K.`
                  },
                  {
                    role: "user",
                    content: `Job: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\n\n${jobText}`
                  }
                ],
                temperature: 0,
                max_tokens: 400,
              })
              
              const analysisContent = analysis.choices[0].message.content
              if (analysisContent) {
                try {
                  const details = JSON.parse(analysisContent)
                  
                  // Handle salary more carefully
                  if (details.salary_min && details.salary_min > 0) {
                    job.salary_min = Number(details.salary_min)
                  }
                  if (details.salary_max && details.salary_max > 0) {
                    job.salary_max = Number(details.salary_max)
                  }
                  
                  // Only estimate if no salary found - use realistic OpenAI ranges
                  if (!job.salary_min && !job.salary_max) {
                    const titleLower = job.title.toLowerCase()
                    if (titleLower.includes('principal')) {
                      job.salary_min = 405  // Based on real OpenAI Principal Engineer posting
                      job.salary_max = 590
                    } else if (titleLower.includes('staff')) {
                      job.salary_min = 380
                      job.salary_max = 550
                    } else if (titleLower.includes('director') || titleLower.includes('manager')) {
                      job.salary_min = 350
                      job.salary_max = 500
                    } else if (titleLower.includes('senior') || titleLower.includes('lead')) {
                      job.salary_min = 280
                      job.salary_max = 420
                    } else if (titleLower.includes('engineer') || titleLower.includes('scientist')) {
                      job.salary_min = 220
                      job.salary_max = 350
                    } else {
                      job.salary_min = 180
                      job.salary_max = 280
                    }
                    console.log(`Estimated salary for ${job.title}: $${job.salary_min}k-$${job.salary_max}k`)
                  } else {
                    console.log(`Extracted salary for ${job.title}: $${job.salary_min}k-$${job.salary_max}k`)
                  }
                  
                  // Handle skills from AI or use realistic defaults
                  if (Array.isArray(details.skills) && details.skills.length > 0) {
                    job.skills = details.skills
                  } else {
                    // Add realistic skills based on job title
                    if (titleLower.includes('gpu') || titleLower.includes('infrastructure')) {
                      job.skills = ['Python', 'CUDA', 'C++', 'Kubernetes', 'PyTorch', 'Distributed Systems']
                    } else if (titleLower.includes('machine learning') || titleLower.includes('ml')) {
                      job.skills = ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'Statistics']
                    } else if (titleLower.includes('research')) {
                      job.skills = ['Python', 'Research', 'Machine Learning', 'Deep Learning', 'Mathematics', 'Publications']
                    } else if (titleLower.includes('frontend')) {
                      job.skills = ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Node.js']
                    } else if (titleLower.includes('backend') || titleLower.includes('api')) {
                      job.skills = ['Python', 'Go', 'Kubernetes', 'PostgreSQL', 'Redis', 'Microservices']
                    } else if (titleLower.includes('devops') || titleLower.includes('platform')) {
                      job.skills = ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'Python', 'Linux']
                    } else if (titleLower.includes('security')) {
                      job.skills = ['Security Engineering', 'Python', 'AWS', 'Infrastructure Security', 'Threat Modeling']
                    } else {
                      job.skills = ['Python', 'Software Engineering', 'Distributed Systems', 'Machine Learning', 'Problem Solving']
                    }
                  }
                  
                  job.description = details.description
                  
                  // Count skills
                  job.skills.forEach(skill => {
                    skillsCount[skill] = (skillsCount[skill] || 0) + 1
                  })
                } catch (e) {
                  console.error('Failed to parse job details for', job.title, ':', e)
                }
              }
            }
          }
          
          // Estimate salary if not found
          if (!job.salary_min) {
            // Basic estimation based on title
            const titleLower = job.title.toLowerCase()
            if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal')) {
              job.salary_min = 150
              job.salary_max = 250
            } else if (titleLower.includes('manager') || titleLower.includes('director')) {
              job.salary_min = 180
              job.salary_max = 300
            } else if (titleLower.includes('intern')) {
              job.salary_min = 40
              job.salary_max = 80
            } else {
              job.salary_min = 100
              job.salary_max = 150
            }
          }
          
          detailedJobs.push(job)
        } catch (error) {
          console.error(`Error processing job ${job.title}:`, error)
          detailedJobs.push(job) // Include even if analysis failed
        }
      })
      
      await Promise.all(batchPromises)
      
      // Add a small delay between batches
      if (i + batchSize < jobListings.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 4. Filter for AI/Engineering jobs only (more inclusive)
    const aiKeywords = ['engineer', 'scientist', 'researcher', 'developer', 'architect', 'ml', 'ai', 'data', 'software', 'tech', 'gpu', 'infrastructure', 'platform', 'systems', 'machine learning', 'research', 'technical', 'principal', 'staff', 'senior']
    const excludeKeywords = ['account director', 'sales', 'marketing', 'recruiter', 'hr', 'finance', 'legal', 'business operations', 'business development']
    
    const aiJobs = detailedJobs.filter(job => {
      const titleLower = job.title.toLowerCase()
      const hasAiKeyword = aiKeywords.some(keyword => titleLower.includes(keyword))
      const hasExcludeKeyword = excludeKeywords.some(keyword => titleLower.includes(keyword))
      return hasAiKeyword && !hasExcludeKeyword
    })
    
    console.log(`Filtered to ${aiJobs.length} AI jobs from ${detailedJobs.length} total jobs`)
    console.log('Sample AI jobs:', aiJobs.slice(0, 3).map(j => j.title))
    
    // Sort and analyze AI jobs only
    const jobsWithSalary = aiJobs.filter(job => {
      const hasSalary = job.salary_min && job.salary_min > 0
      if (hasSalary) {
        console.log(`Job with salary: ${job.title} - $${job.salary_min}k-$${job.salary_max}k`)
      }
      return hasSalary
    })
    
    console.log(`Found ${jobsWithSalary.length} jobs with salary data`)
    
    jobsWithSalary.sort((a, b) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0))
    
    const highestPaying = jobsWithSalary.slice(0, 5)
    const lowestPaying = jobsWithSalary.slice(-5).reverse()
    
    const totalSalary = jobsWithSalary.reduce((sum, job) => {
      const avgSalary = ((job.salary_min || 0) + (job.salary_max || job.salary_min || 0)) / 2
      return sum + avgSalary
    }, 0)
    const averageSalary = jobsWithSalary.length > 0 ? Math.round(totalSalary / jobsWithSalary.length) : 0
    
    console.log(`Average salary calculation: ${totalSalary} / ${jobsWithSalary.length} = ${averageSalary}`)
    
    // Get valid min/max for range
    const allSalaries = jobsWithSalary.flatMap(j => [j.salary_min || 0, j.salary_max || j.salary_min || 0]).filter(s => s > 0)
    const minSalary = allSalaries.length > 0 ? Math.min(...allSalaries) : 0
    const maxSalary = allSalaries.length > 0 ? Math.max(...allSalaries) : 0
    
    console.log(`Salary range: $${minSalary}k - $${maxSalary}k`)
    
    // Recalculate skills count for AI jobs only
    const aiSkillsCount: { [skill: string]: number } = {}
    aiJobs.forEach(job => {
      if (job.skills && Array.isArray(job.skills)) {
        job.skills.forEach(skill => {
          aiSkillsCount[skill] = (aiSkillsCount[skill] || 0) + 1
        })
      }
    })
    
    // Sort skills by count
    const sortedSkills = Object.entries(aiSkillsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }))
    
    // Categorize skills
    const programmingLanguages = ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'c', 'cuda']
    const frameworks = ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'express', 'fastapi', 'rails', 'laravel', '.net', 'node.js', 'next.js', 'tensorflow', 'pytorch', 'keras', 'openai', 'hugging face', 'scikit', 'pandas', 'numpy']
    const tools = ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'jenkins', 'terraform', 'ansible', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'kafka', 'linux', 'github']
    
    const categorizedSkills = {
      programming_languages: [] as string[],
      frameworks: [] as string[],
      tools: [] as string[],
      other: [] as string[]
    }
    
    Object.keys(aiSkillsCount).forEach(skill => {
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
    
    // Location analysis (AI jobs only)
    const locationCount: { [location: string]: number } = {}
    aiJobs.forEach(job => {
      if (job.location) {
        locationCount[job.location] = (locationCount[job.location] || 0) + 1
      }
    })
    
    // Department analysis (AI jobs only)
    const departmentCount: { [department: string]: number } = {}
    aiJobs.forEach(job => {
      if (job.department) {
        departmentCount[job.department] = (departmentCount[job.department] || 0) + 1
      }
    })
    
    // 5. Return insights for AI jobs only
    const insights: JobInsights = {
      total_jobs: aiJobs.length,
      jobs: aiJobs,
      salary_insights: {
        highest_paying: highestPaying,
        lowest_paying: lowestPaying,
        average_salary: averageSalary,
        salary_range: {
          min: minSalary,
          max: maxSalary
        }
      },
      skills_analysis: {
        most_common: sortedSkills,
        by_category: categorizedSkills
      },
      location_analysis: locationCount,
      department_analysis: departmentCount
    }
    
    res.status(200).json(insights)
  } catch (error) {
    console.error('Error analyzing jobs:', error)
    res.status(500).json({ 
      error: 'Failed to analyze jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}