import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface User {
  id: string
  username: string
  email: string
  displayName: string
  stats: {
    bookmarks: number
    comments: number
    resources: number
    publicResources: number
  }
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookmarks' | 'resources' | 'activity'>('overview')
  const router = useRouter()

  useEffect(() => {
    fetchUserInfo()
  }, [])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      
      if (response.status === 401) {
        router.push('/auth')
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setUser(data.user)
      } else {
        setError('Failed to load user information')
      }
    } catch (err) {
      console.error('Error fetching user info:', err)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      router.push('/auth')
    } catch (error) {
      console.error('Logout error:', error)
      // 强制跳转，即使登出请求失败
      router.push('/auth')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => router.push('/auth')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.displayName || user.username}!
              </h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin-deepmind')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                DeepMind Scraper
              </button>
              <button
                onClick={() => router.push('/jobs')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Browse Jobs
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'bookmarks', label: `Bookmarks (${user.stats.bookmarks})` },
              { key: 'resources', label: `My Resources (${user.stats.resources})` },
              { key: 'activity', label: `Comments (${user.stats.comments})` }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Bookmarks</h3>
              <p className="text-3xl font-bold text-blue-600">{user.stats.bookmarks}</p>
              <p className="text-sm text-gray-500">Saved items</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Resources</h3>
              <p className="text-3xl font-bold text-green-600">{user.stats.resources}</p>
              <p className="text-sm text-gray-500">
                {user.stats.publicResources} public, {user.stats.resources - user.stats.publicResources} private
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Comments</h3>
              <p className="text-3xl font-bold text-purple-600">{user.stats.comments}</p>
              <p className="text-sm text-gray-500">Community contributions</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Profile</h3>
              <p className="text-sm text-gray-600">@{user.username}</p>
              <p className="text-sm text-gray-500">Member since today</p>
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Bookmarks</h2>
            <p className="text-gray-600">
              You have {user.stats.bookmarks} bookmarked items. 
              Go to the jobs or research pages to start bookmarking interesting content!
            </p>
            <div className="mt-4 flex space-x-4">
              <button
                onClick={() => router.push('/jobs')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Browse Jobs
              </button>
              <button
                onClick={() => router.push('/research')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Browse Research
              </button>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Resources</h2>
            <p className="text-gray-600 mb-4">
              Create and manage your own resources. You can make them public for others to see or keep them private.
            </p>
            
            <div className="mb-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Create New Resource
              </button>
            </div>

            <div className="text-sm text-gray-600">
              <p>• Public resources: {user.stats.publicResources} (visible to everyone)</p>
              <p>• Private resources: {user.stats.resources - user.stats.publicResources} (only visible to you)</p>
              <p>• Total resources: {user.stats.resources}</p>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Activity</h2>
            <p className="text-gray-600">
              You have made {user.stats.comments} comments across jobs, papers, and resources.
              Keep engaging with the community to share your insights!
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin-deepmind')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">Scrape DeepMind Data</h3>
              <p className="text-sm text-gray-600">Get latest jobs and research papers</p>
            </button>
            
            <button
              onClick={() => router.push('/jobs')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">Browse Jobs</h3>
              <p className="text-sm text-gray-600">Find and bookmark interesting positions</p>
            </button>
            
            <button
              onClick={() => router.push('/research')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">Browse Research</h3>
              <p className="text-sm text-gray-600">Explore academic papers and publications</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}