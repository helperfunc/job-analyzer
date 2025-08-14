import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { resource_id, job_id } = req.body

      if (!resource_id || !job_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: resource_id, job_id'
        })
      }

      // Update the resource to link it to the job
      const { data, error } = await supabase
        .from('job_resources')
        .update({ job_id })
        .eq('id', resource_id)
        .select(`
          *,
          jobs!job_resources_job_id_fkey (
            id,
            title,
            company
          )
        `)

      if (error) {
        console.error('Failed to link resource to job:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to link resource to job',
          details: error.message
        })
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
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
  } else if (req.method === 'DELETE') {
    try {
      const { resource_id } = req.body

      if (!resource_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: resource_id'
        })
      }

      // Remove the job link from the resource
      const { data, error } = await supabase
        .from('job_resources')
        .update({ job_id: null })
        .eq('id', resource_id)
        .select()

      if (error) {
        console.error('Failed to unlink resource from job:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to unlink resource from job',
          details: error.message
        })
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Resource unlinked from job successfully',
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
    res.setHeader('Allow', ['POST', 'DELETE'])
    res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}