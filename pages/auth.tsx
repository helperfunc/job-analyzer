import React, { useState } from 'react'
import { useRouter } from 'next/router'
import GoogleLoginButton from '../components/GoogleLoginButton'
import Link from 'next/link'

export default function Auth() {
  const [error, setError] = useState('')
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to Job Analyzer
            </h1>
            <p className="text-gray-600 mt-2">
              Sign in with your Gmail account to access all features
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <GoogleLoginButton
              onSuccess={() => {
                router.push('/')
              }}
              onError={(error) => {
                setError(error)
              }}
            />
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Browse without login
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link 
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Continue as Guest
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">What you can do after login:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Bookmark jobs and research papers</li>
              <li>• Create and share resources (public/private)</li>
              <li>• Comment on jobs, papers, and resources</li>
              <li>• Vote on content (upvote/downvote)</li>
              <li>• Get personalized recommendations</li>
              <li>• View content from all users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}