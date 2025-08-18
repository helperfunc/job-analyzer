import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Resource-job relations API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { job_id, resource_type } = req.query

  if (!job_id || typeof job_id !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' })
  }

  try {
    // Get job resources with their relations
    const { data: jobResourceRelations, error: jobError } = await supabase
      .from('job_resource_relations')
      .select(`
        id,
        job_id,
        resource_id,
        created_at,
        job_resources!inner (
          id,
          title,
          url,
          resource_type,
          description,
          user_id,
          created_at
        )
      `)
      .eq('job_id', job_id)

    // Get interview resources with their relations
    const { data: interviewResourceRelations, error: interviewError } = await supabase
      .from('interview_resource_relations')
      .select(`
        id,
        job_id,
        resource_id,
        created_at,
        interview_resources!inner (
          id,
          title,
          url,
          resource_type,
          content,
          tags,
          created_at
        )
      `)
      .eq('job_id', job_id)

    if (jobError) console.error('Job resources error:', jobError)
    if (interviewError) console.error('Interview resources error:', interviewError)

    // Combine and format results
    const jobResources = (jobResourceRelations || []).map(rel => ({
      ...rel.job_resources,
      source: 'job_resources',
      relation_id: rel.id
    }))

    const interviewResources = (interviewResourceRelations || []).map(rel => ({
      ...rel.interview_resources,
      source: 'interview_resources',
      relation_id: rel.id
    }))

    const allResources = [...jobResources, ...interviewResources]

    return res.status(200).json({
      success: true,
      data: allResources
    })
  } catch (error) {
    console.error('Error fetching resource relations:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch resource relations',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { job_id, resource_id, resource_type } = req.body

  if (!job_id || !resource_id || !resource_type) {
    return res.status(400).json({
      error: 'Missing required fields: job_id, resource_id, resource_type'
    })
  }

  try {
    let data, error

    if (resource_type === 'job_resources') {
      ({ data, error } = await supabase
        .from('job_resource_relations')
        .insert([{ job_id, resource_id }])
        .select()
        .single())
    } else if (resource_type === 'interview_resources') {
      ({ data, error } = await supabase
        .from('interview_resource_relations')
        .insert([{ job_id, resource_id }])
        .select()
        .single())
    } else {
      return res.status(400).json({ error: 'Invalid resource_type' })
    }

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          error: 'Resource is already linked to this job'
        })
      }
      throw error
    }

    return res.status(201).json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error creating resource relation:', error)
    return res.status(500).json({
      error: 'Failed to create resource relation',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { job_id, resource_id, resource_type } = req.query

  if (!job_id || !resource_id || !resource_type) {
    return res.status(400).json({
      error: 'Missing required fields: job_id, resource_id, resource_type'
    })
  }

  try {
    let error

    if (resource_type === 'job_resources') {
      ({ error } = await supabase
        .from('job_resource_relations')
        .delete()
        .match({ job_id, resource_id }))
    } else if (resource_type === 'interview_resources') {
      ({ error } = await supabase
        .from('interview_resource_relations')
        .delete()
        .match({ job_id, resource_id }))
    } else {
      return res.status(400).json({ error: 'Invalid resource_type' })
    }

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      message: 'Resource relation deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting resource relation:', error)
    return res.status(500).json({
      error: 'Failed to delete resource relation',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}