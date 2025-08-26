import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/auth'
import { getUserUUID } from '../../../lib/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get current user
  const user = await getCurrentUser(req)
  const textUserId = user ? user.userId : 'default'
  const userId = await getUserUUID(textUserId)
  const username = user ? (user.username || user.email?.split('@')[0] || 'User') : 'Guest'

  if (!isSupabaseAvailable()) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured'
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
    
      const { resource_id } = req.query

      if (!resource_id) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        })
      }

      // Get thoughts from database
      const { data: thoughts, error } = await supabase
        .from('resource_thoughts')
        .select('*')
        .eq('resource_id', resource_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Add permissions for each thought
      const thoughtsWithPermissions = (thoughts || []).map(t => ({
        ...t,
        canEdit: t.user_id === userId,
        canDelete: t.user_id === userId
      }))

      return res.status(200).json({
        success: true,
        data: thoughtsWithPermissions
      })

    } catch (error) {
      console.error('Error fetching resource thoughts:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch thoughts'
      })
    }
  } else if (req.method === 'POST') {
    try {
      const { resource_id, thought_type, content, rating, is_helpful, visibility } = req.body

      if (!resource_id || !content) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID and content are required'
        })
      }

      const { data: newThought, error } = await supabase
        .from('resource_thoughts')
        .insert([{
          resource_id,
          user_id: userId,
          username,
          thought_type: thought_type || 'general',
          content,
          rating: rating || null,
          is_helpful: is_helpful !== false,
          visibility: visibility || 'public'
        }])
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({
        success: true,
        data: newThought
      })

    } catch (error) {
      console.error('Error creating resource thought:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create thought'
      })
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}