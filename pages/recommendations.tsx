import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import UserInteractionButtons from '../components/UserInteractionButtons'

interface RecommendationScore {
  id: string
  type: 'job' | 'paper' | 'resource' | 'user'
  title: string
  score: number
  reason: string[]
  data: any
}

export default function RecommendationsPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'job' | 'paper' | 'resource' | 'user'>('all')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=recommendations')
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecommendations()
    }
  }, [isAuthenticated, activeTab])

  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    setError('')
    
    try {
      const response = await fetch(`/api/recommendations/simple?type=${activeTab}&limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setRecommendations(data.recommendations)
      } else {
        setError(data.error || 'Failed to load recommendations')
      }
    } catch (err) {
      setError('Network error, please try again')
      console.error('Recommendations error:', err)
    } finally {
      setLoadingRecs(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">Please login to view personalized recommendations</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Personalized Recommendations</h1>
          <p className="mt-2 text-gray-600">
            Based on your bookmarks, votes and browsing history
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All', icon: '🎯' },
              { key: 'job', label: 'Jobs', icon: '💼' },
              { key: 'paper', label: 'Papers', icon: '📄' },
              { key: 'resource', label: 'Resources', icon: '📚' },
              { key: 'user', label: 'Users', icon: '👥' }
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
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loadingRecs ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Generating recommendations...</div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
            <p className="text-gray-600">
              Start bookmarking and voting on jobs and papers to get personalized recommendations!
            </p>
            <div className="mt-6 flex gap-4 justify-center">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => (
              <RecommendationCard key={`${rec.type}-${rec.id}`} recommendation={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation }: { recommendation: RecommendationScore }) {
  const router = useRouter()

  const handleClick = () => {
    if (recommendation.type === 'job') {
      router.push(`/job/${recommendation.id}?company=${recommendation.data.company.toLowerCase()}&index=0`)
    } else if (recommendation.type === 'paper') {
      router.push(`/research#paper-${recommendation.id}`)
    } else if (recommendation.type === 'resource') {
      // 处理资源导航
    } else if (recommendation.type === 'user') {
      // 处理用户页面导航
    }
  }

  const getTypeIcon = () => {
    switch (recommendation.type) {
      case 'job': return '💼'
      case 'paper': return '📄'
      case 'resource': return '📚'
      case 'user': return '👤'
      default: return '🔍'
    }
  }

  const getTypeColor = () => {
    switch (recommendation.type) {
      case 'job': return 'bg-blue-100 text-blue-800'
      case 'paper': return 'bg-purple-100 text-purple-800'
      case 'resource': return 'bg-green-100 text-green-800'
      case 'user': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getTypeIcon()}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor()}`}>
              {recommendation.type.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Score: {recommendation.score}
          </div>
        </div>

        <h3 
          className="text-lg font-semibold text-gray-900 mb-3 cursor-pointer hover:text-blue-600 line-clamp-2"
          onClick={handleClick}
        >
          {recommendation.title}
        </h3>

        {/* Additional info based on type */}
        {recommendation.type === 'job' && (
          <div className="mb-3 text-sm text-gray-600">
            <p>{recommendation.data.company}</p>
            <p>{recommendation.data.location}</p>
            {recommendation.data.salary && (
              <p className="text-green-600 font-medium">{recommendation.data.salary}</p>
            )}
          </div>
        )}

        {recommendation.type === 'paper' && (
          <div className="mb-3 text-sm text-gray-600">
            <p>{recommendation.data.company}</p>
            <p>{new Date(recommendation.data.publication_date).getFullYear()}</p>
          </div>
        )}

        {/* Reasons */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Why recommended:</p>
          <div className="space-y-1">
            {recommendation.reason.map((reason, index) => (
              <p key={index} className="text-xs text-gray-600 flex items-center">
                <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                {reason}
              </p>
            ))}
          </div>
        </div>

        {/* User Interaction Buttons */}
        {(recommendation.type === 'job' || recommendation.type === 'paper' || recommendation.type === 'resource') && (
          <div className="pt-3 border-t border-gray-100">
            <UserInteractionButtons
              targetType={recommendation.type as 'job' | 'paper' | 'resource'}
              targetId={recommendation.id}
            />
          </div>
        )}
      </div>
    </div>
  )
}