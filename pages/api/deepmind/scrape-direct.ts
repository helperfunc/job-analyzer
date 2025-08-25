import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Try to fetch the DeepMind publications page directly
    const response = await fetch('https://deepmind.google/research/publications/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    const html = await response.text()

    const $ = cheerio.load(html)
    const papers: any[] = []

    // Log page structure for debugging
    console.log('Page title:', $('title').text())
    console.log('HTML length:', html.length)

    // Try multiple selector strategies
    const strategies = [
      // Strategy 1: Direct links to publications
      () => {
        $('a[href*="/research/publications/"]').each((_, elem) => {
          const $link = $(elem)
          const href = $link.attr('href') || ''
          const title = $link.text().trim()
          
          if (href && href.includes('/research/publications/') && title && title.length > 10 && !href.endsWith('/publications/')) {
            papers.push({
              title,
              url: href.startsWith('http') ? href : `https://deepmind.google${href}`,
              source: 'direct-link'
            })
          }
        })
      },
      
      // Strategy 2: Look for cards or articles
      () => {
        $('.glue-card, [class*="card"], article').each((_, elem) => {
          const $card = $(elem)
          const title = $card.find('h2, h3, h4, [class*="title"]').first().text().trim()
          const link = $card.find('a[href*="/research/publications/"]').first().attr('href')
          
          if (title && link) {
            papers.push({
              title,
              url: link.startsWith('http') ? link : `https://deepmind.google${link}`,
              source: 'card'
            })
          }
        })
      },
      
      // Strategy 3: Look for specific DeepMind patterns
      () => {
        // Check for any divs that might contain publication info
        $('div').each((_, elem) => {
          const $div = $(elem)
          const text = $div.text()
          
          // Look for publication-like patterns
          if (text.includes('2024') || text.includes('2023')) {
            const links = $div.find('a[href*="/research/publications/"]')
            if (links.length > 0) {
              links.each((_, link) => {
                const $link = $(link)
                const href = $link.attr('href') || ''
                const title = $link.text().trim() || $link.closest('[class*="title"]').text().trim()
                
                if (title && href && !papers.some(p => p.url === href)) {
                  papers.push({
                    title,
                    url: href.startsWith('http') ? href : `https://deepmind.google${href}`,
                    source: 'pattern-match'
                  })
                }
              })
            }
          }
        })
      }
    ]

    // Execute all strategies
    strategies.forEach((strategy, index) => {
      console.log(`Executing strategy ${index + 1}...`)
      strategy()
    })

    // Remove duplicates
    const uniquePapers = papers.filter((paper, index, self) => 
      index === self.findIndex(p => p.url === paper.url)
    )

    // Log results
    console.log(`Found ${uniquePapers.length} unique papers`)
    uniquePapers.slice(0, 5).forEach(paper => {
      console.log(`- ${paper.title} (${paper.source})`)
    })

    res.status(200).json({
      success: true,
      count: uniquePapers.length,
      papers: uniquePapers,
      strategies: strategies.length,
      html_sample: html.substring(0, 1000)
    })

  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}