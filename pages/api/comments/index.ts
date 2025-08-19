import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, optionalAuth, AuthenticatedRequest } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'

interface CommentRequest {
  target_type: 'job' | 'paper' | 'resource' | 'user_resource'
  job_id?: string
  paper_id?: string
  resource_id?: string
  user_resource_id?: string
  content: string
  parent_comment_id?: string
}

// 使用optionalAuth允许未登录用户查看评论
export default optionalAuth(async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return await getComments(req, res)
  } else if (req.method === 'POST') {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    return await createComment(req, res, req.user.userId)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
})

async function getComments(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { 
      target_type,
      job_id,
      paper_id,
      resource_id,
      user_resource_id,
      limit = '20',
      offset = '0',
      parent_only = 'false'
    } = req.query

    if (!target_type || typeof target_type !== 'string') {
      return res.status(400).json({ 
        error: 'target_type is required',
        details: 'Must be one of: job, paper, resource, user_resource'
      })
    }

    let query = supabase
      .from('comments')
      .select(`
        id,
        content,
        upvotes,
        downvotes,
        is_edited,
        created_at,
        updated_at,
        parent_comment_id,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('target_type', target_type)
      .eq('is_deleted', false)

    // 根据target_type添加相应的过滤条件
    if (target_type === 'job' && job_id) {
      query = query.eq('job_id', job_id)
    } else if (target_type === 'paper' && paper_id) {
      query = query.eq('paper_id', paper_id)
    } else if (target_type === 'resource' && resource_id) {
      query = query.eq('resource_id', resource_id)
    } else if (target_type === 'user_resource' && user_resource_id) {
      query = query.eq('user_resource_id', user_resource_id)
    } else {
      return res.status(400).json({ 
        error: 'Missing target ID',
        details: 'Corresponding ID is required for the target_type'
      })
    }

    // 是否只获取顶级评论（非回复）
    if (parent_only === 'true') {
      query = query.is('parent_comment_id', null)
    }

    // 分页和排序
    const limitNum = parseInt(limit)
    const offsetNum = parseInt(offset)
    query = query
      .order('created_at', { ascending: true })
      .range(offsetNum, offsetNum + limitNum - 1)

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch comments',
        details: error.message 
      })
    }

    // 获取评论的回复（如果请求的是顶级评论）
    if (parent_only === 'true' && comments) {
      for (const comment of comments) {
        const { data: replies } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            upvotes,
            downvotes,
            is_edited,
            created_at,
            updated_at,
            users:user_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('parent_comment_id', comment.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true })

        comment.replies = replies || []
      }
    }

    return res.status(200).json({
      success: true,
      comments: comments || [],
      total: comments?.length || 0
    })

  } catch (error) {
    console.error('Get comments error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function createComment(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const commentData: CommentRequest = req.body

    if (!commentData.target_type || !commentData.content) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'target_type and content are required'
      })
    }

    if (!['job', 'paper', 'resource', 'user_resource'].includes(commentData.target_type)) {
      return res.status(400).json({ 
        error: 'Invalid target_type',
        details: 'Must be one of: job, paper, resource, user_resource'
      })
    }

    if (commentData.content.trim().length < 1) {
      return res.status(400).json({ 
        error: 'Comment content cannot be empty'
      })
    }

    if (commentData.content.length > 5000) {
      return res.status(400).json({ 
        error: 'Comment content too long',
        details: 'Comment must be less than 5000 characters'
      })
    }

    // 验证目标资源存在
    let targetExists = false

    if (commentData.target_type === 'job' && commentData.job_id) {
      const { data } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', commentData.job_id)
        .single()
      targetExists = !!data
    } else if (commentData.target_type === 'paper' && commentData.paper_id) {
      const { data } = await supabase
        .from('research_papers')
        .select('id')
        .eq('id', commentData.paper_id)
        .single()
      targetExists = !!data
    } else if (commentData.target_type === 'user_resource' && commentData.user_resource_id) {
      const { data } = await supabase
        .from('user_resources')
        .select('id')
        .eq('id', commentData.user_resource_id)
        .eq('visibility', 'public') // 只能对公开资源评论
        .single()
      targetExists = !!data
    } else if (commentData.target_type === 'resource' && commentData.resource_id) {
      // 检查job_resources或interview_resources
      const [jobRes, interviewRes] = await Promise.all([
        supabase.from('job_resources').select('id').eq('id', commentData.resource_id).single(),
        supabase.from('interview_resources').select('id').eq('id', commentData.resource_id).single()
      ])
      targetExists = !!(jobRes.data || interviewRes.data)
    }

    if (!targetExists) {
      return res.status(404).json({ 
        error: 'Target resource not found or not accessible'
      })
    }

    // 如果是回复，验证父评论存在
    if (commentData.parent_comment_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('id, target_type, job_id, paper_id, resource_id, user_resource_id')
        .eq('id', commentData.parent_comment_id)
        .eq('is_deleted', false)
        .single()

      if (!parentComment) {
        return res.status(404).json({ 
          error: 'Parent comment not found'
        })
      }

      // 验证回复的目标是否一致
      if (parentComment.target_type !== commentData.target_type ||
          parentComment.job_id !== commentData.job_id ||
          parentComment.paper_id !== commentData.paper_id ||
          parentComment.resource_id !== commentData.resource_id ||
          parentComment.user_resource_id !== commentData.user_resource_id) {
        return res.status(400).json({ 
          error: 'Reply target mismatch with parent comment'
        })
      }
    }

    // 创建评论
    const { data: comment, error } = await supabase
      .from('comments')
      .insert([{
        user_id: userId,
        target_type: commentData.target_type,
        job_id: commentData.job_id,
        paper_id: commentData.paper_id,
        resource_id: commentData.resource_id,
        user_resource_id: commentData.user_resource_id,
        content: commentData.content.trim(),
        parent_comment_id: commentData.parent_comment_id
      }])
      .select(`
        id,
        content,
        upvotes,
        downvotes,
        is_edited,
        created_at,
        updated_at,
        parent_comment_id,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return res.status(500).json({ 
        error: 'Failed to create comment',
        details: error.message 
      })
    }

    // TODO: 创建通知给目标资源的作者

    return res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      comment
    })

  } catch (error) {
    console.error('Create comment error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}