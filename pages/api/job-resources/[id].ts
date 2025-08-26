import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid resource ID'
    })
  }

  if (req.method === 'DELETE') {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('job_resources')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Failed to delete job resource:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to delete job resource',
          details: error.message
        })
      }

      res.status(200).json({
        success: true,
        message: 'Job resource deleted successfully'
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      res.status(500).json({
        success: false,
        error: 'Unexpected server error'
      })
    }
  } else if (req.method === 'PUT') {
    try {
      const supabase = getSupabase()
      const { title, url, resource_type, description } = req.body

      const { data, error } = await supabase
        .from('job_resources')
        .update({
          title,
          url: url || null,
          resource_type,
          description: description || null
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Failed to update job resource:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to update job resource',
          details: error.message
        })
      }

      res.status(200).json({
        success: true,
        data: data[0]
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      res.status(500).json({
        success: false,
        error: 'Unexpected server error'
      })
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PUT'])
    res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}