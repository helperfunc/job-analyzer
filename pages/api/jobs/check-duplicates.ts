import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
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
    
    if (!isSupabaseAvailable()) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    // Get all jobs
    const { data: allJobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by company and count
    const companyStats = new Map<string, {
      total: number,
      uniqueTitles: Set<string>,
      duplicates: Array<{title: string, count: number}>
    }>()

    // Process jobs
    allJobs?.forEach(job => {
      const company = job.company || 'Unknown'
      if (!companyStats.has(company)) {
        companyStats.set(company, {
          total: 0,
          uniqueTitles: new Set(),
          duplicates: []
        })
      }
      
      const stats = companyStats.get(company)!
      stats.total++
      stats.uniqueTitles.add(job.title)
    })

    // Find duplicates
    const titleCounts = new Map<string, Map<string, number>>()
    
    allJobs?.forEach(job => {
      const company = job.company || 'Unknown'
      const title = job.title
      
      if (!titleCounts.has(company)) {
        titleCounts.set(company, new Map())
      }
      
      const companyTitles = titleCounts.get(company)!
      companyTitles.set(title, (companyTitles.get(title) || 0) + 1)
    })

    // Build duplicate info
    titleCounts.forEach((titles, company) => {
      const stats = companyStats.get(company)!
      titles.forEach((count, title) => {
        if (count > 1) {
          stats.duplicates.push({ title, count })
        }
      })
    })

    // Convert to array for response
    const result = Array.from(companyStats.entries()).map(([company, stats]) => ({
      company,
      totalJobs: stats.total,
      uniqueJobs: stats.uniqueTitles.size,
      duplicateCount: stats.total - stats.uniqueTitles.size,
      duplicates: stats.duplicates.sort((a, b) => b.count - a.count)
    }))

    res.status(200).json({
      success: true,
      totalJobs: allJobs?.length || 0,
      companies: result.sort((a, b) => b.totalJobs - a.totalJobs),
      summary: {
        totalDuplicates: result.reduce((sum, c) => sum + c.duplicateCount, 0),
        companiesWithDuplicates: result.filter(c => c.duplicateCount > 0).length
      }
    })

  } catch (error) {
    console.error('Error checking duplicates:', error)
    res.status(500).json({ 
      error: 'Failed to check duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}