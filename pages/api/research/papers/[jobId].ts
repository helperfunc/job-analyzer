import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { jobId } = req.query

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Job ID is required'
    })
  }

  if (req.method === 'GET') {
    try {
      // Get papers related to the position
      const { data, error } = await supabase
        .from('job_paper_relations')
        .select(`
          *,
          paper:research_papers(*)
        `)
        .eq('job_id', jobId)
        .order('relevance_score', { ascending: false })

      if (error) throw error

      res.status(200).json({
        success: true,
        data: data || []
      })
    } catch (error) {
      console.error('Error fetching related papers:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch related papers'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}