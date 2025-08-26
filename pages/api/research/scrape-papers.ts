import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import * as cheerio from 'cheerio'

interface Paper {
  title: string
  authors: string[]
  publication_date?: string
  abstract?: string
  url: string
  arxiv_id?: string
  github_url?: string
  company: string
  tags: string[]
}

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

  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    const { company } = req.body

    if (!company || !['openai', 'anthropic'].includes(company.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Company must be either "openai" or "anthropic"'
      })
    }

    const papers: Paper[] = []

    if (company.toLowerCase() === 'openai') {
      papers.push(...await scrapeOpenAIPapers())
    } else {
      papers.push(...await scrapeAnthropicPapers())
    }

    // Save papers to database if Supabase is configured
    if (supabase && papers.length > 0) {
      // Insert papers one by one to handle duplicates gracefully
      let savedCount = 0
      for (const paper of papers) {
        try {
          const { data, error } = await supabase
            .from('research_papers')
            .upsert([paper], { 
              onConflict: 'url'
            })
            .select()

          if (!error && data) {
            savedCount += data.length
          }
        } catch (err) {
          console.log(`⚠️ Paper already exists or error: ${paper.title}`)
        }
      }
      console.log(`✅ Saved ${savedCount} papers to database`)
    }

    res.status(200).json({
      success: true,
      company,
      count: papers.length,
      papers: papers.slice(0, 10), // Return first 10 papers as preview
      message: `Successfully scraped ${papers.length} papers from ${company}`
    })

  } catch (error) {
    console.error('Error scraping papers:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to scrape papers',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function scrapeOpenAIPapers(): Promise<Paper[]> {
  const papers: Paper[] = []
  
  try {
    console.log('🔍 Scraping OpenAI research papers...')
    
    // Note: OpenAI website is protected by Cloudflare
    // Use Puppeteer version for real-time scraping: /api/research/scrape-papers-puppeteer
    console.log('⚠️ This endpoint uses static data. For real-time scraping, use /api/research/scrape-papers-puppeteer')
    
    // No static papers - rely on real scraping
    console.log(`ℹ️ No static papers loaded. Use Puppeteer endpoint for live data.`)
    
  } catch (error) {
    console.error('Error scraping OpenAI papers:', error)
  }

  return papers
}

async function scrapeAnthropicPapers(): Promise<Paper[]> {
  const papers: Paper[] = []
  
  try {
    console.log('🔍 Scraping Anthropic research papers...')
    
    // Note: Many official sites are protected by Cloudflare, using curated data instead
    // await scrapeAnthropicResearchPage(papers)
    // await scrapeAnthropicBlogPapers(papers)

    // Note: Anthropic website is likely also protected by Cloudflare
    // Using curated paper list instead of scraping

    // No static papers - rely on real scraping
    console.log('ℹ️ No static Anthropic papers loaded. Use Puppeteer endpoint for live data.')
  } catch (error) {
    console.error('Error scraping Anthropic papers:', error)
  }

  return papers
}

function parseDate(dateText: string): string | undefined {
  if (!dateText) return undefined
  
  // Try to parse various date formats
  const date = new Date(dateText)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  
  // Try to extract year
  const yearMatch = dateText.match(/20\d{2}/)
  if (yearMatch) {
    return `${yearMatch[0]}-01-01`
  }
  
  return undefined
}

function generateTags(text: string): string[] {
  const tags: string[] = []
  const lowerText = text.toLowerCase()
  
  // Common AI/ML keywords
  const keywords = [
    'transformer', 'attention', 'llm', 'language model', 'gpt', 'claude',
    'safety', 'alignment', 'rlhf', 'constitutional ai', 'scaling',
    'multimodal', 'vision', 'reasoning', 'benchmark', 'evaluation',
    'fine-tuning', 'training', 'inference', 'optimization'
  ]
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      tags.push(keyword.replace(/\s+/g, '-'))
    }
  })
  
  return [...new Set(tags)] // Remove duplicates
}

