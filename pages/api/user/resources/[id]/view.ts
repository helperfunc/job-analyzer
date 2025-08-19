import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Resource ID is required' })
  }

  try {
    // 增加浏览量
    const { data: resource, error } = await supabase
      .from('user_resources')
      .update({
        view_count: supabase.sql`view_count + 1`
      })
      .eq('id', id)
      .eq('visibility', 'public') // 只能查看公开资源
      .select('id, title, view_count')
      .single()

    if (error) {
      console.error('Error updating view count:', error)
      return res.status(500).json({ 
        error: 'Failed to update view count',
        details: error.message 
      })
    }

    if (!resource) {
      return res.status(404).json({ 
        error: 'Resource not found or not public'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'View count updated',
      resource
    })

  } catch (error) {
    console.error('View count error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}