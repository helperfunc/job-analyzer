import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import { getUserUUID } from '../../../lib/auth-helpers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get current user - similar to me-simple API
    let token = req.cookies.token
    
    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - No token found'
      })
    }

    // Decode token without full verification for now
    let textUserId = 'default'
    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.decode(token) as any
      textUserId = decoded?.userId || 'default'
      console.log('Decoded userId from token:', textUserId)
    } catch (error) {
      console.error('Failed to decode token:', error)
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      })
    }

    // Convert to UUID
    const userId = await getUserUUID(textUserId)

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      })
    }

    // Fetch user's job thoughts
    const { data: jobThoughts, error: jobThoughtsError } = await supabase
      .from('job_thoughts')
      .select(`
        id,
        content,
        thought_type,
        rating,
        created_at,
        job_id,
        jobs (
          id,
          title,
          company
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch user's paper insights
    const { data: paperInsights, error: paperInsightsError } = await supabase
      .from('paper_insights')
      .select(`
        id,
        insight,
        insight_type,
        rating,
        created_at,
        paper_id,
        research_papers (
          id,
          title,
          company
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch user's resource thoughts
    const { data: resourceThoughts, error: resourceThoughtsError } = await supabase
      .from('resource_thoughts')
      .select(`
        id,
        content,
        rating,
        thought_type,
        created_at,
        resource_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Log for debugging
    console.log('Activity API - User:', userId)
    console.log('Job thoughts count:', jobThoughts?.length || 0)
    console.log('Paper insights count:', paperInsights?.length || 0)
    console.log('Resource thoughts count:', resourceThoughts?.length || 0)

    // Combine all activities
    const activities = []

    // Add job thoughts
    if (jobThoughtsError) {
      console.error('Error fetching job thoughts:', jobThoughtsError)
    }
    if (jobThoughts && !jobThoughtsError) {
      console.log('Job thoughts sample:', jobThoughts[0])
      jobThoughts.forEach(thought => {
        activities.push({
          id: thought.id,
          type: 'job_thought',
          content: thought.content,
          rating: thought.rating,
          created_at: thought.created_at,
          target: {
            type: 'job',
            id: thought.job_id,
            title: thought.jobs?.title || 'Unknown Job',
            company: thought.jobs?.company || ''
          }
        })
      })
    }

    // Add paper insights
    if (paperInsights && !paperInsightsError) {
      paperInsights.forEach(insight => {
        activities.push({
          id: insight.id,
          type: 'paper_insight',
          content: insight.insight,
          rating: insight.rating,
          created_at: insight.created_at,
          target: {
            type: 'paper',
            id: insight.paper_id,
            title: insight.research_papers?.title || 'Unknown Paper',
            company: insight.research_papers?.company || ''
          }
        })
      })
    }

    // Add resource thoughts if they exist
    if (resourceThoughts && !resourceThoughtsError) {
      resourceThoughts.forEach(thought => {
        activities.push({
          id: thought.id,
          type: 'resource_thought',
          content: thought.content,
          rating: thought.rating,
          created_at: thought.created_at,
          target: {
            type: 'resource',
            id: thought.resource_id,
            title: 'Resource'  // We'll need to fetch resource details separately
          }
        })
      })
    }

    // Sort by created_at
    activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    console.log('Total activities found:', activities.length)
    console.log('Sample activity:', activities[0])

    return res.status(200).json({
      success: true,
      activities: activities.slice(0, 50), // Limit to 50 most recent
      total: activities.length
    })

  } catch (error) {
    console.error('Error fetching user activity:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch activity'
    })
  }
}