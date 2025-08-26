import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import { getUserUUID } from '../../../lib/auth-helpers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get token from cookie or Authorization header
  let token = req.cookies.token
  
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      details: 'Please login to access your resources'
    })
  }

  // Verify token and get user info
  let textUserId = 'demo-user'
  let decoded: any = null
  try {
    decoded = jwt.verify(token, JWT_SECRET) as any
    textUserId = decoded.userId || 'demo-user'
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: 'Please log in again'
    })
  }

  // Convert text user ID to UUID
  const userId = await getUserUUID(textUserId)

  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured'
    })
  }

  if (req.method === 'GET') {
    try {
      // Get user-created resources from all resource tables
      const [
        { data: userResources, error: userResourcesError },
        { data: jobResources, error: jobResourcesError },
        { data: interviewResources, error: interviewResourcesError }
      ] = await Promise.all([
        supabase
          .from('user_resources')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('job_resources')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('interview_resources')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ])

      // Combine all resources
      const allResources = [
        ...(userResources || []).map(r => ({ ...r, source: 'user_resources' })),
        ...(jobResources || []).map(r => ({ 
          ...r, 
          source: 'job_resources',
          visibility: 'public', // job_resources don't have visibility field
          description: r.description || r.content
        })),
        ...(interviewResources || []).map(r => ({ 
          ...r, 
          source: 'interview_resources',
          visibility: 'public', // interview_resources don't have visibility field
          description: r.content
        }))
      ]

      return res.status(200).json({
        success: true,
        resources: allResources,
        total: allResources.length,
        userId: userId
      })

    } catch (error) {
      console.error('Error fetching user resources:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch resources'
      })
    }

  } else if (req.method === 'POST') {
    try {
      // Create new resource
      const { title, description, resource_type, url, tags, visibility, content } = req.body

      if (!title || !description) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'Title and description are required'
        })
      }

      const { data: newResource, error } = await supabase
        .from('user_resources')
        .insert([{
          user_id: userId,
          title: title.trim(),
          description: description.trim(),
          resource_type: resource_type || 'other',
          url: url?.trim() || null,
          tags: Array.isArray(tags) ? tags : [],
          visibility: visibility || 'public',
          content: content?.trim() || null
        }])
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({
        success: true,
        resource: newResource,
        message: 'Resource created successfully'
      })

    } catch (error) {
      console.error('Error creating resource:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create resource'
      })
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}