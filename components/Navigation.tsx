import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

export default function Navigation() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  
  const isActive = (path: string) => {
    return router.pathname === path
  }
  
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Job Analyzer
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Home
              </Link>
              <Link
                href="/jobs"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/jobs') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Jobs
              </Link>
              <Link
                href="/compare-v2"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/compare-v2') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Compare
              </Link>
              <Link
                href="/research"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/research') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Research
              </Link>
              <Link
                href="/resources"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/resources') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Resources
              </Link>
              <Link
                href="/projects"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/projects') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Projects
              </Link>
              <Link
                href="/guide"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/guide') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Guide
              </Link>
              {user && (
                <Link
                  href="/recommendations"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/recommendations') 
                      ? 'border-blue-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Recommendations
                </Link>
              )}
            </div>
          </div>
          
          {/* User menu */}
          <div className="flex items-center">
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900"
                >
                  {user.displayName || user.username}
                </Link>
                <button
                  onClick={logout}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Guest Mode
                </span>
                <Link
                  href="/login"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Gmail Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}