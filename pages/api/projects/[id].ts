import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Reference to global projects array
declare global {
  var demoProjects: any[]
}

// Initialize if not exists
if (!global.demoProjects) {
  global.demoProjects = []
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Project ID is required'
    })
  }

  // Get user info from token
  let token = req.cookies.token
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  let userId = 'demo-user'
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      userId = decoded.userId || 'demo-user'
    } catch (error) {
      console.log('Token verification failed, using demo mode')
    }
  }

  if (req.method === 'GET') {
    try {
      const project = global.demoProjects.find(p => p.id === id)
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          ...project,
          canEdit: project.user_id === userId,
          canDelete: project.user_id === userId
        }
      })

    } catch (error) {
      console.error('Error fetching project:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project'
      })
    }
  } else if (req.method === 'PUT') {
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
        progress,
        linked_jobs,
        linked_papers,
        linked_resources
      } = req.body

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        })
      }

      // Find and update the project
      const projectIndex = global.demoProjects.findIndex(p => p.id === id)
      
      if (projectIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      const project = global.demoProjects[projectIndex]

      // Check if user owns this project
      if (project.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only edit your own projects'
        })
      }

      // Update the project
      const updatedProject = {
        ...project,
        title,
        description: description || '',
        status: status || project.status,
        priority: priority || project.priority,
        category: category || project.category,
        target_date: target_date !== undefined ? target_date : project.target_date,
        progress: progress !== undefined ? progress : project.progress,
        tags: tags || project.tags,
        linked_jobs: linked_jobs !== undefined ? linked_jobs : project.linked_jobs,
        linked_papers: linked_papers !== undefined ? linked_papers : project.linked_papers,
        linked_resources: linked_resources !== undefined ? linked_resources : project.linked_resources,
        notes: notes !== undefined ? notes : project.notes,
        is_public: is_public !== undefined ? is_public : project.is_public,
        updated_at: new Date().toISOString()
      }

      global.demoProjects[projectIndex] = updatedProject

      return res.status(200).json({
        success: true,
        data: updatedProject
      })

    } catch (error) {
      console.error('Error updating project:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update project'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Find the project
      const projectIndex = global.demoProjects.findIndex(p => p.id === id)
      
      if (projectIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      const project = global.demoProjects[projectIndex]

      // Check if user owns this project
      if (project.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own projects'
        })
      }

      // Remove the project
      global.demoProjects.splice(projectIndex, 1)

      return res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting project:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete project'
      })
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}