import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// This would be in the main file in production
declare global {
  var demoThoughts: any[]
}

// Initialize if not exists
if (!global.demoThoughts) {
  global.demoThoughts = []
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Thought ID is required'
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

  if (req.method === 'PUT') {
    try {
      const { thought_type, content, rating, is_helpful } = req.body

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        })
      }

      // Find and update the thought
      const thoughtIndex = global.demoThoughts.findIndex(t => t.id === id)
      
      if (thoughtIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Thought not found'
        })
      }

      const thought = global.demoThoughts[thoughtIndex]

      // Check if user owns this thought
      if (thought.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only edit your own thoughts'
        })
      }

      // Update the thought
      const updatedThought = {
        ...thought,
        thought_type: thought_type || thought.thought_type,
        content,
        rating: rating !== undefined ? rating : thought.rating,
        is_helpful: is_helpful !== undefined ? is_helpful : thought.is_helpful,
        updated_at: new Date().toISOString()
      }

      global.demoThoughts[thoughtIndex] = updatedThought

      return res.status(200).json({
        success: true,
        data: updatedThought
      })

    } catch (error) {
      console.error('Error updating resource thought:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update thought'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Find the thought
      const thoughtIndex = global.demoThoughts.findIndex(t => t.id === id)
      
      if (thoughtIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Thought not found'
        })
      }

      const thought = global.demoThoughts[thoughtIndex]

      // Check if user owns this thought
      if (thought.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own thoughts'
        })
      }

      // Remove the thought
      global.demoThoughts.splice(thoughtIndex, 1)

      return res.status(200).json({
        success: true,
        message: 'Thought deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting resource thought:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete thought'
      })
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}