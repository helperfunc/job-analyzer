import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { job_id } = req.query
      const user = await getCurrentUser(req)
      const userId = user ? user.userId : 'default'

      let query = supabase
        .from('job_resources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Note: job_id filtering removed as we now use resource-job-relations table

      const { data, error } = await query

      if (error) {
        console.error('Failed to fetch job resources:', error)
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch job resources',
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
      const user = await getCurrentUser(req)
      const userId = user ? user.userId : 'default'
      const { job_id, title, url, resource_type, description } = req.body

      if (!title || !resource_type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, resource_type'
        })
      }

      const { data, error } = await supabase
        .from('job_resources')
        .insert([{
          user_id: userId,
          job_id: job_id || null,
          title,
          url: url || null,
          resource_type,
          description: description || null
        }])
        .select()

      if (error) {
        console.error('Failed to create job resource:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to create job resource',
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
      const { job_id, title, url, resource_type, description } = req.body

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
      if (description !== undefined) updateData.description = description

      const { data, error } = await supabase
        .from('job_resources')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

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
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}