// Enhanced scraping functions
async function scrapeOpenAIResearchPage(papers: Paper[]): Promise<void> {
  try {
    // Try multiple OpenAI research URLs
    const urls = [
      'https://openai.com/research/',
      'https://openai.com/research/index/',
      'https://openai.com/research/index/?display=list',
      'https://openai.com/index/',  // Main blog/updates
      'https://openai.com/news/',   // News section
    ]
    
    for (const url of urls) {
      console.log(`🔍 Trying to scrape: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      if (!response.ok) {
        console.log(`⚠️ OpenAI page ${url} returned ${response.status}`)
        continue
      }

      const html = await response.text()
      const $ = cheerio.load(html)
      
      console.log(`📄 Received HTML content length: ${html.length}`)
      
      // Debug: Log some key content to understand page structure
      const bodyText = $('body').text()
      const hasResearchContent = /research|paper|publication/i.test(bodyText)
      const hasGPTContent = /gpt|dall|whisper/i.test(bodyText)
      console.log(`🔍 Page analysis: hasResearch=${hasResearchContent}, hasGPT=${hasGPTContent}`)
      
      // Log first few headings to understand structure
      $('h1, h2, h3').slice(0, 5).each((i, el) => {
        console.log(`📋 Heading ${i + 1}: ${$(el).text().trim().substring(0, 100)}`)
      })
      
      // Look for research papers with more specific selectors
      const selectors = [
        // List view specific
        '.research-list-item',
        '.paper-list-item', 
        '[data-research-item]',
        '.research-card',
        
        // General content
        'article',
        '[class*="research"]',
        '[class*="paper"]',
        '[class*="publication"]',
        '.card',
        
        // Fallback to headings
        'h1, h2, h3, h4, h5'
      ]
      
      let foundPapers = 0
      
      for (const selector of selectors) {
        const elements = $(selector)
        console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`)
        
        elements.each((_, element) => {
          const $elem = $(element)
          const text = $elem.text().trim()
          
          // More sophisticated paper detection
          const isPaperContent = (
            text.length > 15 && 
            text.length < 1000 && // Avoid entire page content
            (
              // Look for research keywords
              /\b(GPT|DALL|Whisper|CLIP|ChatGPT|InstructGPT|Codex|SORA|Point-E)\b/i.test(text) ||
              /\b(paper|research|model|training|learning|neural|AI|machine learning)\b/i.test(text) ||
              // Look for arXiv patterns
              /arxiv/i.test(text) ||
              // Look for publication dates
              /\b(202[0-9]|201[0-9])\b/.test(text)
            )
          )
          
          if (isPaperContent) {
            // Extract title more carefully
            let title = ''
            
            // Try different title extraction methods
            const titleSelectors = [
              'h1, h2, h3, h4, h5',
              '.title',
              '[class*="title"]',
              '[class*="heading"]',
              'strong',
              'b'
            ]
            
            for (const titleSel of titleSelectors) {
              const titleElem = $elem.find(titleSel).first()
              if (titleElem.length) {
                title = titleElem.text().trim()
                break
              }
            }
            
            // Fallback to first line
            if (!title) {
              title = text.split('\n')[0].trim()
            }
            
            // Clean and validate title
            title = title.replace(/^(research|paper|publication|study):\s*/i, '').trim()
            
            if (title.length > 10 && title.length < 200 && !papers.some(p => p.title === title)) {
              // Extract URL
              let paperUrl = $elem.find('a').first().attr('href') ||
                            $elem.closest('a').attr('href') ||
                            $elem.parents().find('a').first().attr('href')
              
              if (paperUrl && !paperUrl.startsWith('http')) {
                paperUrl = `https://openai.com${paperUrl.startsWith('/') ? '' : '/'}${paperUrl}`
              }
              
              // Extract date
              const dateMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(202[0-9]|201[0-9])\b/) ||
                               text.match(/\b(202[0-9]|201[0-9])-(\d{2})-(\d{2})\b/) ||
                               text.match(/\b(202[0-9]|201[0-9])\b/)
              
              const publication_date = dateMatch ? 
                (dateMatch[0].length === 4 ? `${dateMatch[0]}-01-01` : new Date(dateMatch[0]).toISOString().split('T')[0]) :
                new Date().toISOString().split('T')[0]
              
              // Extract abstract/description
              const abstract = $elem.find('p, .description, [class*="abstract"]').first().text().trim() ||
                              text.substring(title.length).trim().substring(0, 300) + '...'
              
              papers.push({
                title,
                authors: ['OpenAI'],
                publication_date,
                abstract,
                url: paperUrl || `https://openai.com/research`,
                company: 'OpenAI',
                tags: generateTags(title + ' ' + abstract)
              })
              
              foundPapers++
              console.log(`📝 Found paper: ${title.substring(0, 50)}...`)
            }
          }
        })
      }
      
      console.log(`✅ Found ${foundPapers} papers from ${url}`)
      
      // If we found papers from this URL, we can break or continue to next URL
      if (foundPapers > 0) {
        break
      }
    }
    
    console.log(`🔍 Total papers found from OpenAI research pages: ${papers.length}`)
  } catch (error) {
    console.log('⚠️ Could not scrape OpenAI research page:', error)
  }
}

