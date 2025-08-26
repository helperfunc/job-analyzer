import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
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

  let userId = 'demo-user'
  let username = 'Demo User'
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      userId = decoded.userId || 'demo-user'
      username = decoded.email?.split('@')[0] || decoded.username || 'Demo User'
    } catch (error) {
      console.log('Token verification failed, using demo mode')
    }
  }

  if (req.method === 'GET') {
    try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
      if (!supabase) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured'
        })
      }

      // Fetch projects from database
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Add permissions for each project
      const projectsWithPermissions = (projects || []).map(p => ({
        ...p,
        canEdit: p.user_id === userId,
        canDelete: p.user_id === userId
      }))

      return res.status(200).json({
        success: true,
        data: projectsWithPermissions
      })

    } catch (error) {
      console.error('Error fetching projects:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch projects'
      })
    }
  } else if (req.method === 'POST') {
    try {
      const { 
        title, 
        description, 
        status, 
        priority, 
        category, 
        target_date, 
        tags, 
        notes, 
        is_public,
        progress 
      } = req.body

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        })
      }

      if (!supabase) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured'
        })
      }

      // Insert into database
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert([{
          title,
          description: description || '',
          status: status || 'planning',
          priority: priority || 'medium',
          category: category || 'job_search',
          target_date: target_date || null,
          progress: progress || 0,
          tags: tags || [],
          linked_jobs: [],
          linked_papers: [],
          linked_resources: [],
          notes: notes || '',
          is_public: is_public || false,
          user_id: userId
        }])
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({
        success: true,
        data: newProject
      })

    } catch (error) {
      console.error('Error creating project:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create project'
      })
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}