import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { loadDemoBookmarks, saveDemoBookmarks } from '../../../lib/demoStorage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
      details: 'Please login to remove bookmarks'
    })
  }

  // Verify token and get user info
  let userId = 'demo-user'
  let decoded: any = null
  try {
    decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.userId || 'demo-user'
  } catch (error) {
    console.log('Token verification failed, using demo mode')
  }

  const { bookmark_type, job_id, paper_id, resource_id, thought_id, insight_id } = req.body

  // Get target ID based on type
  const targetId = job_id || paper_id || resource_id || thought_id || insight_id

  if (!bookmark_type || !targetId) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'bookmark_type and target ID are required'
    })
  }

  // Load current bookmarks
  let currentBookmarks = loadDemoBookmarks()
  
  // Remove the bookmark (handle multiple user ID formats)
  const originalLength = currentBookmarks.length
  currentBookmarks = currentBookmarks.filter(b => {
    // Check if this bookmark belongs to the user (handle different ID formats)
    const isUserMatch = b.user_id === userId || 
                       (decoded && b.user_id === decoded.userId) ||
                       (decoded && decoded.email && b.user_id === btoa(decoded.email).replace(/[^a-zA-Z0-9]/g, ''))
    
    if (!isUserMatch || b.bookmark_type !== bookmark_type) {
      return true
    }
    
    // Check specific ID field
    if (bookmark_type === 'job' && b.job_id === job_id) return false
    if (bookmark_type === 'paper' && b.paper_id === paper_id) return false
    if (bookmark_type === 'resource' && b.resource_id === resource_id) return false
    if (bookmark_type === 'thought' && b.thought_id === thought_id) return false
    if (bookmark_type === 'insight' && b.insight_id === insight_id) return false
    
    return true
  })

  if (currentBookmarks.length < originalLength) {
    saveDemoBookmarks(currentBookmarks)
    
    return res.status(200).json({
      success: true,
      message: 'Bookmark removed successfully (demo mode)'
    })
  } else {
    return res.status(404).json({ 
      error: 'Bookmark not found',
      details: 'This item is not in your bookmarks'
    })
  }
}