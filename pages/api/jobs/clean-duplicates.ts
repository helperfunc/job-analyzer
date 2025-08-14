import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    // Get all jobs sorted by created_at (keep the oldest)
    const { data: allJobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    // Track unique jobs by company + title + location
    const uniqueJobs = new Map<string, any>()
    const duplicateIds: string[] = []

    allJobs?.forEach(job => {
      // Create a unique key for each job (case-insensitive and normalized)
      const normalizedCompany = (job.company || '').toLowerCase().trim()
      const normalizedTitle = (job.title || '').toLowerCase().trim()
      const normalizedLocation = (job.location || '').toLowerCase().trim()
      
      const key = `${normalizedCompany}|${normalizedTitle}|${normalizedLocation}`
      
      if (!uniqueJobs.has(key)) {
        // First occurrence - keep it
        uniqueJobs.set(key, job)
      } else {
        // Duplicate - mark for deletion
        duplicateIds.push(job.id)
        console.log(`Found duplicate: ${job.title} at ${job.company} (${job.location})`)
      }
    })

    // Delete duplicates in batches
    const batchSize = 50
    let deletedCount = 0

    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize)
      
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .in('id', batch)

      if (deleteError) {
        console.error('Error deleting batch:', deleteError)
      } else {
        deletedCount += batch.length
      }
    }

    res.status(200).json({
      success: true,
      message: `Cleaned ${deletedCount} duplicate jobs`,
      stats: {
        totalJobsBefore: allJobs?.length || 0,
        totalJobsAfter: uniqueJobs.size,
        duplicatesRemoved: deletedCount
      }
    })

  } catch (error) {
    console.error('Error cleaning duplicates:', error)
    res.status(500).json({ 
      error: 'Failed to clean duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}