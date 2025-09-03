import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import { getUserUUID } from '../../../lib/auth-helpers'
import { loadDemoBookmarks, loadDemoVotes } from '../../../lib/demoStorage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
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

    // Verify token without checking database
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      const userId = decoded.userId || 'demo-user'
      
      // Get user's stats from shared storage
      const bookmarks = loadDemoBookmarks()
      const votes = loadDemoVotes()
      
      // Check bookmarks for multiple possible user ID formats to handle legacy data
      const userBookmarks = bookmarks.filter(b => {
        return b.user_id === userId || 
               b.user_id === decoded.userId ||
               (decoded.email && b.user_id === btoa(decoded.email).replace(/[^a-zA-Z0-9]/g, ''))
      })
      
      const userVotes = votes.filter(v => {
        return v.user_id === userId ||
               v.user_id === decoded.userId ||
               (decoded.email && v.user_id === btoa(decoded.email).replace(/[^a-zA-Z0-9]/g, ''))
      })
      
      // Calculate stats from database if available
      let stats = {
        bookmarks: userBookmarks.length,
        comments: 0,
        resources: 0,
        publicResources: 0
      }

      if (supabase) {
        try {
          // Get user UUID for database queries
          const userUuid = await getUserUUID(userId)
          
          // Get user resources count
          const { count: resourcesCount } = await supabase
            .from('user_resources')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userUuid)

          const { count: publicResourcesCount } = await supabase
            .from('user_resources')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userUuid)
            .eq('visibility', 'public')

          // Get comments count (job thoughts + paper insights + resource thoughts)
          const { count: jobThoughtsCount } = await supabase
            .from('job_thoughts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userUuid)

          const { count: paperInsightsCount } = await supabase
            .from('paper_insights')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userUuid)

          const { count: resourceThoughtsCount } = await supabase
            .from('resource_thoughts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userUuid)

          // Get bookmarks from database
          const { count: dbBookmarksCount } = await supabase
            .from('user_bookmarks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userUuid)

          stats = {
            bookmarks: dbBookmarksCount || userBookmarks.length,
            comments: (jobThoughtsCount || 0) + (paperInsightsCount || 0) + (resourceThoughtsCount || 0),
            resources: resourcesCount || 0,
            publicResources: publicResourcesCount || 0
          }
          
          console.log('User stats:', {
            userId,
            userUuid,
            jobThoughtsCount,
            paperInsightsCount,
            resourceThoughtsCount,
            totalComments: stats.comments
          })
        } catch (dbError) {
          console.error('Failed to fetch stats from database:', dbError)
          // Continue with file-based stats
        }
      }
      
      // Return user info from token with stats
      return res.status(200).json({
        success: true,
        user: {
          id: userId,
          username: decoded.username,
          email: decoded.email,
          displayName: decoded.displayName || decoded.username,
          isVerified: decoded.isVerified || true,
          stats
        }
      })
    } catch (jwtError) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: 'Please log in again'
      })
    }

  } catch (error) {
    console.error('Get user info error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}