import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, AuthenticatedRequest } from '../../../../lib/auth'
import { getSupabase, isSupabaseAvailable } from '../../../../lib/supabase'

export default authenticateUser(async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
  const user = req.user!
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid bookmark ID' })
  }

  if (req.method === 'DELETE') {
    try {
      // If no database, return success
      if (!isSupabaseAvailable()) {
        return res.status(200).json({
          success: true,
          message: 'Bookmark removed (demo mode)'
        })
      }

      const supabase = getSupabase()
      const { error } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.userId)

      if (error) {
        console.error('Error removing bookmark:', error)
        return res.status(500).json({ 
          error: 'Failed to remove bookmark',
          details: error.message 
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Bookmark removed successfully'
      })

    } catch (error) {
      console.error('Remove bookmark error:', error)
      return res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
})