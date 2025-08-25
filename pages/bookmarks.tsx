import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import UserInteractionButtons from '../components/UserInteractionButtons'

interface Bookmark {
  id: string
  bookmark_type: 'job' | 'paper' | 'resource'
  created_at: string
  job?: {
    id: string
    title: string
    company: string
    location: string
    salary?: string
    department?: string
  }
  paper?: {
    id: string
    title: string
    company: string
    authors: string[]
    publication_date: string
    tags: string[]
  }
  resource?: {
    id: string
    title: string
    resource_type: string
    description?: string
    tags?: string[]
  }
}

interface RecommendationItem {
  id: string
  type: 'job' | 'paper' | 'resource'
  title: string
  reason: string
  data: any
}

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'job' | 'paper' | 'resource'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchBookmarks()
      fetchRecommendations()
    }
  }, [user, authLoading])

  const fetchBookmarks = async () => {
    try {
      const response = await fetch('/api/user/bookmarks-simple')
      const data = await response.json()
      
      if (data.success) {
        setBookmarks(data.bookmarks)
      } else {
        setError('Failed to load bookmarks')
      }
    } catch (err) {
      setError('Network error')
      console.error('Error fetching bookmarks:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations/simple?limit=6')
      const data = await response.json()
      
      if (data.success) {
        setRecommendations(data.recommendations)
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err)
    }
  }

  const removeBookmark = async (bookmarkId: string) => {
    try {
      const response = await fetch(`/api/user/bookmarks/${bookmarkId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setBookmarks(bookmarks.filter(b => b.id !== bookmarkId))
      } else {
        alert('Failed to remove bookmark')
      }
    } catch (err) {
      alert('Error removing bookmark')
    }
  }

  const filteredBookmarks = bookmarks.filter(bookmark => {
    // Filter by type
    if (activeTab !== 'all' && bookmark.bookmark_type !== activeTab) {
      return false
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (bookmark.job) {
        return bookmark.job.title.toLowerCase().includes(term) ||
               bookmark.job.company.toLowerCase().includes(term)
      }
      if (bookmark.paper) {
        return bookmark.paper.title.toLowerCase().includes(term) ||
               bookmark.paper.company.toLowerCase().includes(term) ||
               bookmark.paper.tags.some(tag => tag.toLowerCase().includes(term))
      }
      if (bookmark.resource) {
        return bookmark.resource.title.toLowerCase().includes(term) ||
               (bookmark.resource.description || '').toLowerCase().includes(term)
      }
    }
    
    return true
  })

  const getBookmarkCounts = () => {
    const counts = { all: bookmarks.length, job: 0, paper: 0, resource: 0 }
    bookmarks.forEach(b => {
      counts[b.bookmark_type]++
    })
    return counts
  }

  const counts = getBookmarkCounts()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookmarks</h1>
          <p className="mt-2 text-gray-600">
            Manage your saved jobs, papers, and resources
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All', icon: '📚' },
              { key: 'job', label: 'Jobs', icon: '💼' },
              { key: 'paper', label: 'Papers', icon: '📄' },
              { key: 'resource', label: 'Resources', icon: '🔧' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label} ({counts[tab.key as keyof typeof counts]})
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Bookmarks List */}
          <div className="lg:col-span-3">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {filteredBookmarks.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <div className="text-6xl mb-4">🔖</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No bookmarks yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start bookmarking jobs, papers, and resources to see them here
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => router.push('/jobs')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Browse Jobs
                  </button>
                  <button
                    onClick={() => router.push('/research')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    Browse Papers
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    onRemove={() => removeBookmark(bookmark.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recommendations Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recommended for You
              </h2>
              
              {recommendations.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No recommendations available yet. Keep bookmarking to get personalized suggestions!
                </p>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <RecommendationCard key={`${rec.type}-${rec.id}`} recommendation={rec} />
                  ))}
                </div>
              )}
              
              <button
                onClick={() => router.push('/recommendations')}
                className="mt-6 w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm font-medium"
              >
                View All Recommendations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookmarkCard({ bookmark, onRemove }: { bookmark: Bookmark, onRemove: () => void }) {
  const router = useRouter()
  
  const handleClick = () => {
    if (bookmark.job) {
      router.push(`/job/${bookmark.job.id}?company=${bookmark.job.company.toLowerCase()}&index=0`)
    } else if (bookmark.paper) {
      router.push(`/research#paper-${bookmark.paper.id}`)
    } else if (bookmark.resource) {
      router.push(`/resources#resource-${bookmark.resource.id}`)
    }
  }
  
  const getIcon = () => {
    switch (bookmark.bookmark_type) {
      case 'job': return '💼'
      case 'paper': return '📄'
      case 'resource': return '🔧'
      default: return '📌'
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getIcon()}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              bookmark.bookmark_type === 'job' ? 'bg-blue-100 text-blue-800' :
              bookmark.bookmark_type === 'paper' ? 'bg-purple-100 text-purple-800' :
              'bg-green-100 text-green-800'
            }`}>
              {bookmark.bookmark_type.toUpperCase()}
            </span>
          </div>
          
          <h3 
            className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600"
            onClick={handleClick}
          >
            {bookmark.job?.title || bookmark.paper?.title || bookmark.resource?.title}
          </h3>
          
          {bookmark.job && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>{bookmark.job.company} • {bookmark.job.location}</p>
              {bookmark.job.salary && (
                <p className="text-green-600 font-medium">{bookmark.job.salary}</p>
              )}
            </div>
          )}
          
          {bookmark.paper && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>{bookmark.paper.company} • {new Date(bookmark.paper.publication_date).getFullYear()}</p>
              <p className="text-xs">{bookmark.paper.authors.slice(0, 3).join(', ')}{bookmark.paper.authors.length > 3 ? ', ...' : ''}</p>
              {bookmark.paper.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {bookmark.paper.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {bookmark.resource && (
            <div className="text-sm text-gray-600">
              <p className="capitalize">{bookmark.resource.resource_type.replace('_', ' ')}</p>
              {bookmark.resource.description && (
                <p className="mt-1 line-clamp-2">{bookmark.resource.description}</p>
              )}
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            Bookmarked {new Date(bookmark.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-4 text-red-500 hover:text-red-700"
          title="Remove bookmark"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Vote buttons for bookmarked items */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <UserInteractionButtons
          targetType={bookmark.bookmark_type}
          targetId={bookmark.job?.id || bookmark.paper?.id || bookmark.resource?.id || ''}
          initialIsBookmarked={true}
        />
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation }: { recommendation: RecommendationItem }) {
  const router = useRouter()
  
  const handleClick = () => {
    if (recommendation.type === 'job') {
      router.push(`/job/${recommendation.id}?company=${recommendation.data.company.toLowerCase()}&index=0`)
    } else if (recommendation.type === 'paper') {
      router.push(`/research#paper-${recommendation.id}`)
    } else if (recommendation.type === 'resource') {
      router.push(`/resources#resource-${recommendation.id}`)
    }
  }
  
  const getIcon = () => {
    switch (recommendation.type) {
      case 'job': return '💼'
      case 'paper': return '📄'
      case 'resource': return '🔧'
      default: return '✨'
    }
  }
  
  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{getIcon()}</span>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600">
            {recommendation.title}
          </h4>
          <p className="text-xs text-gray-500 mt-1">{recommendation.reason}</p>
        </div>
      </div>
    </div>
  )
}