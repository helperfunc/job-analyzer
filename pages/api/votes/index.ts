import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, AuthenticatedRequest } from '../../../lib/auth'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

interface VoteRequest {
  target_type: 'job' | 'paper' | 'resource' | 'user_resource' | 'comment'
  job_id?: string
  paper_id?: string
  resource_id?: string
  user_resource_id?: string
  comment_id?: string
  vote_type: 1 | -1 // 1 for upvote, -1 for downvote
}

export default authenticateUser(async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
  const user = req.user!

  if (req.method === 'POST') {
    return await castVote(req, res, user.userId)
  } else if (req.method === 'DELETE') {
    return await removeVote(req, res, user.userId)
  } else if (req.method === 'GET') {
    return await getVoteStatus(req, res, user.userId)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
})

async function castVote(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
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
    
    const voteData: VoteRequest = req.body

    if (!voteData.target_type || !voteData.vote_type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'target_type and vote_type are required'
      })
    }

    if (!['job', 'paper', 'resource', 'user_resource', 'comment'].includes(voteData.target_type)) {
      return res.status(400).json({ 
        error: 'Invalid target_type',
        details: 'Must be one of: job, paper, resource, user_resource, comment'
      })
    }

    if (![1, -1].includes(voteData.vote_type)) {
      return res.status(400).json({ 
        error: 'Invalid vote_type',
        details: 'Must be 1 (upvote) or -1 (downvote)'
      })
    }

    // 验证目标资源存在
    let targetExists = false

    if (voteData.target_type === 'job' && voteData.job_id) {
      const { data } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', voteData.job_id)
        .single()
      targetExists = !!data
    } else if (voteData.target_type === 'paper' && voteData.paper_id) {
      const { data } = await supabase
        .from('research_papers')
        .select('id')
        .eq('id', voteData.paper_id)
        .single()
      targetExists = !!data
    } else if (voteData.target_type === 'user_resource' && voteData.user_resource_id) {
      const { data } = await supabase
        .from('user_resources')
        .select('id')
        .eq('id', voteData.user_resource_id)
        .eq('visibility', 'public')
        .single()
      targetExists = !!data
    } else if (voteData.target_type === 'comment' && voteData.comment_id) {
      const { data } = await supabase
        .from('comments')
        .select('id')
        .eq('id', voteData.comment_id)
        .eq('is_deleted', false)
        .single()
      targetExists = !!data
    } else if (voteData.target_type === 'resource' && voteData.resource_id) {
      // 检查job_resources或interview_resources
      const [jobRes, interviewRes] = await Promise.all([
        supabase.from('job_resources').select('id').eq('id', voteData.resource_id).single(),
        supabase.from('interview_resources').select('id').eq('id', voteData.resource_id).single()
      ])
      targetExists = !!(jobRes.data || interviewRes.data)
    }

    if (!targetExists) {
      return res.status(404).json({ 
        error: 'Target resource not found or not accessible'
      })
    }

    // 检查是否已经投过票
    let existingVoteQuery = supabase
      .from('votes')
      .select('id, vote_type')
      .eq('user_id', userId)
      .eq('target_type', voteData.target_type)

    if (voteData.job_id) existingVoteQuery = existingVoteQuery.eq('job_id', voteData.job_id)
    if (voteData.paper_id) existingVoteQuery = existingVoteQuery.eq('paper_id', voteData.paper_id)
    if (voteData.resource_id) existingVoteQuery = existingVoteQuery.eq('resource_id', voteData.resource_id)
    if (voteData.user_resource_id) existingVoteQuery = existingVoteQuery.eq('user_resource_id', voteData.user_resource_id)
    if (voteData.comment_id) existingVoteQuery = existingVoteQuery.eq('comment_id', voteData.comment_id)

    const { data: existingVote } = await existingVoteQuery.single()

    if (existingVote) {
      if (existingVote.vote_type === voteData.vote_type) {
        return res.status(409).json({ 
          error: 'Already voted',
          details: 'You have already cast this vote'
        })
      } else {
        // 更新现有投票
        const { data: vote, error } = await supabase
          .from('votes')
          .update({
            vote_type: voteData.vote_type
          })
          .eq('id', existingVote.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating vote:', error)
          return res.status(500).json({ 
            error: 'Failed to update vote',
            details: error.message 
          })
        }

        return res.status(200).json({
          success: true,
          message: 'Vote updated successfully',
          vote,
          action: 'updated'
        })
      }
    }

    // 创建新投票
    const { data: vote, error } = await supabase
      .from('votes')
      .insert([{
        user_id: userId,
        target_type: voteData.target_type,
        job_id: voteData.job_id,
        paper_id: voteData.paper_id,
        resource_id: voteData.resource_id,
        user_resource_id: voteData.user_resource_id,
        comment_id: voteData.comment_id,
        vote_type: voteData.vote_type
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating vote:', error)
      return res.status(500).json({ 
        error: 'Failed to create vote',
        details: error.message 
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      vote,
      action: 'created'
    })

  } catch (error) {
    console.error('Cast vote error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function removeVote(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { 
      target_type,
      job_id,
      paper_id,
      resource_id,
      user_resource_id,
      comment_id
    } = req.query

    if (!target_type || typeof target_type !== 'string') {
      return res.status(400).json({ 
        error: 'target_type is required'
      })
    }

    let deleteQuery = supabase
      .from('votes')
      .delete()
      .eq('user_id', userId)
      .eq('target_type', target_type)

    if (job_id) deleteQuery = deleteQuery.eq('job_id', job_id)
    if (paper_id) deleteQuery = deleteQuery.eq('paper_id', paper_id)
    if (resource_id) deleteQuery = deleteQuery.eq('resource_id', resource_id)
    if (user_resource_id) deleteQuery = deleteQuery.eq('user_resource_id', user_resource_id)
    if (comment_id) deleteQuery = deleteQuery.eq('comment_id', comment_id)

    const { error } = await deleteQuery

    if (error) {
      console.error('Error removing vote:', error)
      return res.status(500).json({ 
        error: 'Failed to remove vote',
        details: error.message 
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Vote removed successfully'
    })

  } catch (error) {
    console.error('Remove vote error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function getVoteStatus(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { 
      target_type,
      job_id,
      paper_id,
      resource_id,
      user_resource_id,
      comment_id
    } = req.query

    if (!target_type || typeof target_type !== 'string') {
      return res.status(400).json({ 
        error: 'target_type is required'
      })
    }

    let voteQuery = supabase
      .from('votes')
      .select('vote_type')
      .eq('user_id', userId)
      .eq('target_type', target_type)

    if (job_id) voteQuery = voteQuery.eq('job_id', job_id)
    if (paper_id) voteQuery = voteQuery.eq('paper_id', paper_id)
    if (resource_id) voteQuery = voteQuery.eq('resource_id', resource_id)
    if (user_resource_id) voteQuery = voteQuery.eq('user_resource_id', user_resource_id)
    if (comment_id) voteQuery = voteQuery.eq('comment_id', comment_id)

    const { data: vote } = await voteQuery.single()

    // 获取总投票统计
    let statsQuery = supabase
      .from('votes')
      .select('vote_type')
      .eq('target_type', target_type)

    if (job_id) statsQuery = statsQuery.eq('job_id', job_id)
    if (paper_id) statsQuery = statsQuery.eq('paper_id', paper_id)
    if (resource_id) statsQuery = statsQuery.eq('resource_id', resource_id)
    if (user_resource_id) statsQuery = statsQuery.eq('user_resource_id', user_resource_id)
    if (comment_id) statsQuery = statsQuery.eq('comment_id', comment_id)

    const { data: allVotes } = await statsQuery

    const upvotes = allVotes?.filter(v => v.vote_type === 1).length || 0
    const downvotes = allVotes?.filter(v => v.vote_type === -1).length || 0

    return res.status(200).json({
      success: true,
      userVote: vote?.vote_type || null,
      stats: {
        upvotes,
        downvotes,
        total: upvotes + downvotes,
        score: upvotes - downvotes
      }
    })

  } catch (error) {
    console.error('Get vote status error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}