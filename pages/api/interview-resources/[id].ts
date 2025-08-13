import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

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
      const { error } = await supabase
        .from('interview_resources')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Failed to delete interview resource:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to delete interview resource',
          details: error.message
        })
      }

      res.status(200).json({
        success: true,
        message: 'Interview resource deleted successfully'
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
      const { title, url, resource_type, content, tags } = req.body

      const { data, error } = await supabase
        .from('interview_resources')
        .update({
          title,
          url: url || null,
          resource_type,
          content,
          tags: tags || []
        })
        .eq('id', id)
        .select()

      if (error) {
        console.error('Failed to update interview resource:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to update interview resource',
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