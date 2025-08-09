import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
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
  description?: string
  skills?: string[]
}

// Conservative skill inference based on job titles only (no web scraping needed)
function inferSkillsFromTitle(title: string): string[] {
  const skills: string[] = []
  const lowerTitle = title.toLowerCase()
  
  // Only add skills when they're clearly indicated in the job title
  if (lowerTitle.includes('frontend') || lowerTitle.includes('front-end')) {
    skills.push('React', 'JavaScript', 'HTML/CSS')
  }
  
  if (lowerTitle.includes('backend') || lowerTitle.includes('back-end')) {
    skills.push('Python', 'Go', 'SQL')
  }
  
  if (lowerTitle.includes('full stack') || lowerTitle.includes('fullstack')) {
    skills.push('JavaScript', 'React', 'Python', 'SQL')
  }
  
  if (lowerTitle.includes('machine learning') || lowerTitle.includes('ml')) {
    skills.push('Python', 'PyTorch', 'Machine Learning')
  }
  
  if (lowerTitle.includes('ai') || lowerTitle.includes('artificial intelligence')) {
    skills.push('Python', 'Machine Learning', 'PyTorch')
  }
  
  if (lowerTitle.includes('data') && (lowerTitle.includes('scientist') || lowerTitle.includes('engineer'))) {
    skills.push('Python', 'SQL', 'Machine Learning')
  }
  
  if (lowerTitle.includes('infrastructure') || lowerTitle.includes('devops') || lowerTitle.includes('sre')) {
    skills.push('Kubernetes', 'Docker', 'AWS', 'Linux/Unix')
  }
  
  if (lowerTitle.includes('security')) {
    skills.push('Python', 'Linux/Unix')
  }
  
  if (lowerTitle.includes('mobile') || lowerTitle.includes('ios') || lowerTitle.includes('android')) {
    if (lowerTitle.includes('ios')) skills.push('Swift')
    if (lowerTitle.includes('android')) skills.push('Java')
  }
  
  // Data center specific skills
  if (lowerTitle.includes('data center') || lowerTitle.includes('datacenter') || lowerTitle.includes('stargate')) {
    skills.push('MEP Systems', 'Data Center Design', 'Power Systems', 'Project Management')
  }
  
  return skills
}

