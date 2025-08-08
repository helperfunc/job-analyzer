import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'

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

// Extract salary from text
function extractSalary(text: string): { salary?: string; min?: number; max?: number } {
  // Look for salary range patterns first (higher priority)
  const rangeSalaryPatterns = [
    /\$(\d{3,})[Kk]?\s*[-–]\s*\$(\d{3,})[Kk]?/,
    /\$(\d{3,}),(\d{3})\s*[-–]\s*\$(\d{3,}),(\d{3})/,
    /USD\s*(\d{3,})[Kk]?\s*[-–]\s*(\d{3,})[Kk]?/
  ]
  
  for (const pattern of rangeSalaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      let min, max
      if (match[0].includes(',')) {
        min = parseInt(match[1] + match[2]) / 1000
        max = parseInt(match[3] + match[4]) / 1000
      } else {
        min = parseInt(match[1])
        max = parseInt(match[2])
        if (!match[0].toLowerCase().includes('k') && min < 1000) {
          // keep as is
        } else if (!match[0].toLowerCase().includes('k') && min > 1000) {
          min = min / 1000
          max = max / 1000
        }
      }
      return {
        salary: match[0],
        min: Math.round(min),
        max: Math.round(max)
      }
    }
  }
  
  // Look for single salary patterns
  const singleSalaryPatterns = [
    /\$(\d{3,})[Kk]?\s*\+\s*Offers?\s*Equity/i,
    /\$(\d{3,})[Kk]?\s*\+/i,
    /\$(\d{3,})[Kk]?(?!\s*[-–])/i
  ]
  
  for (const pattern of singleSalaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      let amount = parseInt(match[1])
      
      if (match[0].toLowerCase().includes('k')) {
        // Already in thousands
      } else if (amount > 1000) {
        amount = amount / 1000
      }
      
      const min = Math.round(amount * 0.8)
      const max = Math.round(amount * 1.2)
      
      return {
        salary: match[0],
        min,
        max
      }
    }
  }
  
  return {}
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  const sendProgress = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    sendProgress({ type: 'status', message: '🔍 Starting OpenAI careers scraping...' })
    
    // Get main page
    const mainUrl = 'https://openai.com/careers/search/'
    const response = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch careers page: ${response.status}`)
    }

    const html = await response.text()
    sendProgress({ type: 'status', message: `📄 Received HTML (${html.length} bytes)` })
    
    const $ = cheerio.load(html)
    const jobs: Job[] = []
    const processedUrls = new Set<string>()
    
    // Find job links
    sendProgress({ type: 'status', message: '🔍 Finding individual job links...' })
    const jobLinks: { title: string; url: string; location: string }[] = []
    
    $('a').each((i, elem) => {
      const $elem = $(elem)
      const href = $elem.attr('href') || ''
      const text = $elem.text().trim()
      
      if (href.includes('/careers/') && text && !processedUrls.has(href)) {
        const $container = $elem.closest('div, article, section, li')
        const containerText = $container.text()
        
        let location = 'San Francisco' // default
        if (containerText.includes('Remote')) location = 'Remote'
        else if (containerText.includes('New York')) location = 'New York'
        else if (containerText.includes('London')) location = 'London'
        else if (containerText.includes('Singapore')) location = 'Singapore'
        else if (containerText.includes('Tokyo')) location = 'Tokyo'
        else if (containerText.includes('Dublin')) location = 'Dublin'
        else if (containerText.includes('Seattle')) location = 'Seattle'
        
        if (text.length > 5 && text.length < 100 && 
            (text.includes('Engineer') || text.includes('Scientist') || 
             text.includes('Researcher') || text.includes('Manager') ||
             text.includes('Director') || text.includes('Analyst'))) {
          
          const fullUrl = href.startsWith('http') ? href : `https://openai.com${href}`
          jobLinks.push({
            title: text,
            url: fullUrl,
            location
          })
          processedUrls.add(fullUrl)
        }
      }
    })
    
    sendProgress({ 
      type: 'status', 
      message: `📋 Found ${jobLinks.length} job links, scraping individual pages...`,
      total: Math.min(50, jobLinks.length)
    })
    
    // Scrape individual jobs
    const jobsToScrape = jobLinks.slice(0, 50)
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < jobsToScrape.length; i++) {
      const jobLink = jobsToScrape[i]
      
      sendProgress({
        type: 'progress',
        current: i + 1,
        total: jobsToScrape.length,
        jobTitle: jobLink.title
      })
      
      try {
        const jobResponse = await fetch(jobLink.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        })
        
        if (jobResponse.ok) {
          const jobHtml = await jobResponse.text()
          const salaryInfo = extractSalary(jobHtml)
          
          let department = 'Engineering'
          if (jobLink.title.includes('Research') || jobLink.title.includes('Scientist')) department = 'Research'
          else if (jobLink.title.includes('Manager') || jobLink.title.includes('Director')) department = 'Management'
          else if (jobLink.title.includes('Sales') || jobLink.title.includes('Account')) department = 'Sales'
          else if (jobLink.title.includes('Security')) department = 'Security'
          else if (jobLink.title.includes('Data')) department = 'Data'
          else if (jobLink.title.includes('Product')) department = 'Product'
          
          // Extract skills
          const $job = cheerio.load(jobHtml)
          const jobText = $job('body').text().toLowerCase()
          const skills: string[] = []
          
          if (jobText.includes('python')) skills.push('Python')
          if (jobText.includes('pytorch') || jobText.includes('torch')) skills.push('PyTorch')
          if (jobText.includes('tensorflow') || jobText.includes('tf')) skills.push('TensorFlow')
          if (jobText.includes('cuda')) skills.push('CUDA')
          if (jobText.includes('c++') || jobText.includes('cpp')) skills.push('C++')
          if (jobText.includes('go ') || jobText.includes('golang')) skills.push('Go')
          if (jobText.includes('rust')) skills.push('Rust')
          if (jobText.includes('kubernetes') || jobText.includes('k8s')) skills.push('Kubernetes')
          if (jobText.includes('docker')) skills.push('Docker')
          if (jobText.includes('aws')) skills.push('AWS')
          if (jobText.includes('gcp') || jobText.includes('google cloud')) skills.push('GCP')
          if (jobText.includes('typescript')) skills.push('TypeScript')
          if (jobText.includes('react')) skills.push('React')
          if (jobText.includes('machine learning') || jobText.includes('ml ')) skills.push('Machine Learning')
          if (jobText.includes('deep learning')) skills.push('Deep Learning')
          if (jobText.includes('distributed systems')) skills.push('Distributed Systems')
          if (jobText.includes('microservices')) skills.push('Microservices')
          if (jobText.includes('postgresql') || jobText.includes('postgres')) skills.push('PostgreSQL')
          if (jobText.includes('redis')) skills.push('Redis')
          if (jobText.includes('sql')) skills.push('SQL')
          
          // Clean up title formatting
          let cleanTitle = jobLink.title
            .replace(/([a-z])([A-Z][a-z])/g, '$1 $2')
            .replace(/(Engineering|Products|Science|Infrastructure|Design|Operations|Success)([A-Z])/g, '$1 $2')
            .replace(/\s+/g, ' ')
            .trim()
          
          const job: Job = {
            title: cleanTitle,
            url: jobLink.url,
            location: jobLink.location,
            department,
            salary: salaryInfo.salary,
            salary_min: salaryInfo.min,
            salary_max: salaryInfo.max,
            skills
          }
          
          jobs.push(job)
          successCount++
          
          if (salaryInfo.salary) {
            sendProgress({
              type: 'salary_found',
              jobTitle: cleanTitle,
              salary: salaryInfo.salary,
              current: i + 1
            })
          } else {
            const jobType = jobLink.title.toLowerCase()
            let reason = 'Unknown'
            
            if (jobType.includes('account director') || jobType.includes('sales')) {
              reason = 'Sales position - likely commission-based'
            } else if (jobType.includes('customer success') || jobType.includes('manager')) {
              reason = 'Management position - salary may be confidential'
            } else if (jobLink.location !== 'San Francisco' && jobLink.location !== 'Remote') {
              reason = 'International position - salary may vary by region'
            } else if (jobType.includes('director') || jobType.includes('vp')) {
              reason = 'Executive position - salary confidential'
            } else if (jobType.includes('finance') || jobType.includes('legal')) {
              reason = 'Corporate function - salary may be confidential'
            }
            
            job.description = reason
            
            sendProgress({
              type: 'no_salary',
              jobTitle: cleanTitle,
              reason: reason,
              current: i + 1
            })
          }
        } else {
          errorCount++
          sendProgress({
            type: 'error',
            jobTitle: jobLink.title,
            status: jobResponse.status,
            current: i + 1
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        errorCount++
        sendProgress({
          type: 'error',
          jobTitle: jobLink.title,
          error: error instanceof Error ? error.message : 'Unknown',
          current: i + 1
        })
      }
    }
    
    // Final summary
    sendProgress({ 
      type: 'complete',
      message: `✅ Scraped ${successCount} jobs successfully, ${errorCount} errors`,
      totalJobs: jobs.length,
      withSalary: jobs.filter(j => j.salary_min).length
    })

    res.end()

  } catch (error) {
    sendProgress({
      type: 'error',
      message: 'Scraping failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    res.end()
  }
}