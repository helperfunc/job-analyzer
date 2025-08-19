import React, { useState } from 'react'
import { useRouter } from 'next/router'

interface AuthFormData {
  username?: string
  email: string
  password: string
  displayName?: string
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState<AuthFormData>({
    username: '',
    email: '',
    password: '',
    displayName: ''
  })
  
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: isLogin ? 'Login successful!' : 'Registration successful! Welcome!' 
        })
        
        // 延迟跳转，让用户看到成功信息
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Authentication failed'
        })
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage({ 
        type: 'error', 
        text: 'Network error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isLogin 
                ? 'Sign in to your account to continue'
                : 'Join our community to track jobs, papers, and resources'
              }
            </p>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username || ''}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Choose a username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Your display name"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading 
                ? (isLogin ? 'Signing in...' : 'Creating account...') 
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage(null)
                setFormData({ username: '', email: '', password: '', displayName: '' })
              }}
              className="text-blue-600 hover:underline"
            >
              {isLogin 
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">What you can do:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Bookmark jobs and research papers</li>
              <li>• Create and share resources (public/private)</li>
              <li>• Comment on jobs, papers, and resources</li>
              <li>• Vote on content (like/dislike)</li>
              <li>• Track DeepMind jobs and publications</li>
              <li>• Build your professional network</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}