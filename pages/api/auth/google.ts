import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { supabase, isSupabaseAvailable } from '../../../lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface GoogleLoginRequest {
  email: string
  name: string
  googleId: string
  picture?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, name, googleId, picture }: GoogleLoginRequest = req.body

  if (!email || !name || !googleId) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'Email, name, and googleId are required'
    })
  }

  try {
    // In demo mode without database, create user directly from Google data
    if (!isSupabaseAvailable()) {
      // 使用固定的Google ID作为用户ID，确保同一用户每次登录都是一致的
      const userId = `google-${googleId}`
      const username = email.split('@')[0] // Use email prefix as username
      
      const token = jwt.sign({
        userId,
        username,
        email,
        displayName: name, // Use Google's display name
        isVerified: true,
        googleId: googleId, // 存储Google ID以便后续验证
        picture: picture
      }, JWT_SECRET, { expiresIn: '30d' })

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: userId,
          username,
          email,
          name,
          displayName: name,
          isVerified: true,
          profilePicture: picture
        }
      })
    }

    // 检查用户是否已存在
    let { data: existingUser, error: findError } = await supabase!
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    // 如果用户表不存在或有其他错误，创建一个临时用户数据
    if (findError && findError.code === '42P01') {
      // 表不存在，使用内存中的用户数据，确保用户ID一致
      const mockUser = {
        id: `google-${googleId}`, // 使用一致的Google ID
        username: email.split('@')[0],
        email,
        display_name: name,
        avatar_url: picture,
        created_at: new Date().toISOString()
      }

      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          displayName: mockUser.display_name,
          isVerified: true
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      )

      // 设置cookie
      const cookieOptions = [
        `token=${token}`,
        'HttpOnly',
        'SameSite=Strict',
        `Max-Age=${30 * 24 * 60 * 60}`,
        'Path=/'
      ].join('; ')

      res.setHeader('Set-Cookie', cookieOptions)

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully (demo mode)',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          displayName: mockUser.display_name,
          avatarUrl: mockUser.avatar_url,
          isVerified: true
        },
        token,
        isDemoMode: true
      })
    }

    let user = existingUser

    // 如果用户不存在，创建新用户
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          username: email.split('@')[0] + '_' + Date.now(),
          email,
          password_hash: 'google_oauth_' + googleId, // Google登录不需要密码
          display_name: name,
          avatar_url: picture,
          is_active: true,
          is_verified: true // Google账户默认已验证
        }])
        .select('*')
        .single()

      if (createError) {
        // 如果创建失败（例如RLS问题），回退到demo模式
        if (createError.message.includes('row-level security')) {
          const mockUser = {
            id: `google-${googleId}`, // 使用一致的Google ID
            username: email.split('@')[0],
            email,
            display_name: name,
            avatar_url: picture,
            is_verified: true,
            created_at: new Date().toISOString()
          }

          const token = jwt.sign(
            { 
              userId: mockUser.id,
              username: mockUser.username,
              email: mockUser.email,
              displayName: mockUser.display_name,
              isVerified: true
            },
            JWT_SECRET,
            { expiresIn: '30d' }
          )

          const cookieOptions = [
            `token=${token}`,
            'HttpOnly',
            'SameSite=Strict',
            `Max-Age=${30 * 24 * 60 * 60}`,
            'Path=/'
          ].join('; ')

          res.setHeader('Set-Cookie', cookieOptions)

          return res.status(200).json({
            success: true,
            message: 'Logged in successfully (demo mode - database not configured)',
            user: {
              id: mockUser.id,
              username: mockUser.username,
              email: mockUser.email,
              displayName: mockUser.display_name,
              avatarUrl: mockUser.avatar_url,
              isVerified: true
            },
            token,
            isDemoMode: true
          })
        }

        console.error('Error creating Google user:', createError)
        return res.status(500).json({ 
          error: 'Failed to create user',
          details: createError.message
        })
      }

      user = newUser
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        isVerified: user.is_verified || true
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // 创建会话记录（如果表存在）
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await supabase
        .from('user_sessions')
        .insert([{
          user_id: user.id,
          session_token: token,
          expires_at: expiresAt.toISOString()
        }])
    } catch (sessionError) {
      console.log('Session table not available, continuing without session record')
    }

    // 设置cookie
    const cookieOptions = [
      `token=${token}`,
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${30 * 24 * 60 * 60}`,
      'Path=/'
    ].join('; ')

    res.setHeader('Set-Cookie', cookieOptions)

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name || user.username,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified || true
      },
      token
    })

  } catch (error) {
    console.error('Google login error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}