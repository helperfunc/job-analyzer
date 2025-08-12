import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

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
    const { job_id, paper_id, relevance_score, relevance_reason } = req.body

    if (!job_id || !paper_id) {
      return res.status(400).json({
        success: false,
        error: 'Job ID and Paper ID are required'
      })
    }

    const score = relevance_score || 0.5

    if (score < 0 || score > 1) {
      return res.status(400).json({
        success: false,
        error: 'Relevance score must be between 0 and 1'
      })
    }

    const { data, error } = await supabase
      .from('job_paper_relations')
      .upsert([{
        job_id,
        paper_id,
        relevance_score: score,
        relevance_reason
      }], {
        onConflict: 'job_id,paper_id'
      })
      .select()
      .single()

    if (error) throw error

    res.status(200).json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error relating paper to job:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to relate paper to job'
    })
  }
}