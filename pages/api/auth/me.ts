import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, AuthenticatedRequest } from '../../../lib/auth'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default authenticateUser(async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
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
    
    const user = req.user!

    // 获取用户完整信息
    const { data: userInfo, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        display_name,
        avatar_url,
        bio,
        is_active,
        is_verified,
        is_admin,
        preferred_location,
        preferred_companies,
        skills,
        interests,
        created_at,
        last_login_at
      `)
      .eq('id', user.userId)
      .single()

    if (error || !userInfo) {
      return res.status(404).json({ 
        error: 'User not found',
        details: error?.message 
      })
    }

    // 获取用户统计信息
    const [bookmarksResult, commentsResult, resourcesResult] = await Promise.all([
      supabase
        .from('user_bookmarks')
        .select('id')
        .eq('user_id', user.userId),
      supabase
        .from('comments')
        .select('id')
        .eq('user_id', user.userId),
      supabase
        .from('user_resources')
        .select('id, visibility')
        .eq('user_id', user.userId)
    ])

    const stats = {
      bookmarks: bookmarksResult.data?.length || 0,
      comments: commentsResult.data?.length || 0,
      resources: resourcesResult.data?.length || 0,
      publicResources: resourcesResult.data?.filter(r => r.visibility === 'public').length || 0
    }

    return res.status(200).json({
      success: true,
      user: {
        ...userInfo,
        stats
      }
    })

  } catch (error) {
    console.error('Get user info error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})