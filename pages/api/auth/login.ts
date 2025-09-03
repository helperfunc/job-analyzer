import { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface LoginRequest {
  email: string
  password: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password }: LoginRequest = req.body

  // 验证输入
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Missing credentials',
      details: 'Email and password are required'
    })
  }

  try {
    // 检查数据库是否可用
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, email, password_hash, display_name, is_active, is_verified')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      })
    }

    // 检查用户是否被禁用
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Account disabled',
        details: 'Your account has been disabled. Please contact support.'
      })
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      })
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.is_verified
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // 清理过期会话
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString())

    // 创建新会话
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: user.id,
        session_token: token,
        expires_at: expiresAt.toISOString()
      }])

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      // 继续执行，因为用户认证成功
    }

    // 更新最后登录时间
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // 设置HTTP-only cookie
    const cookieOptions = [
      `token=${token}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      `Max-Age=${30 * 24 * 60 * 60}`, // 30天
      'Path=/'
    ].join('; ')

    res.setHeader('Set-Cookie', cookieOptions)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        isVerified: user.is_verified
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}