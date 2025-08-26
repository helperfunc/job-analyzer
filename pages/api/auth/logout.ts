import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import { getCurrentUser } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
    
    const user = await getCurrentUser(req)
    
    // 获取当前token
    let token = req.cookies.token
    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    // 删除当前会话（如果存在token）
    if (token) {
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', token)
    }

    // 可选：删除用户的所有会话（全局登出）
    if (req.body.logoutAll && user) {
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.userId)
    }

    // 清除cookie
    res.setHeader('Set-Cookie', [
      'token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ])

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout error:', error)
    
    // 即使出错也要清除cookie
    res.setHeader('Set-Cookie', [
      'token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ])
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    })
  }
}