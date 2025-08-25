import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { loadDemoBookmarks } from '../../../lib/demoStorage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Mock bookmarks for demo mode - only used if no real bookmarks exist
const mockBookmarks = [
  {
    id: '1',
    bookmark_type: 'job',
    created_at: new Date().toISOString(),
    job: {
      id: '1',
      title: 'Senior Software Engineer',
      company: 'OpenAI',
      location: 'San Francisco, CA',
      salary: '$200,000 - $300,000',
      department: 'Engineering'
    }
  },
  {
    id: '2',
    bookmark_type: 'paper',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    paper: {
      id: '2',
      title: 'Attention Is All You Need',
      company: 'Google',
      authors: ['Vaswani', 'Shazeer', 'Parmar'],
      publication_date: '2017-06-12',
      tags: ['transformer', 'attention', 'nlp']
    }
  },
  {
    id: '3',
    bookmark_type: 'resource',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    resource: {
      id: '3',
      title: 'Machine Learning Interview Prep',
      resource_type: 'preparation',
      description: 'Comprehensive guide for ML interviews',
      tags: ['interview', 'machine-learning']
    }
  }
]

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
      details: 'No token provided'
    })
  }

  // Verify token and get user info
  let userId = 'demo-user'
  let decoded: any = null
  try {
    decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.userId || 'demo-user'
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: 'Please log in again'
    })
  }

  if (req.method === 'GET') {
    // Get real bookmarks first
    const allBookmarks = loadDemoBookmarks()
    
    // Filter bookmarks for current user (handle multiple user ID formats)
    const userBookmarks = allBookmarks.filter(b => {
      return b.user_id === userId || 
             (decoded && b.user_id === decoded.userId) ||
             (decoded && decoded.email && b.user_id === btoa(decoded.email).replace(/[^a-zA-Z0-9]/g, ''))
    })
    
    // If no real bookmarks for this user, return empty array (not mock data)
    const bookmarksToReturn = userBookmarks
    
    return res.status(200).json({
      success: true,
      bookmarks: bookmarksToReturn,
      total: bookmarksToReturn.length,
      userId: userId,
      allBookmarksCount: allBookmarks.length
    })
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}