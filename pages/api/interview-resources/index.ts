import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { job_id } = req.query

      let query = supabase
        .from('interview_resources')
        .select('*')
        .order('created_at', { ascending: false })

      // Note: job_id filtering removed as we now use resource-job-relations table

      const { data, error } = await query

      if (error) {
        console.error('Failed to fetch interview resources:', error)
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch interview resources',
          details: error.message 
        })
      }

      res.status(200).json({
        success: true,
        data: data || []
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      res.status(500).json({ 
        success: false, 
        error: 'Unexpected server error' 
      })
    }
  } else if (req.method === 'POST') {
    try {
      const { job_id, title, url, resource_type, content, tags } = req.body

      if (!job_id || !title || !resource_type || !content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: job_id, title, resource_type, content'
        })
      }

      const { data, error } = await supabase
        .from('interview_resources')
        .insert([{
          job_id,
          title,
          url: url || null,
          resource_type,
          content,
          tags: tags || []
        }])
        .select()

      if (error) {
        console.error('Failed to create interview resource:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to create interview resource',
          details: error.message
        })
      }

      res.status(201).json({
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
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query
      const { job_id, title, url, resource_type, content, tags } = req.body

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        })
      }

      const updateData: any = {}
      if (job_id !== undefined) updateData.job_id = job_id
      if (title !== undefined) updateData.title = title
      if (url !== undefined) updateData.url = url
      if (resource_type !== undefined) updateData.resource_type = resource_type
      if (content !== undefined) updateData.content = content
      if (tags !== undefined) updateData.tags = tags

      const { data, error } = await supabase
        .from('interview_resources')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

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
        data
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      res.status(500).json({
        success: false,
        error: 'Unexpected server error'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        })
      }

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
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}