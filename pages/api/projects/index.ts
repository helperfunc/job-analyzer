import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Use global variable to share data between endpoints
declare global {
  var demoProjects: any[]
}

// Initialize if not exists
if (!global.demoProjects) {
  global.demoProjects = []
}

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
      // For demo mode, return all projects (filter by user in production)
      const filteredProjects = global.demoProjects.map(p => ({
        ...p,
        canEdit: p.user_id === userId,
        canDelete: p.user_id === userId
      }))

      return res.status(200).json({
        success: true,
        data: filteredProjects
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

      const newProject = {
        id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: userId,
        username
      }

      global.demoProjects.push(newProject)

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