import { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../../../lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface RegisterRequest {
  username: string
  email: string
  password: string
  displayName?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, email, password, displayName }: RegisterRequest = req.body

  // 验证输入
  if (!username || !email || !password) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'Username, email, and password are required'
    })
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'Password too short',
      details: 'Password must be at least 6 characters long'
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format'
    })
  }

  try {
    // 检查用户名和邮箱是否已存在
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`)

    if (checkError) {
      console.error('Error checking existing users:', checkError)
      return res.status(500).json({ 
        error: 'Database error',
        details: 'Failed to check existing users'
      })
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0]
      if (existingUser.username === username) {
        return res.status(409).json({ 
          error: 'Username already exists',
          details: 'Please choose a different username'
        })
      }
      if (existingUser.email === email) {
        return res.status(409).json({ 
          error: 'Email already registered',
          details: 'Please use a different email or try logging in'
        })
      }
    }

    // 加密密码
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 创建用户
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password_hash: passwordHash,
        display_name: displayName || username,
        is_active: true,
        is_verified: false
      }])
      .select('id, username, email, display_name, created_at')
      .single()

    if (insertError) {
      // Only log errors in non-test environments to reduce noise
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error creating user:', insertError)
      }
      
      // 提供更具体的错误信息
      if (insertError.message.includes('row-level security policy')) {
        return res.status(500).json({ 
          error: 'Database configuration error',
          details: 'User registration requires database setup. Please run the complete schema or disable RLS on users table.',
          suggestion: 'ALTER TABLE users DISABLE ROW LEVEL SECURITY;'
        })
      }
      
      if (insertError.code === '23505') {
        return res.status(409).json({ 
          error: 'User already exists',
          details: 'Username or email is already taken'
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to create user',
        details: insertError.message,
        code: insertError.code
      })
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // 创建会话记录
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: newUser.id,
        session_token: token,
        expires_at: expiresAt.toISOString()
      }])

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      // 继续执行，因为用户已经创建成功
    }

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

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.display_name,
        createdAt: newUser.created_at
      },
      token
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}