async function scrapeOpenAIBlogPapers(papers: Paper[]): Promise<void> {
  try {
    // Try multiple blog/news URLs
    const blogUrls = [
      'https://openai.com/blog/',
      'https://openai.com/news/',
      'https://openai.com/index/',
    ]
    
    for (const blogUrl of blogUrls) {
      console.log(`🔍 Scraping OpenAI blog: ${blogUrl}`)
      
      const response = await fetch(blogUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (!response.ok) continue

      const html = await response.text()
      const $ = cheerio.load(html)
      
      // Look for blog posts about research
      $('article, .blog-post, [class*="post"]').each((_, element) => {
        const $elem = $(element)
        const title = $elem.find('h1, h2, h3, .title').first().text().trim()
        const text = $elem.text().toLowerCase()
        
        // Filter for research-related blog posts
        if (title && title.length > 10 && (
          text.includes('research') ||
          text.includes('paper') ||
          text.includes('model') ||
          text.includes('gpt') ||
          text.includes('dall') ||
          text.includes('training')
        )) {
          const url = $elem.find('a').first().attr('href') || 
                     $elem.closest('a').attr('href')
          
          if (title && !papers.some(p => p.title === title)) {
            papers.push({
              title,
              authors: ['OpenAI'],
              publication_date: new Date().toISOString().split('T')[0],
              abstract: $elem.find('p').first().text().trim() || 'Blog post from OpenAI',
              url: url?.startsWith('http') ? url : `https://openai.com${url || ''}`,
              company: 'OpenAI',
              tags: generateTags(text)
            })
          }
        }
      })
    }
    
    console.log(`🔍 Found additional papers from OpenAI blogs`)
  } catch (error) {
    console.log('⚠️ Could not scrape OpenAI blogs:', error)
  }
}


// Additional scraping functions for Anthropic
async function scrapeAnthropicResearchPage(papers: Paper[]): Promise<void> {
  try {
    const response = await fetch('https://www.anthropic.com/research', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) return

    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Look for research-specific content
    $('main, .research-section, [class*="content"]').each((_, element) => {
      const $elem = $(element)
      
      $elem.find('h1, h2, h3, h4').each((_, headingEl) => {
        const $heading = $(headingEl)
        const title = $heading.text().trim()
        const text = $heading.parent().text()
        
        if (title.length > 10 && (
          text.includes('paper') ||
          text.includes('research') ||
          text.includes('Claude') ||
          text.includes('constitutional') ||
          text.includes('safety')
        )) {
          if (!papers.some(p => p.title === title)) {
            papers.push({
              title,
              authors: ['Anthropic'],
              publication_date: new Date().toISOString().split('T')[0],
              abstract: text.substring(0, 300) + '...',
              url: 'https://www.anthropic.com/research',
              company: 'Anthropic',
              tags: generateTags(text)
            })
          }
        }
      })
    })
  } catch (error) {
    console.log('⚠️ Could not scrape Anthropic research page:', error)
  }
}

async function scrapeAnthropicBlogPapers(papers: Paper[]): Promise<void> {
  try {
    const response = await fetch('https://www.anthropic.com/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) return

    const html = await response.text()
    const $ = cheerio.load(html)
    
    $('article, [class*="post"], [class*="news"]').each((_, element) => {
      const $elem = $(element)
      const title = $elem.find('h1, h2, h3, .title').first().text().trim()
      const text = $elem.text().toLowerCase()
      
      if (title && title.length > 10 && (
        text.includes('research') ||
        text.includes('paper') ||
        text.includes('claude') ||
        text.includes('constitutional') ||
        text.includes('safety') ||
        text.includes('alignment')
      )) {
        const url = $elem.find('a').first().attr('href') || 
                   $elem.closest('a').attr('href')
        
        if (!papers.some(p => p.title === title)) {
          papers.push({
            title,
            authors: ['Anthropic'],
            publication_date: new Date().toISOString().split('T')[0],
            abstract: $elem.find('p').first().text().trim() || 'News post from Anthropic',
            url: url?.startsWith('http') ? url : `https://www.anthropic.com${url || ''}`,
            company: 'Anthropic',
            tags: generateTags(text)
          })
        }
      }
    })
  } catch (error) {
    console.log('⚠️ Could not scrape Anthropic blog:', error)
  }
}

