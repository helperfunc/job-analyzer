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
      const { user_id, job_id } = req.query

      let query = supabase
        .from('job_resources')
        .select(`
          *,
          jobs!job_resources_job_id_fkey (
            id,
            title,
            company
          )
        `)
        .order('created_at', { ascending: false })

      if (user_id) {
        query = query.eq('user_id', user_id)
      }

      if (job_id) {
        query = query.eq('job_id', job_id)
      }

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
      const { user_id, job_id, title, url, resource_type, description } = req.body

      if (!user_id || !title || !resource_type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: user_id, title, resource_type'
        })
      }

      const { data, error } = await supabase
        .from('job_resources')
        .insert([{
          user_id,
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
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}