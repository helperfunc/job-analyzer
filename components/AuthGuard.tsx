import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
  message?: string
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
  message = 'You need to login to access this feature.'
}) => {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
        <div className="mb-4">
          <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/auth')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGuard