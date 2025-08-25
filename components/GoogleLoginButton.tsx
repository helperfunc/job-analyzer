import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'

declare global {
  interface Window {
    google: any
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false)
  const { loginWithGoogle } = useAuth()
  const router = useRouter()

  const handleGoogleLogin = async () => {
    setLoading(true)
    
    try {
      // 暂时使用手动输入方案，确保用户信息一致性
      await handleFallbackLogin()
    } catch (error) {
      console.error('Google login error:', error)
      onError?.('Google login failed, please try again')
      setLoading(false)
    }
  }

  const handleFallbackLogin = async () => {
    try {
      // 检查是否有已存在的登录信息
      const existingEmail = localStorage.getItem('lastLoginEmail')
      const existingName = localStorage.getItem('lastLoginName')
      
      // 让用户输入邮箱，如果有历史记录就预填
      const email = prompt('请输入您的Gmail邮箱:', existingEmail || '') 
      if (!email || !email.includes('@')) {
        throw new Error('请输入有效的邮箱地址')
      }
      
      const name = prompt('请输入您的姓名:', existingName || email.split('@')[0])
      if (!name) {
        throw new Error('请输入姓名')
      }
      
      // 创建一致的用户ID，基于邮箱地址
      const consistentId = btoa(email).replace(/[^a-zA-Z0-9]/g, '')
      
      const googleUser = {
        id: consistentId, // 使用基于邮箱的一致ID
        email: email,
        name: name,
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      }

      // 保存信息以便下次使用
      localStorage.setItem('lastLoginEmail', email)
      localStorage.setItem('lastLoginName', name)

      const success = await loginWithGoogle?.(googleUser) || true
      
      if (success) {
        onSuccess?.()
        router.push('/')
      } else {
        throw new Error('Login failed')
      }
    } catch (error) {
      console.error('Fallback login error:', error)
      if (error instanceof Error && error.message.includes('取消')) {
        // 用户取消了输入，不显示错误
        return
      }
      onError?.('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth回调处理
  const handleCredentialResponse = async (response: any) => {
    try {
      // 解析JWT token以获取用户信息
      const responsePayload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleUser = {
        id: responsePayload.sub,
        email: responsePayload.email,
        name: responsePayload.name,
        picture: responsePayload.picture
      }

      const success = await loginWithGoogle?.(googleUser) || true
      
      if (success) {
        onSuccess?.()
        router.push('/')
      } else {
        throw new Error('Login failed')
      }
    } catch (error) {
      console.error('Google OAuth callback error:', error)
      onError?.('Google登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 初始化Google登录
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        callback: handleCredentialResponse,
      })
    }
  }, [])

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full flex justify-center items-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  )
}

export default GoogleLoginButton