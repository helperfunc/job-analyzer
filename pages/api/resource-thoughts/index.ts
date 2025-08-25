import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Use global variable to share data between endpoints
declare global {
  var demoThoughts: any[]
}

// Initialize if not exists
if (!global.demoThoughts) {
  global.demoThoughts = []
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
      const { resource_id } = req.query

      if (!resource_id) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        })
      }

      // For demo mode, return filtered thoughts
      const filteredThoughts = global.demoThoughts
        .filter(t => t.resource_id === resource_id)
        .map(t => ({
          ...t,
          canEdit: t.user_id === userId,
          canDelete: t.user_id === userId
        }))

      return res.status(200).json({
        success: true,
        data: filteredThoughts
      })

    } catch (error) {
      console.error('Error fetching resource thoughts:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch thoughts'
      })
    }
  } else if (req.method === 'POST') {
    try {
      const { resource_id, thought_type, content, rating, is_helpful, visibility } = req.body

      if (!resource_id || !content) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID and content are required'
        })
      }

      const newThought = {
        id: `thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        resource_id,
        user_id: userId,
        username,
        thought_type: thought_type || 'general',
        content,
        rating: rating || null,
        is_helpful: is_helpful !== false,
        visibility: visibility || 'public',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      global.demoThoughts.push(newThought)

      return res.status(201).json({
        success: true,
        data: newThought
      })

    } catch (error) {
      console.error('Error creating resource thought:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create thought'
      })
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}