import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { url } = req.body

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    })
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })

    // Wait for content to load - especially for SPAs like Google Careers
    try {
      // Special handling for Google Careers
      if (url.includes('google.com/about/careers')) {
        await page.waitForSelector('[itemprop="title"], h1, h2[class*="title"]', {
          timeout: 15000
        })
        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        await page.waitForSelector('h1, h2, [role="heading"], .job-title, .posting-headline', {
          timeout: 10000
        })
      }
    } catch (e) {
      console.log('Timeout waiting for heading selectors')
    }

    // Extract job information
    const jobData = await page.evaluate(() => {
      // Common selectors for job title
      const titleSelectors = [
        // Google specific
        '[itemprop="title"]',
        '[data-gi-title]',
        '.gc-job-detail__title',
        
        // Common patterns
        'h1',
        'h2.job-title',
        '.job-title',
        '.job-name',
        '[data-testid="job-title"]',
        '.posting-headline',
        '.jobTitle',
        '.job_title',
        '[role="heading"][aria-level="1"]'
      ]

      // Common selectors for job description
      const descriptionSelectors = [
        // Google specific
        '[itemprop="description"]',
        '.gc-job-detail__content',
        '[data-gi-content]',
        
        // Common patterns
        '.job-description',
        '.job-content',
        '.job-details',
        '.posting-content',
        '.jobDescription',
        '.job_description',
        '.description',
        '[data-testid="job-description"]',
        'div[class*="description"]',
        'section[class*="description"]'
      ]

      // Common selectors for company name
      const companySelectors = [
        // Google specific
        '[itemprop="hiringOrganization"] [itemprop="name"]',
        '.gc-job-detail__company-name',
        
        // Common patterns
        '.company-name',
        '.company',
        '.employer',
        '[data-testid="company-name"]',
        '.posting-company',
        '.companyName',
        '[itemprop="hiringOrganization"]'
      ]

      // Common selectors for location
      const locationSelectors = [
        // Google specific
        '[itemprop="jobLocation"] [itemprop="address"]',
        '.gc-job-detail__location',
        '[data-gi-location]',
        
        // Common patterns
        '.location',
        '.job-location',
        '[data-testid="job-location"]',
        '.posting-location',
        '.jobLocation',
        '[itemprop="jobLocation"]'
      ]

      // Common selectors for salary
      const salarySelectors = [
        // Google specific
        '[itemprop="baseSalary"]',
        '.gc-job-detail__salary',
        
        // Common patterns
        '.salary',
        '.compensation',
        '.pay',
        '[data-testid="salary"]',
        '.posting-salary'
      ]

      // Helper function to get text from selectors
      const getTextFromSelectors = (selectors: string[]): string => {
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i]
            const text = element.textContent?.trim()
            if (text && text.length > 3 && !text.toLowerCase().includes('job details')) {
              // Clean up the text
              return text.replace(/\s+/g, ' ').trim()
            }
          }
        }
        return ''
      }

      // Helper function to get all text from elements
      const getAllTextFromSelectors = (selectors: string[]): string => {
        const texts: string[] = []
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i]
            const text = element.textContent?.trim()
            if (text && text.length > 10) {
              texts.push(text.replace(/\s+/g, ' ').trim())
            }
          }
        }
        return texts.join('\n\n')
      }

      // Extract title
      let title = getTextFromSelectors(titleSelectors)
      if (!title) {
        // Fallback to page title
        title = document.title || ''
      }

      // Extract description
      let description = getAllTextFromSelectors(descriptionSelectors)
      if (!description) {
        // Fallback to meta description
        const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement
        description = metaDesc?.content || ''
        
        // If still no description, try to get main content
        if (!description) {
          const mainContent = document.querySelector('main, article, [role="main"], .main-content')
          if (mainContent) {
            description = mainContent.textContent?.replace(/\s+/g, ' ').trim() || ''
          }
        }
      }

      // Extract company
      let company = getTextFromSelectors(companySelectors)
      
      // Special handling for Google careers
      if (!company && window.location.hostname.includes('google.com')) {
        company = 'Google'
      }

      // Extract location
      const location = getTextFromSelectors(locationSelectors)

      // Extract salary
      const salary = getTextFromSelectors(salarySelectors)

      // Try to extract skills/requirements
      const skillsSelectors = [
        '.requirements',
        '.skills',
        '.qualifications',
        '.job-requirements',
        // Google specific
        '[itemprop="skills"]',
        '.gc-job-detail__requirements',
        'div[class*="qualification"]',
        'div[class*="requirement"]'
      ]
      let skills: string[] = []
      
      // First try to get from specific sections
      const skillText = getAllTextFromSelectors(skillsSelectors)
      
      // If no specific section, search in description
      const searchText = skillText || description
      
      // Extended skill patterns
      const techSkills = searchText.match(/\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|\.NET|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|Git|GitHub|GitLab|AWS|Azure|GCP|Docker|Kubernetes|Terraform|CI\/CD|Machine Learning|AI|Data Science|Analytics|GraphQL|REST|API|Microservices|Linux|Unix|Agile|Scrum|HTML|CSS|SASS|Webpack|DevOps|Cloud|TensorFlow|PyTorch|Kafka|RabbitMQ|Elasticsearch|Jenkins|Ansible)\b/gi)
      
      if (techSkills) {
        skills = Array.from(new Set(techSkills.map(skill => skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase())))
      }

      // Debug info
      console.log('Scraped data:', {
        title: title?.substring(0, 50),
        company: company,
        hasDescription: description.length > 0,
        descriptionLength: description.length,
        skillsFound: skills.length
      })

      return {
        title: title.substring(0, 200), // Limit title length
        description: description.substring(0, 2000), // Limit description length
        company: company.substring(0, 100),
        location: location.substring(0, 100),
        salary: salary.substring(0, 100),
        skills: skills.slice(0, 10) // Limit to 10 skills
      }
    })

    await browser.close()

    // Clean up the extracted data
    const cleanedData = {
      title: jobData.title?.replace(/\s+/g, ' ').trim() || '',
      description: jobData.description?.replace(/\s+/g, ' ').trim() || '',
      company: jobData.company?.replace(/\s+/g, ' ').trim() || '',
      location: jobData.location?.replace(/\s+/g, ' ').trim() || '',
      salary: jobData.salary?.replace(/\s+/g, ' ').trim() || '',
      skills: jobData.skills || []
    }

    res.status(200).json({
      success: true,
      data: cleanedData
    })

  } catch (error) {
    console.error('Error scraping job content:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to scrape job content'
    })
  }
}