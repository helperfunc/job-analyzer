import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { loadDemoVotes, saveDemoVotes } from '../../../lib/demoStorage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

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
      details: 'Please login to vote'
    })
  }

  // Verify token and get user info
  let userId = 'demo-user'
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.userId || 'demo-user'
  } catch (error) {
    console.log('Token verification failed, using demo mode')
  }

  if (req.method === 'GET') {
    // Get vote status
    const { target_type, job_id, paper_id, resource_id, thought_id, insight_id } = req.query
    
    const targetId = job_id || paper_id || resource_id || thought_id || insight_id
    
    if (!target_type || !targetId) {
      return res.status(400).json({ error: 'Missing target_type and target ID' })
    }

    // Load current votes
    const currentVotes = loadDemoVotes()
    
    // Find user's vote for this item
    const userVote = currentVotes.find(v => 
      v.user_id === userId &&
      v.target_type === target_type &&
      v[`${target_type}_id`] === targetId
    )

    // Calculate stats (mock data)
    const itemVotes = currentVotes.filter(v => 
      v.target_type === target_type &&
      v[`${target_type}_id`] === targetId
    )
    
    const upvotes = itemVotes.filter(v => v.vote_type === 1).length
    const downvotes = itemVotes.filter(v => v.vote_type === -1).length

    return res.status(200).json({
      success: true,
      userVote: userVote ? userVote.vote_type : null,
      stats: {
        upvotes,
        downvotes,
        total: upvotes + downvotes,
        score: upvotes - downvotes
      }
    })

  } else if (req.method === 'POST') {
    // Add or update vote
    const voteData = req.body
    
    if (!voteData.target_type || !voteData.vote_type) {
      return res.status(400).json({ error: 'Missing target_type or vote_type' })
    }

    const targetId = voteData.job_id || voteData.paper_id || voteData.resource_id || voteData.thought_id || voteData.insight_id
    if (!targetId) {
      return res.status(400).json({ error: 'Missing target ID' })
    }

    // Load current votes
    let currentVotes = loadDemoVotes()
    
    // Remove existing vote if any
    currentVotes = currentVotes.filter(v => !(
      v.user_id === userId &&
      v.target_type === voteData.target_type &&
      v[`${voteData.target_type}_id`] === targetId
    ))

    // Add new vote
    const newVote = {
      id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      target_type: voteData.target_type,
      [`${voteData.target_type}_id`]: targetId,
      vote_type: voteData.vote_type,
      created_at: new Date().toISOString()
    }

    currentVotes.push(newVote)
    saveDemoVotes(currentVotes)

    return res.status(201).json({
      success: true,
      message: 'Vote recorded successfully (demo mode)',
      vote: newVote
    })

  } else if (req.method === 'DELETE') {
    // Remove vote
    const { target_type, job_id, paper_id, resource_id, thought_id, insight_id } = req.query
    const targetId = job_id || paper_id || resource_id || thought_id || insight_id

    if (!target_type || !targetId) {
      return res.status(400).json({ error: 'Missing target_type and target ID' })
    }

    // Remove user's vote
    let currentVotes = loadDemoVotes()
    const originalLength = currentVotes.length
    currentVotes = currentVotes.filter(v => !(
      v.user_id === userId &&
      v.target_type === target_type &&
      v[`${target_type}_id`] === targetId
    ))

    if (currentVotes.length < originalLength) {
      saveDemoVotes(currentVotes)
      return res.status(200).json({
        success: true,
        message: 'Vote removed successfully (demo mode)'
      })
    } else {
      return res.status(404).json({ error: 'Vote not found' })
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}