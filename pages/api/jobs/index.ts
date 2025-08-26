import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import { optionalAuth, AuthenticatedRequest } from '../../../lib/auth'

export default optionalAuth(async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
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
    
    // Check if Supabase is configured
    if (!supabase) {
      // Return mock data if no database
      return res.status(200).json({
        success: true,
        jobs: [],
        message: 'No database configured'
      })
    }

    // 尝试获取jobs，如果user_id列不存在会报错
    let jobs: any[] = []
    let error: any = null

    try {
      // 先尝试使用user_id过滤
      if (!req.user) {
        // 单机版模式：尝试只显示无用户ID的工作
        const result = await supabase
          .from('jobs')
          .select('*')
          .is('user_id', null)
        
        jobs = result.data || []
        error = result.error
      } else {
        // 用户已登录，显示所有工作
        const result = await supabase
          .from('jobs')
          .select('*')
        
        jobs = result.data || []
        error = result.error
      }

      // 如果出现列不存在的错误，则不使用user_id过滤
      if (error && error.code === '42703') {
        const fallbackResult = await supabase
          .from('jobs')
          .select('*')
        
        jobs = fallbackResult.data || []
        error = fallbackResult.error
      }
    } catch (e) {
      // 如果出现任何错误，尝试简单查询
      const fallbackResult = await supabase
        .from('jobs')
        .select('*')
      
      jobs = fallbackResult.data || []
      error = fallbackResult.error
    }

    if (error) {
      // If jobs table doesn't exist, return empty array
      if (error.code === '42P01') {
        return res.status(200).json({
          success: true,
          jobs: [],
          message: 'Jobs table not found'
        })
      }
      throw error
    }

    // 为每个工作添加用户互动数据（如果用户已登录）
    let jobsWithInteractions = jobs || []
    
    if (req.user && jobs && jobs.length > 0) {
      // 获取用户对这些工作的收藏和投票状态
      const jobIds = jobs.map(job => job.id)
      
      // 获取收藏状态
      const { data: bookmarks } = await supabase
        .from('user_bookmarks')
        .select('job_id')
        .eq('user_id', req.user.userId)
        .eq('bookmark_type', 'job')
        .in('job_id', jobIds)

      // 获取投票状态
      const { data: votes } = await supabase
        .from('votes')
        .select('job_id, vote_type')
        .eq('user_id', req.user.userId)
        .eq('target_type', 'job')
        .in('job_id', jobIds)

      const bookmarkedJobIds = new Set(bookmarks?.map(b => b.job_id) || [])
      const userVotes = new Map(votes?.map(v => [v.job_id, v.vote_type]) || [])

      jobsWithInteractions = jobs.map(job => ({
        ...job,
        isBookmarked: bookmarkedJobIds.has(job.id),
        userVote: userVotes.get(job.id) || null
      }))
    }

    res.status(200).json({
      success: true,
      jobs: jobsWithInteractions,
      isAuthenticated: !!req.user,
      userInfo: req.user ? {
        userId: req.user.userId,
        username: req.user.username
      } : null
    })

  } catch (error) {
    console.error('Error fetching jobs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})