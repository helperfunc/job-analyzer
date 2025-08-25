import { useState } from 'react'
import { useRouter } from 'next/router'
import GoogleLoginButton from '../components/GoogleLoginButton'
import Link from 'next/link'

export default function Login() {
  const [error, setError] = useState('')
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Job Analyzer
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Use your Gmail account to access all features
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
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

          <div className="mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-sm text-blue-800">
                <p className="font-medium">🔓 Guest Mode:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>View system jobs, papers and resources</li>
                  <li>Search and browse content</li>
                  <li>Limited interaction features</li>
                </ul>
                <p className="font-medium mt-3">🔑 After Gmail Login:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>View content from all users</li>
                  <li>Vote and bookmark content</li>
                  <li>Create your own content (public or private)</li>
                  <li>Get personalized recommendations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}