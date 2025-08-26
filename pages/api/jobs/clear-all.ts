import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
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

    // Get total count before deletion
    const { count: totalCount, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error counting jobs:', countError)
    }

    // Delete all jobs
    const { error } = await supabase
      .from('jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // This condition will match all records

    if (error) throw error

    res.status(200).json({
      success: true,
      message: `Successfully deleted all ${totalCount || 0} jobs from database`,
      deletedCount: totalCount || 0
    })

  } catch (error) {
    console.error('Error clearing all jobs:', error)
    res.status(500).json({ 
      error: 'Failed to clear jobs database',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}