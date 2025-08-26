import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured'
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
    
    // Delete papers with bad titles (containing newlines or "Explore a selection")
    const { data: badPapers, error: fetchError } = await supabase
      .from('research_papers')
      .select('id, title')
      .or('title.ilike.%\n%,title.ilike.%Explore a selection%')

    if (fetchError) throw fetchError

    if (badPapers && badPapers.length > 0) {
      const badIds = badPapers.map(p => p.id)
      
      const { error: deleteError } = await supabase
        .from('research_papers')
        .delete()
        .in('id', badIds)

      if (deleteError) throw deleteError

      return res.status(200).json({
        success: true,
        message: `Cleaned up ${badPapers.length} bad papers`,
        deletedPapers: badPapers
      })
    } else {
      return res.status(200).json({
        success: true,
        message: 'No bad papers found to clean up'
      })
    }
  } catch (error) {
    console.error('Error cleaning up bad papers:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to clean up bad papers'
    })
  }
}