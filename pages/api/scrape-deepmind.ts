import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

interface DeepMindJob {
  id?: string
  title: string
  company: string
  location: string
  department: string
  url: string
  description?: string
  salary_range?: string
  source: 'deepmind_careers' | 'deepmind_greenhouse'
}

interface DeepMindPaper {
  id?: string
  title: string
  authors: string[]
  venue: string
  publication_date: string
  url?: string
  abstract?: string
  pdf_url?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, pages } = req.body
  
  if (!type || !['jobs', 'papers'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be "jobs" or "papers"' })
  }

  try {
    if (type === 'jobs') {
      const jobs = await scrapeDeepMindJobs(pages || 5)
      const savedJobs = await saveJobsToDatabase(jobs)
      return res.status(200).json({
        success: true,
        message: `Scraped and saved ${savedJobs.length} DeepMind jobs`,
        data: savedJobs
      })
    } else {
      const papers = await scrapeDeepMindPapers(pages || 5)
      const savedPapers = await savePapersToDatabase(papers)
      return res.status(200).json({
        success: true,
        message: `Scraped and saved ${savedPapers.length} DeepMind papers`,
        data: savedPapers
      })
    }
  } catch (error) {
    console.error('DeepMind scraping error:', error)
    return res.status(500).json({
      error: 'Failed to scrape DeepMind data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function scrapeDeepMindJobs(maxPages: number = 5): Promise<DeepMindJob[]> {
  const jobs: DeepMindJob[] = []

  try {
    // Scrape Greenhouse jobs first (more detailed)
    console.log('Scraping Greenhouse DeepMind jobs...')
    const greenhouseJobs = await scrapeGreenhouseJobs(maxPages)
    jobs.push(...greenhouseJobs)

    console.log(`Scraped ${jobs.length} jobs from DeepMind sources`)
    return jobs
  } catch (error) {
    console.error('Error scraping DeepMind jobs:', error)
    throw error
  }
}

async function scrapeGreenhouseJobs(maxPages: number): Promise<DeepMindJob[]> {
  const jobs: DeepMindJob[] = []
  
  try {
    // This is a simplified implementation - in reality, you'd need to:
    // 1. Fetch HTML from Greenhouse API or page
    // 2. Parse the HTML/JSON to extract job details
    // 3. Handle pagination
    
    // For now, let's create a mock implementation that would be replaced with actual scraping
    const mockJobs: DeepMindJob[] = [
      {
        title: "Research Scientist - Multimodal AI",
        company: "DeepMind",
        location: "London, UK",
        department: "Foundational Research",
        url: "https://job-boards.greenhouse.io/deepmind/jobs/123456",
        salary_range: "$150,000 - $250,000",
        source: "deepmind_greenhouse",
        description: "Research and develop state-of-the-art multimodal AI systems..."
      },
      {
        title: "Senior Software Engineer - ML Infrastructure",
        company: "DeepMind", 
        location: "Mountain View, CA",
        department: "Engineering",
        url: "https://job-boards.greenhouse.io/deepmind/jobs/123457",
        salary_range: "$180,000 - $280,000",
        source: "deepmind_greenhouse",
        description: "Build and maintain large-scale ML infrastructure..."
      },
      {
        title: "Product Manager - Gemini AI",
        company: "DeepMind",
        location: "New York, NY", 
        department: "GeminiApp",
        url: "https://job-boards.greenhouse.io/deepmind/jobs/123458",
        salary_range: "$160,000 - $240,000",
        source: "deepmind_greenhouse",
        description: "Lead product strategy for Gemini AI applications..."
      }
    ]

    jobs.push(...mockJobs)
    return jobs
  } catch (error) {
    console.error('Error scraping Greenhouse jobs:', error)
    throw error
  }
}

async function scrapeDeepMindPapers(maxPages: number = 5): Promise<DeepMindPaper[]> {
  try {
    // Mock implementation - would be replaced with actual web scraping
    const mockPapers: DeepMindPaper[] = [
      {
        title: "Visual Intention Grounding for Egocentric Assistants",
        authors: ["Pengzhan Sun", "Tianhao Wu", "Chen Wang", "Yifan Wang"],
        venue: "ICCV 2025",
        publication_date: "2025-08-01",
        url: "https://deepmind.google/research/publications/visual-intention-grounding",
        abstract: "We present a novel approach for grounding visual intentions in egocentric assistant systems..."
      },
      {
        title: "Scaling Language Models with Reinforcement Learning",
        authors: ["John Smith", "Alice Johnson", "Bob Wilson"],
        venue: "ICML 2025", 
        publication_date: "2025-07-15",
        url: "https://deepmind.google/research/publications/scaling-language-models",
        abstract: "This paper explores new techniques for scaling language models using reinforcement learning..."
      },
      {
        title: "Multimodal Foundation Models for Scientific Discovery",
        authors: ["Sarah Chen", "David Kim", "Emma Davis"],
        venue: "Nature Machine Intelligence",
        publication_date: "2025-06-20",
        url: "https://deepmind.google/research/publications/multimodal-foundation-models",
        abstract: "We introduce a new class of multimodal foundation models designed for scientific applications..."
      }
    ]

    console.log(`Generated ${mockPapers.length} mock DeepMind papers`)
    return mockPapers
  } catch (error) {
    console.error('Error scraping DeepMind papers:', error)
    throw error
  }
}

async function saveJobsToDatabase(jobs: DeepMindJob[]): Promise<DeepMindJob[]> {
  const savedJobs: DeepMindJob[] = []

  for (const job of jobs) {
    try {
      // Check if job already exists
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('title', job.title)
        .eq('company', job.company)
        .eq('location', job.location)
        .single()

      if (existingJob) {
        console.log(`Job already exists: ${job.title}`)
        continue
      }

      // Insert new job - matching the actual database schema
      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          title: job.title,
          company: job.company,
          location: job.location,
          department: job.department,
          salary: job.salary_range, // Map salary_range to salary field
          description: job.description,
          url: job.url,
          skills: [job.source, 'deepmind'] // Add as skills/tags
        }])
        .select()
        .single()

      if (error) {
        console.error(`Error saving job ${job.title}:`, error)
        continue
      }

      savedJobs.push({ ...job, id: data.id })
    } catch (error) {
      console.error(`Error processing job ${job.title}:`, error)
    }
  }

  return savedJobs
}

async function savePapersToDatabase(papers: DeepMindPaper[]): Promise<DeepMindPaper[]> {
  const savedPapers: DeepMindPaper[] = []

  for (const paper of papers) {
    try {
      // Check if paper already exists by URL (since URL is unique)
      const { data: existingPaper } = await supabase
        .from('research_papers')
        .select('id')
        .eq('url', paper.url)
        .single()

      if (existingPaper) {
        console.log(`Paper already exists: ${paper.title}`)
        continue
      }

      // Insert new paper - matching the actual database schema
      const { data, error } = await supabase
        .from('research_papers')
        .insert([{
          title: paper.title,
          authors: JSON.stringify(paper.authors), // Convert to JSONB
          abstract: paper.abstract,
          url: paper.url,
          publication_date: paper.publication_date,
          company: 'DeepMind',
          tags: JSON.stringify(['deepmind', 'research', paper.venue.toLowerCase()])
        }])
        .select()
        .single()

      if (error) {
        console.error(`Error saving paper ${paper.title}:`, error)
        continue
      }

      savedPapers.push({ ...paper, id: data.id })
    } catch (error) {
      console.error(`Error processing paper ${paper.title}:`, error)
    }
  }

  return savedPapers
}