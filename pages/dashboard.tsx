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
  const [searchQuery, setSearchQuery] = useState('')
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUserInfo()
  }, [])

  useEffect(() => {
    if (user && activeTab !== 'overview') {
      fetchUserData()
    }
  }, [user, activeTab])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me-simple', {
        credentials: 'include'
      })
      
      if (response.status === 401) {
        router.push('/auth')
        return
      }

      const data = await response.json()
      
      if (data.success) {
        // Add default stats if not provided
        const userWithStats = {
          ...data.user,
          stats: data.user.stats || {
            bookmarks: 0,
            comments: 0,
            resources: 0,
            publicResources: 0
          }
        }
        setUser(userWithStats)
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

  const fetchUserData = async () => {
    setLoadingData(true)
    try {
      if (activeTab === 'bookmarks') {
        const response = await fetch('/api/user/bookmarks-with-content', {
          credentials: 'include'
        })
        const data = await response.json()
        if (data.success) {
          setBookmarks(data.bookmarks || [])
        }
      } else if (activeTab === 'resources') {
        const response = await fetch('/api/user/user-resources', {
          credentials: 'include'
        })
        const data = await response.json()
        if (data.success) {
          setResources(data.resources || [])
        }
      } else if (activeTab === 'activity') {
        // Fetch comments/thoughts/insights
        // TODO: Implement when API is available
        setComments([])
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error fetching user data:', error)
      }
    } finally {
      setLoadingData(false)
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
                Welcome, {user.displayName || user.email.split('@')[0]}!
              </h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
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

        {/* Search Bar */}
        {activeTab !== 'overview' && (
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        )}

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
              <p className="text-sm text-gray-600">@{user.username || user.email.split('@')[0]}</p>
              <p className="text-sm text-gray-500">Member since today</p>
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Bookmarks ({bookmarks.length})</h2>
              <button
                onClick={fetchUserData}
                disabled={loadingData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {loadingData ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No bookmarks yet</p>
                <div className="flex space-x-4 justify-center">
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
                    Research Papers
                  </button>
                  <button
                    onClick={() => router.push('/resources')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    Resources
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks
                  .filter(bookmark => 
                    searchQuery === '' || 
                    (bookmark.title && bookmark.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (bookmark.job_id && String(bookmark.job_id).includes(searchQuery)) ||
                    (bookmark.paper_id && String(bookmark.paper_id).includes(searchQuery))
                  )
                  .map((bookmark) => (
                    <div key={bookmark.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              bookmark.bookmark_type === 'job' ? 'bg-blue-100 text-blue-800' :
                              bookmark.bookmark_type === 'paper' ? 'bg-green-100 text-green-800' :
                              bookmark.bookmark_type === 'resource' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {bookmark.bookmark_type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(bookmark.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1">
                            {bookmark.title || `${bookmark.bookmark_type.charAt(0).toUpperCase() + bookmark.bookmark_type.slice(1)} #${bookmark[`${bookmark.bookmark_type}_id`]}`}
                          </h3>
                          {bookmark.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {bookmark.description}
                            </p>
                          )}
                          {bookmark.metadata && (
                            <div className="text-xs text-gray-500">
                              {bookmark.metadata.company && <span className="mr-3">Company: {bookmark.metadata.company}</span>}
                              {bookmark.metadata.authors && bookmark.metadata.authors.length > 0 && (
                                <span className="mr-3">Authors: {bookmark.metadata.authors.slice(0, 2).join(', ')}{bookmark.metadata.authors.length > 2 && ', ...'}</span>
                              )}
                              {bookmark.metadata.location && <span className="mr-3">{bookmark.metadata.location}</span>}
                              {bookmark.metadata.resource_type && <span className="mr-3">Type: {bookmark.metadata.resource_type}</span>}
                            </div>
                          )}
                          {(bookmark.metadata?.tags && bookmark.metadata.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {bookmark.metadata.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  {tag}
                                </span>
                              ))}
                              {bookmark.metadata.tags.length > 3 && (
                                <span className="text-xs text-gray-500">+{bookmark.metadata.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={(() => {
                              // Generate the correct URL for each bookmark type
                              if (bookmark.bookmark_type === 'job' && bookmark.job_id) {
                                return `/job/${bookmark.job_id}`
                              } else if (bookmark.bookmark_type === 'paper') {
                                // For papers, if there's a URL in metadata, use it
                                if (bookmark.metadata?.url) {
                                  return bookmark.metadata.url
                                }
                                // Otherwise go to research page
                                return '/research'
                              } else if (bookmark.bookmark_type === 'resource') {
                                // For resources, use the actual resource URL if available
                                if (bookmark.metadata?.url) {
                                  return bookmark.metadata.url
                                }
                                // Otherwise go to resources page with anchor
                                return `/resources#${bookmark.resource_id}`
                              }
                              // Fallback to list pages
                              return bookmark.bookmark_type === 'job' ? '/jobs' : 
                                     bookmark.bookmark_type === 'paper' ? '/research' : '/resources'
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View
                          </a>
                          <button
                            onClick={async () => {
                              // Remove bookmark logic would go here
                              await fetchUserData()
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Resources ({resources.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/resources?create=true')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Resource
                </button>
                <button
                  onClick={fetchUserData}
                  disabled={loadingData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingData ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
            
            {loadingData ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No resources created yet</p>
                <button
                  onClick={() => router.push('/resources?create=true')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Create Your First Resource
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {resources
                  .filter(resource => 
                    searchQuery === '' || 
                    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    resource.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((resource) => (
                    <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              {resource.resource_type}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              resource.visibility === 'public' ? 'bg-blue-100 text-blue-800' :
                              resource.visibility === 'private' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {resource.visibility || 'public'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(resource.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1">{resource.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resource.tags.map((tag, index) => (
                                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/resources/${resource.id}`)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push(`/resources/${resource.id}/edit`)}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Activity</h2>
              <button
                onClick={fetchUserData}
                disabled={loadingData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Comments and thoughts feature coming soon!</p>
              <p className="text-sm text-gray-400">
                This will include your thoughts, insights, and comments across the platform.
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            
            <button
              onClick={() => router.push('/resources')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">Browse Resources</h3>
              <p className="text-sm text-gray-600">Access learning materials and guides</p>
            </button>
            
            <button
              onClick={() => router.push('/recommendations')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">Recommendations</h3>
              <p className="text-sm text-gray-600">Get personalized content suggestions</p>
            </button>
            
            <button
              onClick={() => router.push('/bookmarks')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">My Bookmarks</h3>
              <p className="text-sm text-gray-600">View your saved jobs, papers and resources</p>
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">Scrape Companies</h3>
              <p className="text-sm text-gray-600">Get latest jobs from AI companies</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}