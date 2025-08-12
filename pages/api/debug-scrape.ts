import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query
  const targetUrl = url as string || 'https://openai.com/research/index/?display=list'

  try {
    console.log(`🔍 Debug scraping: ${targetUrl}`)
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    if (!response.ok) {
      return res.status(400).json({
        error: `Failed to fetch: ${response.status}`,
        url: targetUrl
      })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Analyze the page
    const analysis = {
      url: targetUrl,
      htmlLength: html.length,
      title: $('title').text(),
      hasBodyContent: $('body').text().length > 0,
      headings: [] as string[],
      links: [] as string[],
      scripts: [] as string[],
      rawContent: html.substring(0, 2000) // First 2000 chars
    }

    // Get headings
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const text = $(el).text().trim()
      if (text) {
        analysis.headings.push(text)
      }
    })

    // Get research-related links
    $('a').each((_, el) => {
      const href = $(el).attr('href')
      const text = $(el).text().trim()
      if (href && (text.toLowerCase().includes('research') || 
                  text.toLowerCase().includes('paper') ||
                  text.toLowerCase().includes('gpt') ||
                  href.includes('research'))) {
        analysis.links.push(`${text} -> ${href}`)
      }
    })

    // Get script tags (to understand if it's JS-heavy)
    $('script').each((_, el) => {
      const src = $(el).attr('src')
      if (src) {
        analysis.scripts.push(src)
      }
    })

    res.status(200).json({
      success: true,
      analysis,
      // Include some raw HTML for inspection (first 3000 chars)
      sampleHtml: html.substring(0, 3000)
    })

  } catch (error) {
    res.status(500).json({
      error: 'Failed to scrape',
      details: error instanceof Error ? error.message : 'Unknown error',
      url: targetUrl
    })
  }
}