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
      details: 'Please login to bookmark items'
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

  const bookmarkData = req.body

  // Validate bookmark data
  if (!bookmarkData.bookmark_type) {
    return res.status(400).json({ 
      error: 'Missing bookmark type',
      details: 'bookmark_type is required'
    })
  }

  // Check required fields based on type
  if (bookmarkData.bookmark_type === 'job' && !bookmarkData.job_id) {
    return res.status(400).json({ error: 'job_id is required for job bookmarks' })
  }
  if (bookmarkData.bookmark_type === 'paper' && !bookmarkData.paper_id) {
    return res.status(400).json({ error: 'paper_id is required for paper bookmarks' })
  }
  if (bookmarkData.bookmark_type === 'resource' && !bookmarkData.resource_id) {
    return res.status(400).json({ error: 'resource_id is required for resource bookmarks' })
  }
  if (bookmarkData.bookmark_type === 'thought' && !bookmarkData.thought_id) {
    return res.status(400).json({ error: 'thought_id is required for thought bookmarks' })
  }
  if (bookmarkData.bookmark_type === 'insight' && !bookmarkData.insight_id) {
    return res.status(400).json({ error: 'insight_id is required for insight bookmarks' })
  }

  // Load current bookmarks
  const currentBookmarks = loadDemoBookmarks()
  
  // Check if already bookmarked (handle multiple user ID formats)
  const existingBookmark = currentBookmarks.find(b => {
    // Check multiple possible user ID formats
    const isUserMatch = b.user_id === userId || 
                       (decoded && b.user_id === decoded.userId) ||
                       (decoded && decoded.email && b.user_id === btoa(decoded.email).replace(/[^a-zA-Z0-9]/g, ''))
                       
    const isTypeMatch = b.bookmark_type === bookmarkData.bookmark_type
    
    const isItemMatch = (b.job_id && b.job_id === bookmarkData.job_id) ||
                       (b.paper_id && b.paper_id === bookmarkData.paper_id) ||
                       (b.resource_id && b.resource_id === bookmarkData.resource_id) ||
                       (b.thought_id && b.thought_id === bookmarkData.thought_id) ||
                       (b.insight_id && b.insight_id === bookmarkData.insight_id)
    
    return isUserMatch && isTypeMatch && isItemMatch
  })

  if (existingBookmark) {
    return res.status(409).json({ 
      error: 'Already bookmarked',
      details: 'This item is already in your bookmarks'
    })
  }

  // Create new bookmark
  const newBookmark = {
    id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    bookmark_type: bookmarkData.bookmark_type,
    job_id: bookmarkData.job_id || null,
    paper_id: bookmarkData.paper_id || null,
    resource_id: bookmarkData.resource_id || null,
    thought_id: bookmarkData.thought_id || null,
    insight_id: bookmarkData.insight_id || null,
    resource_type: bookmarkData.resource_type || null,
    created_at: new Date().toISOString()
  }

  // Add to demo storage
  currentBookmarks.push(newBookmark)
  saveDemoBookmarks(currentBookmarks)

  return res.status(201).json({
    success: true,
    message: 'Bookmark added successfully (demo mode)',
    bookmark: newBookmark
  })
}