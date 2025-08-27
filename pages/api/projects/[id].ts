import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

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
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
      if (!isSupabaseAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured'
        })
      }

      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error || !project) {
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

      if (!isSupabaseAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured'
        })
      }

      const supabase = getSupabase()

      // Check if project exists and user owns it
      const { data: existingProject } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', id)
        .single()
      
      if (!existingProject) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      // Check if user owns this project
      if (existingProject.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only edit your own projects'
        })
      }

      // Update the project
      const updateData: any = { title }
      if (description !== undefined) updateData.description = description
      if (status !== undefined) updateData.status = status
      if (priority !== undefined) updateData.priority = priority
      if (category !== undefined) updateData.category = category
      if (target_date !== undefined) updateData.target_date = target_date
      if (progress !== undefined) updateData.progress = progress
      if (tags !== undefined) updateData.tags = tags
      if (linked_jobs !== undefined) updateData.linked_jobs = linked_jobs
      if (linked_papers !== undefined) updateData.linked_papers = linked_papers
      if (linked_resources !== undefined) updateData.linked_resources = linked_resources
      if (notes !== undefined) updateData.notes = notes
      if (is_public !== undefined) updateData.is_public = is_public

      const { data: updatedProject, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

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
      if (!isSupabaseAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured'
        })
      }

      const supabase = getSupabase()

      // Check if project exists and user owns it
      const { data: existingProject } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', id)
        .single()
      
      if (!existingProject) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      // Check if user owns this project
      if (existingProject.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own projects'
        })
      }

      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error

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