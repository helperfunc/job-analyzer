import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import { optionalAuth, AuthenticatedRequest } from '../../../lib/auth'

// Empty mock data fallback
const mockPapers: any[] = []

export default optionalAuth(async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  // Check if Supabase is configured
  if (!isSupabaseAvailable()) {
    // Return mock data when database is not configured
    const { company } = req.query
    let filteredPapers = mockPapers
    
    if (company) {
      filteredPapers = mockPapers.filter(p => p.company.toLowerCase() === company.toString().toLowerCase())
    }
    
    return res.status(200).json({
      success: true,
      data: filteredPapers,
      total: filteredPapers.length,
      message: 'Using mock data (database not configured)'
    })
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
    
      const { company, limit = 100, offset = 0 } = req.query

      // Get total count first
      let countQuery = supabase
        .from('research_papers')
        .select('*', { count: 'exact', head: true })

      if (company) {
        countQuery = countQuery.eq('company', company)
      }

      // Skip user_id filtering for now to avoid errors
      const skipUserFilter = true

      const { count, error: countError } = await countQuery
      if (countError) {
        console.error('Count query error:', countError)
        console.error('Count query details:', JSON.stringify(countError, null, 2))
        // Return mock response if count fails
        return res.status(200).json({
          success: true,
          data: [],
          total: 0,
          isAuthenticated: !!req.user,
          userInfo: req.user ? {
            userId: req.user.userId,
            username: req.user.username
          } : null,
          message: 'Database query issue, returning empty result'
        })
      }

      // Get the actual data with limit and offset
      let query = supabase
        .from('research_papers')
        .select('*')
        .range(Number(offset), Number(offset) + Number(limit) - 1)

      if (company) {
        query = query.eq('company', company)
      }

      // Skip user filtering since the table might not have user_id column
      // Show all papers regardless of login status

      const { data, error } = await query

      if (error) {
        console.error('Data query error:', error)
        console.error('Data query details:', JSON.stringify(error, null, 2))
        // Return mock response if data query fails
        return res.status(200).json({
          success: true,
          data: [],
          total: 0,
          isAuthenticated: !!req.user,
          userInfo: req.user ? {
            userId: req.user.userId,
            username: req.user.username
          } : null,
          message: 'Database query issue, returning empty result'
        })
      }

      // 为每个论文添加用户互动数据（如果用户已登录）
      let papersWithInteractions = data || []
      
      if (req.user && data && data.length > 0) {
        // 获取用户对这些论文的收藏和投票状态
        const paperIds = data.map(paper => paper.id)
        
        // 获取收藏状态
        const { data: bookmarks } = await supabase
          .from('user_bookmarks')
          .select('paper_id')
          .eq('user_id', req.user.userId)
          .eq('bookmark_type', 'paper')
          .in('paper_id', paperIds)

        // 获取投票状态
        const { data: votes } = await supabase
          .from('votes')
          .select('paper_id, vote_type')
          .eq('user_id', req.user.userId)
          .eq('target_type', 'paper')
          .in('paper_id', paperIds)

        const bookmarkedPaperIds = new Set(bookmarks?.map(b => b.paper_id) || [])
        const userVotes = new Map(votes?.map(v => [v.paper_id, v.vote_type]) || [])

        papersWithInteractions = data.map(paper => ({
          ...paper,
          isBookmarked: bookmarkedPaperIds.has(paper.id),
          userVote: userVotes.get(paper.id) || null
        }))
      }

      res.status(200).json({
        success: true,
        data: papersWithInteractions,
        total: count || 0,
        isAuthenticated: !!req.user,
        userInfo: req.user ? {
          userId: req.user.userId,
          username: req.user.username
        } : null
      })
    } catch (error) {
      console.error('Error fetching papers:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch papers'
      })
    }
  } else if (req.method === 'POST') {
    if (!isSupabaseAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      })
    }
    
    try {
      const { title, authors, publication_date, abstract, url, arxiv_id, github_url, company, tags } = req.body

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        })
      }

      const { data, error } = await supabase
        .from('research_papers')
        .insert([{
          title,
          authors: authors || [],
          publication_date,
          abstract,
          url,
          arxiv_id,
          github_url,
          company,
          tags: tags || [],
          user_id: req.user?.userId || null // 如果用户已登录则记录用户ID，否则为系统创建
        }])
        .select()
        .single()

      if (error) throw error

      res.status(201).json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error creating paper:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create paper'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Paper ID is required'
        })
      }

      if (!isSupabaseAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured'
        })
      }

      const { error } = await supabase
        .from('research_papers')
        .delete()
        .eq('id', id)

      if (error) throw error

      res.status(200).json({
        success: true,
        message: 'Paper deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting paper:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete paper'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
})