// Extract salary from job description text
function extractSalaryFromText(text: string): { salary?: string; min?: number; max?: number } {
  const salaryPatterns = [
    // Range patterns like "$200K - $300K"
    /\$(\d{3,})[Kk]?\s*[-–—]\s*\$?(\d{3,})[Kk]?/i,
    // Single salary with "Offers Equity" like "$325K + Offers Equity"  
    /\$(\d{3,})[Kk]?\s*\+\s*Offers?\s*Equity/i,
    // Simple single salary like "$250K"
    /\$(\d{3,})[Kk]?(?!\s*[-–—])/i,
  ]
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      if (match[2]) {
        // Range pattern
        const min = parseInt(match[1])
        const max = parseInt(match[2])
        return {
          salary: `$${min}K - $${max}K`,
          min,
          max
        }
      } else {
        // Single salary
        const salary = parseInt(match[1])
        return {
          salary: `$${salary}K`,
          min: salary,
          max: salary
        }
      }
    }
  }
  
  return {}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { url } = req.body
  
  if (!url || !url.includes('openai.com/careers')) {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  
  let browser = null
  
  try {
    console.log('🚀 Starting Puppeteer browser...')
    
    // Launch Puppeteer with settings to bypass Cloudflare
    browser = await puppeteer.launch({
      headless: false, // Set to false to see what's happening
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    })
    
    const page = await browser.newPage()
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })
    
    console.log('📄 Navigating to OpenAI careers page...')
    
    // Navigate to the page and wait for it to load
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
    
    // Wait a bit for any JavaScript to complete
    await page.waitForTimeout(5000)
    
    console.log('📊 Extracting job listings...')
    
    // Get the HTML content
    const html = await page.content()
    
    // Save the actual HTML for debugging
    const debugDir = path.join(process.cwd(), 'debug')
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir)
    }
    fs.writeFileSync(path.join(debugDir, `real-careers-page-${Date.now()}.html`), html)
    
    // Parse with Cheerio
    const $ = cheerio.load(html)
    const jobs: Job[] = []
    
    // Look for job postings in the HTML
    // Try multiple selectors that OpenAI might use
    const jobSelectors = [
      'a[href*="/careers/"]',
      '.job-listing',
      '[data-testid*="job"]',
      '.career-posting',
      'div:contains("Engineer")',
      'div:contains("Scientist")',
      'div:contains("Manager")'
    ]
    
    const jobLinks: { title: string; url: string; location: string }[] = []
    
    for (const selector of jobSelectors) {
      $(selector).each((i, elem) => {
        const $elem = $(elem)
        let href = $elem.attr('href') || ''
        const text = $elem.text().trim()
        
        // Normalize URL
        if (href.startsWith('/')) {
          href = 'https://openai.com' + href
        }
        
        // Check if this looks like a job posting
        if (href.includes('/careers/') && href !== url && text && text.length > 5) {
          // Try to extract location from surrounding context
          let location = 'San Francisco' // default
          const parentText = $elem.parent().text().toLowerCase()
          
          if (parentText.includes('seattle')) location = 'Seattle'
          else if (parentText.includes('new york')) location = 'New York'
          else if (parentText.includes('london')) location = 'London'
          else if (parentText.includes('dublin')) location = 'Dublin'
          
          jobLinks.push({
            title: text,
            url: href,
            location
          })
        }
      })
    }
    
    // Remove duplicates
    const uniqueJobs = Array.from(
      new Map(jobLinks.map(job => [job.url, job])).values()
    )
    
    console.log(`📋 Found ${uniqueJobs.length} unique job listings`)
    
    // Process each job (conservative approach - no individual page scraping)
    for (const jobLink of uniqueJobs) {
      // Infer department from title
      let department = 'Engineering'
      const title = jobLink.title.toLowerCase()
      
      if (title.includes('research') || title.includes('scientist')) department = 'Research'
      else if (title.includes('manager') || title.includes('director')) department = 'Management'
      else if (title.includes('sales') || title.includes('account')) department = 'Sales'
      else if (title.includes('security')) department = 'Security'
      else if (title.includes('data')) department = 'Data'
      else if (title.includes('product')) department = 'Product'
      
      // Get skills based on title only (conservative approach)
      const skills = inferSkillsFromTitle(jobLink.title)
      
      const job: Job = {
        title: jobLink.title,
        url: jobLink.url,
        location: jobLink.location,
        department,
        description: `Job details available at ${jobLink.url}`, // Placeholder since we can't access individual pages
        skills
      }
      
      jobs.push(job)
      console.log(`✅ Processed: ${jobLink.title} (${skills.length} skills)`)
    }
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `openai-jobs-puppeteer-${timestamp}.json`
    const filepath = path.join(process.cwd(), 'data', filename)
    
    // Ensure data directory exists
    const dataDir = path.dirname(filepath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // Generate summary
    const jobsWithSalary = jobs.filter(job => job.salary_min || job.salary_max).length
    const highestPayingJobs = jobs
      .filter(job => job.salary_max)
      .sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0))
      .slice(0, 20)
    
    // Generate skill statistics
    const skillCounts: { [key: string]: number } = {}
    jobs.forEach(job => {
      job.skills?.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1
      })
    })
    
    const mostCommonSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }))
    
    const result = {
      success: true,
      method: 'Real Puppeteer (title-based skills)',
      timestamp: new Date().toISOString(),
      jobs,
      summary: {
        total_jobs: jobs.length,
        jobs_with_salary: jobsWithSalary,
        highest_paying_jobs: highestPayingJobs,
        most_common_skills: mostCommonSkills
      }
    }
    
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2))
    
    console.log(`✅ Saved ${jobs.length} jobs to ${filename}`)
    
    return res.status(200).json({
      success: true,
      message: `Successfully scraped ${jobs.length} jobs using real Puppeteer`,
      filepath: filename,
      summary: result.summary
    })
    
  } catch (error) {
    console.error('❌ Scraping error:', error)
    return res.status(500).json({ 
      error: 'Scraping failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  } finally {
    if (browser) {
      console.log('🔒 Closing browser...')
      await browser.close()
    }
  }
}