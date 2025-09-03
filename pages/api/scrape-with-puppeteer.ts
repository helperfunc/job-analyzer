import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import chromium from '@sparticuz/chromium'
import { getSupabase, isSupabaseAvailable } from '../../lib/supabase'

interface Job {
  title: string
  url: string
  location: string
  department: string
  company?: string
  salary?: string
  salary_min?: number
  salary_max?: number
  description?: string
  requirements?: string[]
  skills?: string[]
}

// Extract salary from text
function extractSalary(text: string): { salary?: string; min?: number; max?: number } {
  // Look for salary range patterns first (higher priority)
  const rangeSalaryPatterns = [
    // Greenhouse specific patterns with HTML comments (highest priority)
    /\$([0-9,]+)<!--.*?-->\s*-\s*<!--.*?-->\$([0-9,]+)<!--.*?-->\s*<!--.*?-->USD/i,
    /Annual\s+Salary:.*?\$([0-9,]+)<!--.*?-->\s*-\s*<!--.*?-->\$([0-9,]+)<!--.*?-->\s*<!--.*?-->USD/i,
    // Standard patterns
    /\$(\d{3,})[Kk]?\s*[-–]\s*\$(\d{3,})[Kk]?/,
    /\$(\d{3,}),(\d{3})\s*[-–]\s*\$(\d{3,}),(\d{3})/,
    /USD\s*(\d{3,})[Kk]?\s*[-–]\s*(\d{3,})[Kk]?/,
    // Annual salary patterns
    /Annual\s+Salary:\s*\$(\d{3,}),(\d{3})\s*[-–]\s*\$(\d{3,}),(\d{3})\s*USD/i,
    /Salary:\s*\$(\d{3,}),(\d{3})\s*[-–]\s*\$(\d{3,}),(\d{3})\s*USD/i,
    // Euro patterns - support both dot and comma separators
    /€(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*€(\d{1,3}(?:[.,]\d{3})*)\s*EUR/i,
    // Annual Salary EUR patterns
    /Annual\s+Salary:\s*€(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*€(\d{1,3}(?:[.,]\d{3})*)\s*EUR/i,
    /Salary:\s*€(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*€(\d{1,3}(?:[.,]\d{3})*)\s*EUR/i,
    // More flexible EUR patterns
    /€(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*€(\d{1,3}(?:[.,]\d{3})*)/i,
    // GBP/Pound patterns
    /£(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*£(\d{1,3}(?:[.,]\d{3})*)/i,
    /GBP\s*(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*GBP\s*(\d{1,3}(?:[.,]\d{3})*)/i
  ]
  
  for (const pattern of rangeSalaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      let min, max
      let isEuro = match[0].includes('€') || match[0].includes('EUR')
      let isPound = match[0].includes('£') || match[0].includes('GBP')
      let isGreenhouse = match[0].includes('<!--')
      
      if (isGreenhouse) {
        // Greenhouse HTML format: $425,000<!-- --> - <!-- -->$560,000<!-- --> <!-- -->USD
        const minStr = match[1].replace(/,/g, '')
        const maxStr = match[2].replace(/,/g, '')
        min = parseInt(minStr) / 1000 // Convert to K
        max = parseInt(maxStr) / 1000
        
        return {
          salary: `$${match[1]} – $${match[2]} USD`,
          min: Math.round(min),
          max: Math.round(max)
        }
      } else if (isEuro) {
        // Euro format: €235.000 - €355.000 EUR or €235,000 - €355,000 EUR
        const minStr = match[1].replace(/[.,]/g, '') // Remove dots/commas
        const maxStr = match[2].replace(/[.,]/g, '')
        min = parseInt(minStr) / 1000 // Convert to K
        max = parseInt(maxStr) / 1000
        
        // Convert EUR to USD (approximate rate: 1 EUR = 1.1 USD)
        min = Math.round(min * 1.1)
        max = Math.round(max * 1.1)
        
        return {
          salary: `$${min}K – $${max}K (converted from EUR)`,
          min,
          max
        }
      } else if (isPound) {
        // GBP format: £235,000 - £355,000 or GBP 235,000 - GBP 355,000
        const minStr = match[1].replace(/[.,]/g, '') // Remove dots/commas
        const maxStr = match[2].replace(/[.,]/g, '')
        min = parseInt(minStr) / 1000 // Convert to K
        max = parseInt(maxStr) / 1000
        
        // Convert GBP to USD (approximate rate: 1 GBP = 1.27 USD)
        min = Math.round(min * 1.27)
        max = Math.round(max * 1.27)
        
        return {
          salary: `$${min}K – $${max}K (converted from GBP)`,
          min,
          max
        }
      } else if (match[0].includes('Annual') || match[0].includes('Salary:')) {
        // Format: Annual Salary: $XXX,XXX - $XXX,XXX USD
        min = parseInt(match[1] + match[2]) / 1000
        max = parseInt(match[3] + match[4]) / 1000
      } else if (match[0].includes(',')) {
        // Format: $XXX,XXX - $XXX,XXX
        min = parseInt(match[1] + match[2]) / 1000
        max = parseInt(match[3] + match[4]) / 1000
      } else {
        // Format: $XXXK - $XXXK or $XXX - $XXX
        min = parseInt(match[1])
        max = parseInt(match[2])
        if (!match[0].toLowerCase().includes('k') && min < 1000) {
          // If no K and numbers are small, they're already in thousands
          // keep as is
        } else if (!match[0].toLowerCase().includes('k') && min > 1000) {
          // Large numbers without K means actual salary
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
  
  // Look for single salary patterns (like $325K + Offers Equity)
  const singleSalaryPatterns = [
    /\$(\d{3,})[Kk]?(?:\s*\+\s*Offers?\s*Equity)?/i,
    /\$(\d{3,})[Kk]?\s*\+/i,
    /\$(\d{3,})[Kk]?(?!\s*[-–])/i
  ]
  
  for (const pattern of singleSalaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      let amount = parseInt(match[1])
      
      // Check if it has K suffix
      if (match[0].toLowerCase().includes('k')) {
        // Already in thousands
      } else if (amount > 1000) {
        // Convert to thousands
        amount = amount / 1000
      }
      
      // For single salary with equity, don't create artificial range
      // Use the actual amount as both min and max
      const min = amount
      const max = amount
      
      // Clean up salary string - remove "+ Offers Equity" suffix
      let salaryStr = match[0]
      if (salaryStr.includes('Offers Equity')) {
        salaryStr = salaryStr.replace(/\s*\+\s*Offers?\s*Equity/i, '').trim()
      }
      
      return {
        salary: salaryStr,
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body
  let timeoutId: NodeJS.Timeout | null = null
  
  // Detect which company we're scraping
  const isAnthropic = url.includes('anthropic.com') || url.includes('greenhouse.io/anthropic')
  const isOpenAI = url.includes('openai.com')
  const isDeepMind = url.includes('greenhouse.io/deepmind')
  
  // Set timeout based on company - longer for Anthropic due to many pages
  const timeout = isAnthropic ? 300000 : 120000 // 5 minutes for Anthropic, 2 minutes for others
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Scraping timeout')), timeout)
  })
  
  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    // Start scraping asynchronously and return immediately
    const scrapingLogic = async () => {
      
      const companyName = isAnthropic ? 'Anthropic' : isOpenAI ? 'OpenAI' : isDeepMind ? 'DeepMind' : 'Unknown'
      console.log(`🔍 Starting ${companyName} careers scraping...`)
      
      // Set scraping status to active
      try {
        await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/scraping-status?company=${companyName.toLowerCase()}`, {
          method: 'POST'
        })
      } catch (error) {
        console.log('Failed to set scraping status (non-critical)')
      }
      
      // Use the provided URL
      const mainUrl = url
      let html: string
      
      // Check if we're in AWS environment (Lambda/EC2)
      const isAWS = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV || process.env.AWS_REGION
      const isProduction = process.env.NODE_ENV === 'production'
      
      // For companies that need JavaScript rendering (OpenAI), use Puppeteer
      // For AWS, use special configuration
      if (isOpenAI && (isAWS || isProduction)) {
        console.log(`🔍 Using Puppeteer with AWS configuration for ${companyName}...`)
        
        try {
          // AWS Lambda specific configuration
          const browser = await puppeteer.launch({
            args: isAWS ? [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
            executablePath: isAWS ? await chromium.executablePath() : undefined,
            headless: true,
            defaultViewport: {
              width: 1920,
              height: 1080
            }
          })
          
          const page = await browser.newPage()
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
          
          console.log(`📄 Navigating to ${mainUrl}...`)
          await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 30000 })
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          html = await page.content()
          console.log(`📄 Received HTML via Puppeteer (${html.length} bytes)`)
          
          await browser.close()
        } catch (puppeteerError) {
          console.error('❌ Puppeteer failed:', puppeteerError)
          console.log('⚠️ Falling back to regular fetch...')
          
          // Fallback to regular fetch if Puppeteer fails
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
          
          html = await response.text()
          console.log(`📄 Received HTML via fetch fallback (${html.length} bytes)`)
        }
      } else if (isOpenAI && !isAWS && !isProduction) {
        // Local development with regular Puppeteer
        console.log(`🔍 Using local Puppeteer for ${companyName}...`)
        
        try {
          const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
          })
          
          const page = await browser.newPage()
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
          
          console.log(`📄 Navigating to ${mainUrl}...`)
          await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 30000 })
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          html = await page.content()
          console.log(`📄 Received HTML via local Puppeteer (${html.length} bytes)`)
          
          await browser.close()
        } catch (puppeteerError) {
          console.error('❌ Local Puppeteer failed:', puppeteerError)
          console.log('⚠️ Falling back to regular fetch...')
          
          // Fallback to regular fetch
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
          
          html = await response.text()
          console.log(`📄 Received HTML via fetch fallback (${html.length} bytes)`)
        }
      } else {
        // For other companies (like Anthropic, DeepMind), use regular fetch
        console.log(`🔍 Using enhanced fetch for ${companyName}...`)
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

        html = await response.text()
        console.log(`📄 Received HTML (${html.length} bytes)`)
      }
    
    // For Anthropic/DeepMind, wait 5 seconds and try to fetch the page again to allow dynamic content to load
    if (isAnthropic || isDeepMind) {
      console.log(`⏳ ${companyName} page detected - waiting 5 seconds for dynamic content to load...`)
      console.log('💡 This delay allows JavaScript to render job listings that might be loaded dynamically')
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      console.log('🔄 Re-fetching Anthropic page after waiting...')
      
      // Fetch the page again after waiting
      try {
        const delayedResponse = await fetch(mainUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (delayedResponse.ok) {
          const delayedHtml = await delayedResponse.text()
          console.log(`📄 Delayed HTML (${delayedHtml.length} bytes)`)
          
          // Use the delayed HTML if it's different or longer
          if (delayedHtml.length > html.length * 1.1) { // 10% more content
            console.log('✅ Using delayed HTML as it contains significantly more content')
            html = delayedHtml
          } else if (delayedHtml.includes('job') && delayedHtml.includes('position')) {
            console.log('✅ Using delayed HTML as it contains job-related content')  
            html = delayedHtml
          } else {
            console.log('⚠️ Delayed HTML is not significantly different, using original')
          }
        }
      } catch (delayedError) {
        console.log('❌ Error in delayed fetch:', delayedError instanceof Error ? delayedError.message : 'Unknown error')
        console.log('💡 Continuing with original HTML...')
      }
    }
    
    // Initialize jobs array and processed URLs
    let jobs: Job[] = []
    const processedUrls = new Set<string>()
    
    // For Anthropic/DeepMind, let's try to find API endpoints or data in the HTML
    if (isAnthropic || isDeepMind) {
      console.log(`🔍 Searching for ${companyName} API endpoints...`)
      
      // Look for potential API endpoints in the HTML
      const apiMatches = html.match(/(https?:\/\/[^\s"']+(?:api|jobs|careers)[^\s"']*)/gi)
      if (apiMatches) {
        console.log('🔗 Found potential API URLs:', apiMatches.slice(0, 5))
      }
      
      // Look for JSON data in script tags
      const jsonMatches = html.match(/<script[^>]*>(.*?jobs.*?)<\/script>/gi)
      if (jsonMatches) {
        console.log('📊 Found potential job data in scripts:', jsonMatches.length, 'matches')
      }
      
      // Try the specific Greenhouse job board URL first (support pagination)
      const companySlug = isAnthropic ? 'anthropic' : 'deepmind'
      console.log(`🎯 Trying ${companyName} Greenhouse job board with pagination...`)
      
      // Collect jobs from all pages (focus on first 3 pages for better performance)
      const allJobs: any[] = []
      const maxPages = 3 // Focus on first 3 pages to reduce timeout
      
      for (let page = 1; page <= maxPages; page++) {
        const startTime = Date.now()
        console.log(`📄 Fetching page ${page}/${maxPages}... (${allJobs.length} jobs so far)`)
        
        try {
          const pageUrl = page === 1 
            ? `https://job-boards.greenhouse.io/${companySlug}`
            : `https://job-boards.greenhouse.io/${companySlug}?page=${page}`
            
          const greenhouseResponse = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          })
          
          if (greenhouseResponse.ok) {
            const greenhouseHtml = await greenhouseResponse.text()
            console.log(`✅ Greenhouse page ${page} accessible (${greenhouseHtml.length} bytes)`)
            
            // Parse Greenhouse HTML for job listings
            const $greenhouse = cheerio.load(greenhouseHtml)
          
          // Greenhouse job board selectors
          const jobElements = new Set() // Prevent duplicates
          
          // First, collect all job links
          const jobLinks: {title: string, url: string, department: string, skills: string[]}[] = []
          
          $greenhouse('a[href*="/jobs/"]').each((i, elem) => {
            const $elem = $greenhouse(elem)
            const jobUrl = $elem.attr('href')
            
            // Skip if already processed this URL
            if (!jobUrl || processedUrls.has(jobUrl)) return
            
            let title = $elem.text().trim()
            
            // Clean up title - remove location suffixes
            title = title.replace(/\s*(San Francisco, CA|Seattle, WA|New York City, NY|London, UK|Remote-Friendly.*?)$/gi, '')
                        .replace(/\s*New$/gi, '') // Remove "New" suffix
                        .replace(/\s+/g, ' ')
                        .trim()
            
            if (title && title.length > 5 && title.length < 150) {
              // Accept all job titles for Anthropic - much broader criteria
              // This will capture Finance, Legal, Marketing, Communications, etc.
              
              // Extract department from title (expanded for all Anthropic departments)
              let department = 'Other'
              const titleLower = title.toLowerCase()
              
              if (titleLower.includes('engineer') || titleLower.includes('technical') || titleLower.includes('software')) department = 'Engineering'
              else if (titleLower.includes('research') || titleLower.includes('scientist')) department = 'Research'
              else if (titleLower.includes('product')) department = 'Product'
              else if (titleLower.includes('policy') || titleLower.includes('societal')) department = 'Policy'
              else if (titleLower.includes('safety')) department = 'Safety'
              else if (titleLower.includes('security')) department = 'Security'
              else if (titleLower.includes('design') || titleLower.includes('ux') || titleLower.includes('ui')) department = 'Design'
              else if (titleLower.includes('data') || titleLower.includes('analytics')) department = 'Data'
              else if (titleLower.includes('finance') || titleLower.includes('accounting') || titleLower.includes('treasury')) department = 'Finance'
              else if (titleLower.includes('legal') || titleLower.includes('counsel')) department = 'Legal'
              else if (titleLower.includes('marketing') || titleLower.includes('brand')) department = 'Marketing'
              else if (titleLower.includes('communication') || titleLower.includes('content')) department = 'Communications'
              else if (titleLower.includes('compute') || titleLower.includes('capacity')) department = 'Compute'
              
              // Infer skills from title
              const inferredSkills: string[] = []
              
              // Core AI/ML skills
              if (titleLower.includes('machine learning') || titleLower.includes('ml ')) {
                inferredSkills.push('Machine Learning')
              }
              if (titleLower.includes('research')) {
                inferredSkills.push('AI Safety', 'Research Publications', 'PyTorch', 'Python')
              }
              if (titleLower.includes('engineer')) {
                inferredSkills.push('Python')
                if (titleLower.includes('software')) inferredSkills.push('Software Engineering')
                if (titleLower.includes('ml') || titleLower.includes('ai') || titleLower.includes('inference')) inferredSkills.push('Machine Learning', 'PyTorch')
                if (titleLower.includes('manager')) inferredSkills.push('Leadership', 'Project Management', 'Team Management')
              }
              if (titleLower.includes('scientist')) {
                inferredSkills.push('Machine Learning', 'Python', 'Research Publications')
              }
              if (titleLower.includes('safety') || titleLower.includes('alignment')) {
                inferredSkills.push('AI Safety', 'Constitutional AI')
              }
              if (titleLower.includes('infrastructure') || titleLower.includes('platform')) {
                inferredSkills.push('Distributed Systems', 'Kubernetes', 'Python')
              }
              if (titleLower.includes('security')) {
                inferredSkills.push('Security Engineering', 'Python')
              }
              if (titleLower.includes('policy')) {
                inferredSkills.push('Policy Development', 'AI Safety')
              }
              if (titleLower.includes('finance') || titleLower.includes('accounting')) {
                inferredSkills.push('Financial Analysis', 'Accounting')
              }
              if (titleLower.includes('legal') || titleLower.includes('counsel')) {
                inferredSkills.push('Legal Analysis', 'Contract Law')
              }
              if (titleLower.includes('marketing') || titleLower.includes('brand')) {
                inferredSkills.push('Marketing Strategy', 'Brand Management')
              }
              if (titleLower.includes('communication') || titleLower.includes('content')) {
                inferredSkills.push('Content Strategy', 'Communications')
              }
              if (titleLower.includes('data') && titleLower.includes('analytics')) {
                inferredSkills.push('Data Analytics', 'SQL', 'Python')
              }
              
              jobLinks.push({
                title,
                url: jobUrl,
                department,
                skills: Array.from(new Set(inferredSkills))
              })
              processedUrls.add(jobUrl)
            }
          })
          
          console.log(`📋 Found ${jobLinks.length} job links on page ${page}`)
          
          // Process jobs in batches for better performance
          const BATCH_SIZE = 5
          const processBatch = async (batch: any[]) => {
            return Promise.all(batch.map(async (jobLink) => {
              // Try to extract real salary by fetching the individual job page
              let salaryMin, salaryMax, salaryString = undefined
              const titleLower = jobLink.title.toLowerCase()
              
              try {
                const jobPageResponse = await fetch(jobLink.url, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                  }
                })
                
                if (jobPageResponse.ok) {
                  const jobPageHtml = await jobPageResponse.text()
                  
                  // Look for salary information in various HTML patterns
                  const salaryPatterns = [
                    // Greenhouse specific patterns with HTML comments
                    /\$([0-9,]+)<!--.*?-->\s*-\s*<!--.*?-->\$([0-9,]+)<!--.*?-->\s*<!--.*?-->USD/i,
                    /Annual\s+Salary:.*?\$([0-9,]+)<!--.*?-->\s*-\s*<!--.*?-->\$([0-9,]+)<!--.*?-->\s*<!--.*?-->USD/i,
                    // Standard patterns
                    /\$([0-9,]+)\s*(?:-|–|to)\s*\$([0-9,]+)\s*USD/i,
                    /Annual\s+Salary:\s*\$([0-9,]+)\s*(?:-|–|to)\s*\$([0-9,]+)\s*USD/i,
                    /salary[^:]*:?\s*\$([0-9,]+)\s*(?:-|–|to)\s*\$([0-9,]+)/i
                  ]
                  
                  for (const pattern of salaryPatterns) {
                    const match = jobPageHtml.match(pattern)
                    if (match) {
                      const minStr = match[1].replace(/,/g, '')
                      const maxStr = match[2].replace(/,/g, '')
                      salaryMin = Math.round(parseInt(minStr) / 1000)
                      salaryMax = Math.round(parseInt(maxStr) / 1000)
                      salaryString = `$${match[1]} – $${match[2]} USD`
                      break
                    }
                  }
                  
                  // If still no salary found, use the general extractSalary function
                  if (!salaryString) {
                    const extracted = extractSalary(jobPageHtml)
                    if (extracted.salary) {
                      salaryString = extracted.salary
                      salaryMin = extracted.min
                      salaryMax = extracted.max
                    }
                  }
                }
              } catch (error) {
                // Silently handle errors for batch processing
              }
              
              // For Anthropic, don't use estimated salaries
              // Leave salary as undefined if not found
              if (!salaryString) {
                salaryMin = undefined
                salaryMax = undefined
                salaryString = undefined
              }
              
              return {
                title: jobLink.title,
                url: jobLink.url,
                location: 'San Francisco',
                department: jobLink.department,
                salary: salaryString,
                salary_min: salaryMin,
                salary_max: salaryMax,
                skills: jobLink.skills
              }
            }))
          }
          
          // Process jobs in batches
          for (let i = 0; i < jobLinks.length; i += BATCH_SIZE) {
            const batch = jobLinks.slice(i, i + BATCH_SIZE)
            console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(jobLinks.length/BATCH_SIZE)} (${batch.length} jobs)...`)
            
            const batchResults = await processBatch(batch)
            allJobs.push(...batchResults)
            
            // Log sample of completed jobs with salaries
            const jobsWithSalaries = batchResults.filter(j => j.salary && !j.salary.includes('estimated'))
            const sampleJob = jobsWithSalaries.length > 0 ? jobsWithSalaries[0] : batchResults[0]
            
            console.log(`✅ Completed batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batchResults.length} jobs processed`)
            console.log(`   Sample: ${sampleJob.title} - ${sampleJob.salary}`)
            console.log(`   Real salaries found: ${jobsWithSalaries.length}/${batchResults.length}`)
            
            // Short delay between batches
            if (i + BATCH_SIZE < jobLinks.length) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }
          
          const pageTime = Date.now() - startTime
          console.log(`✅ Page ${page} processed in ${pageTime}ms: found ${allJobs.length - (page-1)*47} new jobs`)
          
          } else {
            console.log(`❌ Greenhouse page ${page} not accessible: ${greenhouseResponse.status}`)
            break // Stop trying remaining pages if one fails
          }
          
        } catch (error) {
          console.log(`❌ Error accessing Greenhouse page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          continue // Try next page even if current fails
        }
        
        // Reduced delay between pages for faster processing
        if (page < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // Add all collected jobs to the main jobs array
      jobs.push(...allJobs)
      
      const realSalariesCount = allJobs.filter(j => j.salary && !j.salary.includes('estimated')).length
      console.log(`🎯 Total Greenhouse jobs collected: ${allJobs.length}`)
      console.log(`💰 Real salaries found: ${realSalariesCount}/${allJobs.length} (${Math.round(realSalariesCount/allJobs.length*100)}%)`)
      
      // Show top 3 highest paying jobs for quick verification
      const topPaying = allJobs
        .filter(j => j.salary_max > 0)
        .sort((a, b) => b.salary_max - a.salary_max)
        .slice(0, 3)
      
      console.log(`🏆 Top paying jobs found:`)
      topPaying.forEach((job, i) => {
        console.log(`   ${i+1}. ${job.title}: ${job.salary}`)
      })
      
      // If no jobs found from Greenhouse, continue with main page processing
      if (jobs.length === 0) {
        console.log('⚠️ No jobs found from Greenhouse, will check main page after delay')
      }
    }
    
    const $ = cheerio.load(html)
    
    // Method 1: Look for structured data in script tags
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html() || '{}')
        if (data['@type'] === 'JobPosting' || (Array.isArray(data) && data.some(d => d['@type'] === 'JobPosting'))) {
          // Process job posting data
          const postings = Array.isArray(data) ? data : [data]
          postings.forEach(posting => {
            if (posting['@type'] === 'JobPosting') {
              const salaryInfo = posting.baseSalary?.value
              const job: Job = {
                title: posting.title,
                url: posting.url,
                location: posting.jobLocation?.address?.addressLocality || 'Remote',
                department: posting.occupationalCategory || 'Engineering',
                company: companyName,
                description: posting.description
              }
              
              if (salaryInfo) {
                const extracted = extractSalary(salaryInfo.toString())
                job.salary = extracted.salary
                job.salary_min = extracted.min
                job.salary_max = extracted.max
              }
              
              jobs.push(job)
              processedUrls.add(posting.url)
            }
          })
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    })
    
    // Method 2: Look for job links and scrape individual pages
    console.log('🔍 Finding individual job links...')
    const jobLinks: { title: string; url: string; location: string }[] = []
    
    $('a').each((i, elem) => {
      const $elem = $(elem)
      const href = $elem.attr('href') || ''
      const text = $elem.text().trim()
      
      // Different URL patterns for different companies
      let isJobLink = false
      let baseUrl = ''
      
      if (isOpenAI && href.includes('/careers/') && text && !processedUrls.has(href)) {
        isJobLink = true
        baseUrl = 'https://openai.com'
      } else if (isAnthropic && (href.includes('/careers/') || href.includes('/job/')) && text && !processedUrls.has(href)) {
        isJobLink = true
        baseUrl = 'https://www.anthropic.com'
      }
      
      if (isJobLink) {
        // Get the parent container to find more context
        const $container = $elem.closest('div, article, section, li')
        const containerText = $container.text()
        
        // Extract location
        let location = 'San Francisco' // default
        if (containerText.includes('Remote')) location = 'Remote'
        else if (containerText.includes('New York')) location = 'New York'
        else if (containerText.includes('London')) location = 'London'
        else if (containerText.includes('Singapore')) location = 'Singapore'
        else if (containerText.includes('Tokyo')) location = 'Tokyo'
        else if (containerText.includes('Dublin')) location = 'Dublin'
        else if (containerText.includes('Seattle')) location = 'Seattle'
        
        // Accept all potential job titles (very broad criteria for OpenAI)
        if (text.length > 5 && text.length < 150 && 
            // Much more inclusive - include finance, legal, marketing, etc.
            (text.includes('Engineer') || text.includes('Scientist') || 
             text.includes('Researcher') || text.includes('Manager') ||
             text.includes('Director') || text.includes('Analyst') ||
             text.includes('Lead') || text.includes('Senior') ||
             text.includes('Staff') || text.includes('Principal') ||
             text.includes('Specialist') || text.includes('Coordinator') ||
             text.includes('Associate') || text.includes('Designer') ||
             text.includes('Consultant') || text.includes('Developer') ||
             text.includes('Administrator') || text.includes('Officer') ||
             text.includes('Advisor') || text.includes('Representative') ||
             text.includes('Assistant') || text.includes('Intern') ||
             // Add more job types for completeness
             text.includes('Counsel') || text.includes('Legal') ||
             text.includes('Finance') || text.includes('Accounting') ||
             text.includes('Marketing') || text.includes('Communications') ||
             text.includes('Business') || text.includes('Operations') ||
             text.includes('Strategy') || text.includes('Sales') ||
             text.includes('Content') || text.includes('Editorial') ||
             text.includes('Policy') || text.includes('Compliance') ||
             text.includes('Security') || text.includes('Safety') ||
             text.includes('Head of') || text.includes('VP') ||
             text.includes('Chief'))) {
          
          const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`
          jobLinks.push({
            title: text,
            url: fullUrl,
            location
          })
          processedUrls.add(fullUrl)
        }
      }
    })
    
    console.log(`📋 Found ${jobLinks.length} job links, scraping individual pages...`)
    
    // Now scrape each individual job page (scrape all jobs)
    const jobsToScrape = jobLinks
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < jobsToScrape.length; i++) {
      const jobLink = jobsToScrape[i]
      console.log(`🔍 [${i+1}/${jobsToScrape.length}] Scraping: ${jobLink.title}`)
      
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
          
          // Extract department from job page
          let department = 'Engineering'
          if (jobLink.title.includes('Research') || jobLink.title.includes('Scientist')) department = 'Research'
          else if (jobLink.title.includes('Manager') || jobLink.title.includes('Director')) department = 'Management'
          else if (jobLink.title.includes('Sales') || jobLink.title.includes('Account')) department = 'Sales'
          else if (jobLink.title.includes('Security')) department = 'Security'
          else if (jobLink.title.includes('Data')) department = 'Data'
          else if (jobLink.title.includes('Product')) department = 'Product'
          
          // Extract skills/requirements from job description
          const $job = cheerio.load(jobHtml)
          const skills: string[] = []
          
          // Extract job description first
          let jobDescription = ''
          const jobContentSelectors = [
            'div[data-testid="job-description"]',
            '.job-description',
            '[class*="description"]',
            '[class*="content"]',
            'main',
            'article'
          ]
          
          for (const selector of jobContentSelectors) {
            const content = $job(selector).text()
            if (content && content.length > 200) {
              jobDescription = content
              break
            }
          }
          
          // If no specific content found, get text from common job posting containers
          if (!jobDescription) {
            jobDescription = $job('body').text()
          }
          
          // Find requirements/qualifications sections specifically from the job description
          let requirementsText = ''
          const lowerDesc = jobDescription.toLowerCase()
          
          // Split into paragraphs and find requirements-related sections
          const paragraphs = jobDescription.split('\n').filter(p => p.trim().length > 20)
          
          paragraphs.forEach(paragraph => {
            const lowerPara = paragraph.toLowerCase()
            if (lowerPara.includes('requirements') || 
                lowerPara.includes('qualifications') || 
                lowerPara.includes('what you') ||
                lowerPara.includes('you have') ||
                lowerPara.includes('must have') ||
                lowerPara.includes('skills') ||
                lowerPara.includes('experience with') ||
                lowerPara.includes('minimum qualifications')) {
              requirementsText += ' ' + paragraph.toLowerCase()
            }
          })
          
          // If no specific requirements found, don't fall back to entire body
          // Only use clearly job-related content
          if (requirementsText.length < 50) {
            // Look for bullet points or lists that might contain requirements
            const listItems = $job('li, ul, ol').text().toLowerCase()
            if (listItems && listItems.length > 50) {
              requirementsText = listItems
            } else {
              // Last resort: use a small portion of the description, not the entire page
              requirementsText = jobDescription.substring(0, 1000).toLowerCase()
            }
          }
          
          // Debug logging for problematic jobs
          if (jobLink.title.includes('Manufacturing') || jobLink.title.includes('Inference') || jobLink.title.includes('GPU Platform')) {
            console.log(`🔍 DEBUG for ${jobLink.title}:`)
            console.log(`   Requirements text length: ${requirementsText.length}`)
            console.log(`   Requirements preview: "${requirementsText.substring(0, 200)}..."`)
            console.log(`   Job description length: ${jobDescription.length}`)
          }
          
          // CONSERVATIVE skill extraction based on job TITLE only (since individual pages are blocked by Cloudflare)
          // This prevents false positives from parsing Cloudflare challenge pages
          const titleLower = jobLink.title.toLowerCase()
          
          // Core technical skills based on job title patterns
          // Machine Learning (very conservative)
          if (titleLower.includes('machine learning') || 
              titleLower.includes('ml engineer') ||
              (titleLower.includes('research') && (titleLower.includes('ai') || titleLower.includes('intelligence'))) ||
              titleLower.includes('deep learning') ||
              titleLower.includes('inference')) {
            skills.push('Machine Learning')
          }
          
          // AI/ML specific frameworks (only for clearly ML roles)  
          if ((titleLower.includes('machine learning') || titleLower.includes('research') || titleLower.includes('inference')) &&
              (titleLower.includes('pytorch') || titleLower.includes('torch') || titleLower.includes('ml') || titleLower.includes('ai'))) {
            skills.push('PyTorch')
          }
          
          // Programming languages (conservative, role-specific)
          if (titleLower.includes('python') || 
              titleLower.includes('research') || 
              titleLower.includes('machine learning') ||
              titleLower.includes('data') ||
              titleLower.includes('infrastructure') ||
              titleLower.includes('backend') ||
              titleLower.includes('software engineer')) {
            skills.push('Python')
          }
          
          if (titleLower.includes('c++') || 
              titleLower.includes('systems') ||
              titleLower.includes('inference') ||
              titleLower.includes('gpu') ||
              titleLower.includes('cuda')) {
            skills.push('C++')
          }
          
          if (titleLower.includes('cuda') || titleLower.includes('gpu')) {
            skills.push('CUDA')
          }
          
          if (titleLower.includes('go ') || titleLower.includes('golang') ||
              (titleLower.includes('infrastructure') && titleLower.includes('software'))) {
            skills.push('Go')
          }
          
          // LLM/Transformers (for research and inference roles)
          if (titleLower.includes('llm') || 
              titleLower.includes('transformer') ||
              titleLower.includes('language model') ||
              (titleLower.includes('research') && titleLower.includes('ai')) ||
              titleLower.includes('inference')) {
            skills.push('LLM/Transformers')
          }
          
          // Infrastructure & DevOps (title-based)
          if (titleLower.includes('infrastructure') || 
              titleLower.includes('devops') ||
              titleLower.includes('platform') ||
              titleLower.includes('scaling') ||
              titleLower.includes('gpu')) {
            if (titleLower.includes('kubernetes') || titleLower.includes('k8s')) {
              skills.push('Kubernetes')
            }
            if (titleLower.includes('docker')) {
              skills.push('Docker')
            }
            if (titleLower.includes('google cloud') || titleLower.includes('gcp')) {
              skills.push('Google Cloud')
            }
            if (titleLower.includes('aws')) {
              skills.push('AWS')
            }
            if (titleLower.includes('azure')) {
              skills.push('Azure')
            }
            if (titleLower.includes('linux') || titleLower.includes('unix')) {
              skills.push('Linux/Unix')
            }
          }
          
          // Distributed systems (for scaling and infrastructure roles)
          if (titleLower.includes('distributed') || 
              titleLower.includes('scaling') ||
              titleLower.includes('infrastructure') ||
              titleLower.includes('platform')) {
            skills.push('Distributed Systems')
          }
          
          // Frontend (very strict)
          if (titleLower.includes('frontend') || 
              titleLower.includes('front-end') ||
              titleLower.includes('ui engineer') ||
              titleLower.includes('web developer')) {
            skills.push('JavaScript')
            if (titleLower.includes('react')) {
              skills.push('React')
            }
            skills.push('HTML/CSS')
          }
          
          // Data Center & Infrastructure (title-based)
          if (titleLower.includes('data center') || 
              titleLower.includes('datacenter') ||
              titleLower.includes('stargate') ||
              titleLower.includes('electrical') ||
              titleLower.includes('mechanical') ||
              titleLower.includes('civil')) {
            skills.push('Data Center Design')
            if (titleLower.includes('electrical') || titleLower.includes('power')) {
              skills.push('Power Systems')
            }
            if (titleLower.includes('mechanical') || titleLower.includes('mep')) {
              skills.push('MEP Systems')
            }
            if (titleLower.includes('ups') || titleLower.includes('power')) {
              skills.push('UPS Systems')
            }
            if (titleLower.includes('cooling') || titleLower.includes('thermal')) {
              skills.push('Cooling Systems')
            }
            if (titleLower.includes('critical') || titleLower.includes('infrastructure')) {
              skills.push('Critical Infrastructure')
            }
          }
          
          // Product & Design
          if (titleLower.includes('design') && !titleLower.includes('software')) {
            if (titleLower.includes('cad') || titleLower.includes('mechanical') || titleLower.includes('manufacturing')) {
              skills.push('CAD/Design Software')
            }
          }
          
          // Management roles
          if (titleLower.includes('manager') || 
              titleLower.includes('director') ||
              titleLower.includes('lead') ||
              titleLower.includes('senior') ||
              titleLower.includes('principal')) {
            skills.push('Leadership')
            if (titleLower.includes('project') || titleLower.includes('program')) {
              skills.push('Project Management')
            }
          }
          
          // Business roles
          if (titleLower.includes('sales') || 
              titleLower.includes('business') ||
              titleLower.includes('account')) {
            skills.push('Sales')
            if (titleLower.includes('customer') || titleLower.includes('success')) {
              skills.push('Customer Success')
            }
          }
          
          // SQL for data roles
          if (titleLower.includes('data') || 
              titleLower.includes('analytics') ||
              titleLower.includes('database')) {
            skills.push('SQL')
          }
          
          // Finance
          if (titleLower.includes('finance') || titleLower.includes('accounting')) {
            skills.push('Finance')
          }
          
          // Remove duplicates
          const uniqueSkills = Array.from(new Set(skills))
          
          // Clean up title formatting - add spaces where needed
          let cleanTitle = jobLink.title
            // Add space before department/location info
            .replace(/([a-z])([A-Z][a-z])/g, '$1 $2')
            // Add space before city names
            .replace(/(Engineering|Products|Science|Infrastructure|Design|Operations|Success)([A-Z])/g, '$1 $2')
            // Clean up multiple spaces
            .replace(/\s+/g, ' ')
            .trim()
          
          const job: Job = {
            title: cleanTitle,
            url: jobLink.url,
            location: jobLink.location,
            department,
            company: companyName,
            salary: salaryInfo.salary,
            salary_min: salaryInfo.min,
            salary_max: salaryInfo.max,
            description: jobDescription.substring(0, 2000), // Save first 2000 chars for debugging
            skills: uniqueSkills
          }
          
          jobs.push(job)
          successCount++
          
          if (salaryInfo.salary) {
            console.log(`✅ Found salary: ${salaryInfo.salary}`)
          } else {
            // Try to determine why no salary was found
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
            
            console.log(`⚠️ No salary found - ${reason}`)
            
            // Still add the job but mark why no salary
            job.description = reason
          }
        } else {
          console.log(`❌ Failed to access: ${jobResponse.status}`)
          errorCount++
        }
        
        // Reduced delay for faster processing
        await new Promise(resolve => setTimeout(resolve, 50))
        
      } catch (error) {
        console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
        errorCount++
      }
    }
    
    console.log(`✅ Scraped ${successCount} jobs successfully, ${errorCount} errors`)
    
    // Method 3: Try to find jobs in a more specific way
    if (jobs.length === 0) {
      console.log('⚠️ No jobs found with standard methods, trying alternative parsing...')
      
      // Different selectors for different companies
      let selectors = []
      if (isAnthropic) {
        selectors = [
          '[data-job]',
          '[class*="job"]',
          '[class*="position"]', 
          '[class*="role"]',
          '[class*="career"]',
          '[role="listitem"]',
          'article',
          '.position-item',
          'li'
        ]
      } else {
        selectors = [
          '[data-job]',
          '[class*="job-listing"]',
          '[class*="career"]',
          '[role="listitem"]',
          '.job-item',
          'article'
        ]
      }
      
      for (const selector of selectors) {
        $(selector).each((i, elem) => {
          const $elem = $(elem)
          const text = $elem.text()
          
          // Try to extract job info from the element
          const titleElem = $elem.find('h2, h3, h4, [class*="title"], a').first()
          const title = titleElem.text().trim()
          
          if (title && title.length > 5 && title.length < 100 &&
              (title.includes('Engineer') || title.includes('Scientist') || 
               title.includes('Researcher') || title.includes('Manager') ||
               title.includes('Director') || title.includes('Analyst') ||
               title.includes('Lead') || title.includes('Staff'))) {
            
            const linkElem = $elem.find('a').first()
            const href = linkElem.attr('href') || ''
            
            const salaryInfo = extractSalary(text)
            const baseUrlForJob = isAnthropic ? 'https://www.anthropic.com' : 'https://openai.com'
            
            const job: Job = {
              title,
              url: href.startsWith('http') ? href : `${baseUrlForJob}${href}`,
              location: text.includes('Remote') ? 'Remote' : 'San Francisco',
              department: 'Engineering',
              company: companyName,
              salary: salaryInfo.salary,
              salary_min: salaryInfo.min,
              salary_max: salaryInfo.max
            }
            
            if (!processedUrls.has(job.url)) {
              jobs.push(job)
              processedUrls.add(job.url)
              console.log(`🔍 Found alternative job: ${title}`)
            }
          }
        })
        
        if (jobs.length > 0) {
          console.log(`✅ Found ${jobs.length} jobs using selector: ${selector}`)
          break
        }
      }
    }
    
    console.log(`✅ Found ${jobs.length} jobs (before deduplication)`)
    
    // Additional deduplication based on title + company + location
    const seenJobs = new Map<string, Job>()
    const uniqueJobs: Job[] = []
    
    jobs.forEach(job => {
      const key = `${job.title?.toLowerCase() || ''}_${job.company?.toLowerCase() || ''}_${job.location?.toLowerCase() || ''}`
      
      if (!seenJobs.has(key)) {
        seenJobs.set(key, job)
        uniqueJobs.push(job)
      } else {
        console.log(`🔄 Removing duplicate: ${job.title} at ${job.location}`)
      }
    })
    
    jobs = uniqueJobs
    console.log(`✅ After deduplication: ${jobs.length} unique jobs`)
    
    // If no jobs found, return appropriate error
    if (jobs.length === 0) {
      console.log(`❌ Unable to find any job data for ${companyName}. The page might require JavaScript or use a different loading method.`)
      console.log(`💡 Suggestion: ${companyName} might use a different recruitment platform or require dynamic page loading.`)
    }
    
    // Sort by salary
    jobs.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0))
    
    // If no jobs found, return error
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No job listings found for ${companyName}`,
        message: `Unable to scrape jobs from ${mainUrl}. The page might use dynamic loading or a third-party platform.`,
        suggestions: [
          'The job listings might be loaded via JavaScript',
          `Check if ${companyName} uses a third-party recruitment platform`,
          'The page might require waiting for content to load',
          'Try checking their LinkedIn jobs or other job boards',
          'The website structure might have changed'
        ]
      })
    }
    
    // Clear existing jobs for this company before adding new ones
    console.log(`🗑️ Clearing existing ${companyName} jobs from database...`)
    
    if (!isSupabaseAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      })
    }

    // Delete existing jobs for this company
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .ilike('company', companyName)
    
    if (deleteError) {
      console.error('Error clearing existing jobs:', deleteError)
      // Continue anyway - it might be first time scraping
    } else {
      console.log(`✅ Cleared existing ${companyName} jobs`)
    }

    // Save jobs directly to database
    console.log(`💾 Saving ${jobs.length} jobs to database for ${companyName}...`)

    // Generate UUIDs for jobs
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    }

    // Prepare jobs data for database
    const dbJobs = jobs.map(job => ({
      id: generateUUID(),
      title: job.title,
      company: companyName,
      location: job.location || 'Remote',
      department: job.department || 'Unknown',
      salary: job.salary,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      skills: job.skills || [],
      description: job.description,
      url: job.url,
      created_at: new Date().toISOString()
    }))

    // Import all jobs directly since we cleared existing ones
    try {
      let importedCount = 0
      if (dbJobs.length > 0) {
        const { data, error } = await supabase
          .from('jobs')
          .insert(dbJobs)
          .select()

        if (error) throw error
        importedCount = data?.length || 0
      }

      console.log(`✅ Imported ${importedCount} new jobs for ${companyName}`)
      
      // Get all jobs for this company to create summary
      const { data: actualJobs, error: getAllError } = await supabase
        .from('jobs')
        .select('*')
        .ilike('company', companyName)
        .order('created_at', { ascending: false })
      
      if (getAllError) throw getAllError
      
      const highestPaying = actualJobs
        .filter((j: any) => j.salary_min)
        .sort((a: any, b: any) => (b.salary_max || 0) - (a.salary_max || 0))
        .slice(0, 10)
      
      const skillsCount: Record<string, number> = {}
      
      // Count skills from ACTUAL jobs data
      actualJobs.forEach((job: any) => {
        if (job.skills && job.skills.length > 0) {
          job.skills.forEach((skill: string) => {
            skillsCount[skill] = (skillsCount[skill] || 0) + 1
          })
        }
      })
      
      console.log(`📊 Skills found in database: ${Object.keys(skillsCount).length} different skills`)
      
      const topSkills = Object.entries(skillsCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([skill, count]) => ({ skill, count }))
      
      // Log the ML count for debugging
      const mlSkill = topSkills.find(s => s.skill === 'Machine Learning')
      console.log(`🔍 Machine Learning count: ${mlSkill?.count || 0}`)
      
      // Clear scraping status
      try {
        await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/scraping-status?company=${companyName.toLowerCase()}`, {
          method: 'DELETE'
        })
        console.log(`✅ Cleared scraping status for ${companyName}`)
      } catch (error) {
        console.log('Failed to clear scraping status (non-critical)')
      }
      
      // Clear the timeout before returning
      if (timeoutId) clearTimeout(timeoutId);
      
      return {
        success: true,
        message: `Successfully scraped and imported ${importedCount} new jobs from ${companyName}`,
        company: companyName,
        filepath: 'Database records',
        dataSource: 'database',
        summary: {
          total_jobs: actualJobs.length,
          jobs_with_salary: actualJobs.filter((j: Job) => j.salary_min || j.salary_max).length,
          highest_paying_jobs: highestPaying,
          most_common_skills: topSkills
        }
      }
    } catch (dbError) {
      console.error('Database error during scraping:', dbError)
      // Clear the timeout before returning
      if (timeoutId) clearTimeout(timeoutId);
      
      return {
        success: false,
        error: 'Failed to save jobs to database',
        details: dbError instanceof Error ? dbError.message : 'Database error'
      }
    }
    
    } // End of scrapingLogic function

    // Start scraping in background and return immediately
    const companyName = isAnthropic ? 'Anthropic' : isOpenAI ? 'OpenAI' : isDeepMind ? 'DeepMind' : 'Unknown'
    
    // Execute scraping logic in background (no await)
    Promise.race([scrapingLogic(), timeoutPromise])
      .then((result) => {
        console.log(`✅ Background scraping completed for ${companyName}`)
      })
      .catch((error) => {
        console.error(`❌ Background scraping failed for ${companyName}:`, error)
        // Clear scraping status on error
        fetch(`${req.headers.origin || 'http://localhost:3000'}/api/scraping-status?company=${companyName.toLowerCase()}`, {
          method: 'DELETE'
        }).catch(() => {})
      })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId)
        // Ensure scraping status is cleared even on timeout
        setTimeout(() => {
          fetch(`${req.headers.origin || 'http://localhost:3000'}/api/scraping-status?company=${companyName.toLowerCase()}`, {
            method: 'DELETE'
          }).catch(() => {})
        }, timeout + 5000) // 5 seconds after timeout
      })
    
    // Return immediately to avoid browser timeout
    res.status(200).json({
      success: true,
      message: `Started background scraping for ${companyName}. Use polling to check completion.`,
      company: companyName,
      status: 'started'
    });

  } catch (error) {
    console.error('Scraping error:', error)
    
    if (error instanceof Error && error.message === 'Scraping timeout') {
      res.status(408).json({ 
        error: 'Scraping timeout',
        message: 'The scraping process took too long. Anthropic pages might require JavaScript rendering.',
        details: 'Try again later or use a different approach for dynamic content'
      })
    } else {
      res.status(500).json({ 
        error: 'Failed to scrape jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } finally {
    // Always clear the timeout
    if (timeoutId) clearTimeout(timeoutId);
  }
}