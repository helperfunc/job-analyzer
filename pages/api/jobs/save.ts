import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const job = req.body

    if (!job.id || !job.title || !job.company) {
      return res.status(400).json({
        error: 'Missing required fields: id, title, and company are required'
      })
    }

    // Check if job already exists
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', job.id)
      .single()

    if (existingJob) {
      // Update existing job
      const { data, error } = await supabase
        .from('jobs')
        .update({
          title: job.title,
          company: job.company,
          location: job.location,
          department: job.department,
          salary: job.salary,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          skills: job.skills || [],
          description: job.description,
          url: job.url || job.description_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating job:', error)
        return res.status(500).json({
          error: 'Failed to update job',
          details: error.message
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        data
      })
    } else {
      // Insert new job
      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          department: job.department,
          salary: job.salary,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          skills: job.skills || [],
          description: job.description,
          url: job.url || job.description_url
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating job:', error)
        return res.status(500).json({
          error: 'Failed to create job',
          details: error.message
        })
      }

      return res.status(201).json({
        success: true,
        message: 'Job saved successfully',
        data
      })
    }
  } catch (error) {
    console.error('Save job error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}