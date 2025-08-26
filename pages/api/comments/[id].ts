import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, AuthenticatedRequest } from '../../../lib/auth'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default authenticateUser(async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
  const user = req.user!
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Comment ID is required' })
  }

  if (req.method === 'PUT') {
    return await updateComment(req, res, user.userId, id)
  } else if (req.method === 'DELETE') {
    return await deleteComment(req, res, user.userId, id)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
})

async function updateComment(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string,
  commentId: string
) {
  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ 
        error: 'Content is required'
      })
    }

    if (content.trim().length < 1) {
      return res.status(400).json({ 
        error: 'Comment content cannot be empty'
      })
    }

    if (content.length > 5000) {
      return res.status(400).json({ 
        error: 'Comment content too long',
        details: 'Comment must be less than 5000 characters'
      })
    }

    // 验证用户拥有该评论
    const { data: existingComment, error: checkError } = await supabase
      .from('comments')
      .select('id, user_id, is_deleted')
      .eq('id', commentId)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingComment) {
      return res.status(404).json({ 
        error: 'Comment not found or access denied'
      })
    }

    if (existingComment.is_deleted) {
      return res.status(400).json({ 
        error: 'Cannot edit deleted comment'
      })
    }

    // 更新评论
    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', userId)
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
      console.error('Error updating comment:', error)
      return res.status(500).json({ 
        error: 'Failed to update comment',
        details: error.message 
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      comment
    })

  } catch (error) {
    console.error('Update comment error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function deleteComment(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string,
  commentId: string
) {
  try {
    // 验证用户拥有该评论
    const { data: existingComment, error: checkError } = await supabase
      .from('comments')
      .select('id, user_id, is_deleted')
      .eq('id', commentId)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingComment) {
      return res.status(404).json({ 
        error: 'Comment not found or access denied'
      })
    }

    if (existingComment.is_deleted) {
      return res.status(400).json({ 
        error: 'Comment already deleted'
      })
    }

    // 检查是否有子评论（回复）
    const { data: replies, error: repliesError } = await supabase
      .from('comments')
      .select('id')
      .eq('parent_comment_id', commentId)
      .eq('is_deleted', false)

    if (repliesError) {
      console.error('Error checking replies:', repliesError)
    }

    if (replies && replies.length > 0) {
      // 如果有回复，只标记为删除，不实际删除
      const { data: comment, error } = await supabase
        .from('comments')
        .update({
          content: '[This comment has been deleted]',
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId)
        .select('id')
        .single()

      if (error) {
        console.error('Error soft deleting comment:', error)
        return res.status(500).json({ 
          error: 'Failed to delete comment',
          details: error.message 
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
        soft_delete: true
      })
    } else {
      // 如果没有回复，完全删除
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting comment:', error)
        return res.status(500).json({ 
          error: 'Failed to delete comment',
          details: error.message 
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
        soft_delete: false
      })
    }

  } catch (error) {
    console.error('Delete comment error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}