import { NextApiRequest, NextApiResponse } from 'next'

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
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      })
    }

    // Fetch the paper page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch paper: ${response.status}`)
    }

    const html = await response.text()

    // Extract paper information
    const paperInfo = extractPaperInfo(url, html)

    res.status(200).json({
      success: true,
      data: paperInfo
    })

  } catch (error) {
    console.error('Error extracting paper info:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to extract paper information',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function extractPaperInfo(url: string, html: string) {
  // Initialize default values
  let title = ''
  let authors: string[] = []
  let abstract = ''
  let publication_date = ''
  let arxiv_id = ''
  let github_url = ''
  let company = ''
  let tags: string[] = []

  // Determine company from URL first
  if (url.includes('openai.com')) {
    company = 'OpenAI'
  } else if (url.includes('anthropic.com')) {
    company = 'Anthropic'
  } else if (url.includes('deepseek.com')) {
    company = 'DeepSeek'
  } else if (url.includes('google.com') || url.includes('googleblog.com')) {
    company = 'Google'
  } else if (url.includes('microsoft.com')) {
    company = 'Microsoft'
  } else if (url.includes('meta.com') || url.includes('facebook.com')) {
    company = 'Meta'
  }

  // Extract arXiv ID from URL
  const arxivMatch = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i)
  if (arxivMatch) {
    arxiv_id = arxivMatch[1]
  }

  // Extract title
  const titleMatches = [
    html.match(/<title[^>]*>(.*?)<\/title>/i),
    html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h1>/i),
    html.match(/<h1[^>]*>(.*?)<\/h1>/i),
    html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i),
    html.match(/<meta[^>]*name="title"[^>]*content="([^"]*)"[^>]*>/i)
  ]

  for (const match of titleMatches) {
    if (match && match[1]) {
      title = match[1].trim().replace(/\s+/g, ' ')
      // Clean up common title suffixes
      title = title.replace(/\s*-\s*(arXiv|OpenAI|Anthropic|Research).*$/i, '')
      break
    }
  }

  // Extract authors
  const authorMatches = [
    html.match(/<meta[^>]*name="(?:authors?|citation_author)"[^>]*content="([^"]*)"[^>]*>/gi),
    html.match(/<span[^>]*class="[^"]*author[^"]*"[^>]*>(.*?)<\/span>/gi),
    html.match(/<div[^>]*class="[^"]*author[^"]*"[^>]*>(.*?)<\/div>/gi)
  ]

  if (authorMatches[0]) {
    authorMatches[0].forEach(match => {
      const content = match.match(/content="([^"]*)"/)
      if (content && content[1]) {
        const author = content[1].trim()
        if (author && !authors.includes(author)) {
          authors.push(author)
        }
      }
    })
  }

  // Extract abstract
  const abstractMatches = [
    html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i),
    html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i),
    html.match(/<div[^>]*class="[^"]*abstract[^"]*"[^>]*>(.*?)<\/div>/i),
    html.match(/<p[^>]*class="[^"]*abstract[^"]*"[^>]*>(.*?)<\/p>/i),
    html.match(/<section[^>]*class="[^"]*abstract[^"]*"[^>]*>(.*?)<\/section>/i)
  ]

  for (const match of abstractMatches) {
    if (match && match[1]) {
      abstract = match[1].trim()
      // Clean HTML tags
      abstract = abstract.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      if (abstract.length > 50) { // Only use if substantial
        break
      }
    }
  }

  // Extract publication date
  const dateMatches = [
    html.match(/<meta[^>]*name="citation_publication_date"[^>]*content="([^"]*)"[^>]*>/i),
    html.match(/<meta[^>]*name="citation_date"[^>]*content="([^"]*)"[^>]*>/i),
    html.match(/<time[^>]*datetime="([^"]*)"[^>]*>/i),
    html.match(/(\d{4}-\d{2}-\d{2})/),
    html.match(/(\d{1,2}\/\d{1,2}\/\d{4})/),
    html.match(/(\d{4})/), // Just year as fallback
  ]

  for (const match of dateMatches) {
    if (match && match[1]) {
      publication_date = match[1]
      break
    }
  }

  // Extract GitHub URL
  const githubMatch = html.match(/https?:\/\/github\.com\/[^\s"'<>]+/i)
  if (githubMatch) {
    github_url = githubMatch[0]
  }

  // Try to detect company from content if not already set
  if (!company) {
    const contentLower = html.toLowerCase()
    const allAuthors = authors.join(' ').toLowerCase()
    const titleLower = title.toLowerCase()
    
    // Company detection patterns
    const companyPatterns = [
      { pattern: /deepseek/i, company: 'DeepSeek' },
      { pattern: /openai/i, company: 'OpenAI' },
      { pattern: /anthropic/i, company: 'Anthropic' },
      { pattern: /google|deepmind/i, company: 'Google' },
      { pattern: /microsoft/i, company: 'Microsoft' },
      { pattern: /meta|facebook/i, company: 'Meta' },
      { pattern: /amazon|aws/i, company: 'Amazon' },
      { pattern: /nvidia/i, company: 'NVIDIA' },
      { pattern: /apple/i, company: 'Apple' },
      { pattern: /baidu/i, company: 'Baidu' },
      { pattern: /alibaba/i, company: 'Alibaba' },
      { pattern: /tencent/i, company: 'Tencent' },
      { pattern: /stanford/i, company: 'Stanford' },
      { pattern: /mit\b/i, company: 'MIT' },
      { pattern: /berkeley/i, company: 'UC Berkeley' }
    ]
    
    // Check title and authors first (most reliable)
    for (const {pattern, company: companyName} of companyPatterns) {
      if (pattern.test(titleLower) || pattern.test(allAuthors)) {
        company = companyName
        break
      }
    }
    
    // If still no company, check content
    if (!company) {
      for (const {pattern, company: companyName} of companyPatterns) {
        if (pattern.test(contentLower)) {
          company = companyName
          break
        }
      }
    }
  }

  // Generate tags based on content
  const content = html.toLowerCase()
  const possibleTags = [
    'machine learning', 'deep learning', 'neural networks', 'ai', 'nlp', 
    'computer vision', 'reinforcement learning', 'transformers', 'gpt',
    'language models', 'multimodal', 'safety', 'alignment', 'robotics',
    'reasoning', 'training', 'inference', 'scaling', 'emergent abilities'
  ]

  possibleTags.forEach(tag => {
    if (content.includes(tag.toLowerCase())) {
      tags.push(tag)
    }
  })

  // Ensure we have at least some basic info
  if (!title) {
    title = `Paper from ${new URL(url).hostname}`
  }

  if (!publication_date) {
    publication_date = new Date().toISOString().split('T')[0]
  }

  return {
    title,
    authors,
    abstract,
    publication_date,
    url,
    arxiv_id,
    github_url,
    company,
    tags
  }
}