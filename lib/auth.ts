import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, isSupabaseAvailable } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface AuthUser {
  userId: string
  username: string
  email: string
  isVerified: boolean
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: AuthUser
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    // 验证会话是否仍然有效
    if (!isSupabaseAvailable()) {
      // In demo mode without database, return user from JWT
      return {
        userId: decoded.userId || 'demo-user',
        username: decoded.username || 'Demo User',
        email: decoded.email || 'demo@example.com',
        isVerified: true
      }
    }

    const { data: session, error } = await supabase!
      .from('user_sessions')
      .select('expires_at')
      .eq('session_token', token)
      .single()

    if (error || !session) {
      return null
    }

    // 检查会话是否过期
    if (new Date(session.expires_at) < new Date()) {
      // 删除过期会话
      await supabase!
        .from('user_sessions')
        .delete()
        .eq('session_token', token)
      return null
    }

    return {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      isVerified: decoded.isVerified
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function authenticateUser(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => void | Promise<void>
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // 从cookie或Authorization header中获取token
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
        details: 'No token provided'
      })
    }

    const user = await verifyToken(token)
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: 'Please log in again'
      })
    }

    req.user = user
    return handler(req, res)
  }
}

export function optionalAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => void | Promise<void>
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    let token = req.cookies.token
    
    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (token) {
      const user = await verifyToken(token)
      if (user) {
        req.user = user
      }
    }

    return handler(req, res)
  }
}

export async function getCurrentUser(req: NextApiRequest): Promise<AuthUser | null> {
  let token = req.cookies.token
  
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    return null
  }

  return await verifyToken(token)
}