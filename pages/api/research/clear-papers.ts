import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🗑️ Clear papers API called with method:', req.method)
  
  if (req.method !== 'DELETE') {
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
    
    // Check if Supabase is configured
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      })
    }

    // First get count of existing papers
    const { count: existingCount } = await supabase
      .from('research_papers')
      .select('*', { count: 'exact', head: true })

    console.log(`Found ${existingCount} papers to delete`)

    // Delete all papers from research_papers table
    const { error: papersError, count } = await supabase
      .from('research_papers')
      .delete()
      .gte('created_at', '1900-01-01') // This will match all rows

    if (papersError) {
      console.error('Error deleting papers:', papersError)
      throw papersError
    }

    // Also delete related data if it exists
    try {
      // Delete job-paper relations
      const { count: relationsCount } = await supabase
        .from('job_paper_relations')
        .delete()
        .gte('created_at', '1900-01-01')

      // Delete user insights related to papers
      const { count: insightsCount } = await supabase
        .from('user_insights')
        .delete()
        .gte('created_at', '1900-01-01')

      console.log(`✅ Cleaned up ${relationsCount || 0} relations and ${insightsCount || 0} insights`)
    } catch (cleanupError) {
      console.log('⚠️ Some cleanup failed (tables might not exist):', cleanupError)
    }

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${count || existingCount || 0} papers from database`,
      deletedCount: count || existingCount || 0
    })

  } catch (error) {
    console.error('Error clearing papers:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear papers',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}