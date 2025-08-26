import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../lib/supabase'
import { getCurrentUser } from '../../lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    const user = await getCurrentUser(req)
    const userId = user ? user.userId : null

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' })
    }

    // Test direct queries
    const { data: jobThoughts, error: e1 } = await supabase
      .from('job_thoughts')
      .select('*')
      .eq('user_id', userId)

    const { data: paperInsights, error: e2 } = await supabase
      .from('paper_insights')
      .select('*')
      .eq('user_id', userId)

    const { data: resourceThoughts, error: e3 } = await supabase
      .from('resource_thoughts')
      .select('*')
      .eq('user_id', userId)

    // Also check with 'default' user_id
    const { data: defaultJobThoughts } = await supabase
      .from('job_thoughts')
      .select('*')
      .eq('user_id', 'default')

    const { data: defaultPaperInsights } = await supabase
      .from('paper_insights')
      .select('*')
      .eq('user_id', 'default')

    return res.status(200).json({
      userId,
      counts: {
        jobThoughts: jobThoughts?.length || 0,
        paperInsights: paperInsights?.length || 0,
        resourceThoughts: resourceThoughts?.length || 0,
        defaultJobThoughts: defaultJobThoughts?.length || 0,
        defaultPaperInsights: defaultPaperInsights?.length || 0
      },
      samples: {
        jobThought: jobThoughts?.[0],
        paperInsight: paperInsights?.[0],
        resourceThought: resourceThoughts?.[0]
      },
      errors: {
        jobThoughts: e1,
        paperInsights: e2,
        resourceThoughts: e3
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}