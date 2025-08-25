import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import AddToProjectButton from './AddToProjectButton'

interface UserInteractionButtonsProps {
  targetType: 'job' | 'paper' | 'resource' | 'user_resource' | 'thought' | 'insight'
  targetId: string
  itemTitle?: string
  initialUserVote?: number | null
  initialIsBookmarked?: boolean
  onVoteChange?: (vote: number | null) => void
  onBookmarkChange?: (isBookmarked: boolean) => void
}

const UserInteractionButtons: React.FC<UserInteractionButtonsProps> = ({
  targetType,
  targetId,
  itemTitle = '',
  initialUserVote = null,
  initialIsBookmarked = false,
  onVoteChange,
  onBookmarkChange
}) => {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [userVote, setUserVote] = useState<number | null>(initialUserVote)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [voteStats, setVoteStats] = useState({ upvotes: 0, downvotes: 0, total: 0, score: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && targetId) {
      fetchVoteStatus()
      fetchBookmarkStatus()
    }
  }, [isAuthenticated, targetId])

  const fetchVoteStatus = async () => {
    try {
      const params = new URLSearchParams({
        target_type: targetType,
        [`${targetType}_id`]: targetId
      })

      const response = await fetch(`/api/votes/simple?${params}`)
      const data = await response.json()

      if (data.success) {
        setUserVote(data.userVote)
        setVoteStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch vote status:', error)
    }
  }
  
  const fetchBookmarkStatus = async () => {
    try {
      const response = await fetch('/api/user/bookmarks-simple')
      const data = await response.json()
      
      if (data.success && data.bookmarks) {
        // Check if current item is bookmarked
        const isBookmarked = data.bookmarks.some((bookmark: any) => {
          if (targetType === 'job' && bookmark.job_id === targetId) return true
          if (targetType === 'paper' && bookmark.paper_id === targetId) return true
          if (targetType === 'resource' && bookmark.resource_id === targetId) return true
          if (targetType === 'thought' && bookmark.thought_id === targetId) return true
          if (targetType === 'insight' && bookmark.insight_id === targetId) return true
          return false
        })
        setIsBookmarked(isBookmarked)
      }
    } catch (error) {
      console.error('Failed to fetch bookmark status:', error)
    }
  }

  const handleVote = async (voteType: 1 | -1) => {
    if (!isAuthenticated) {
      const shouldRedirect = confirm('Please login to vote. Go to login page?')
      if (shouldRedirect) {
        router.push('/auth')
      }
      return
    }

    setLoading(true)
    try {
      // 如果用户已经投了相同的票，则取消投票
      if (userVote === voteType) {
        const params = new URLSearchParams({
          target_type: targetType,
          [`${targetType}_id`]: targetId
        })

        await fetch(`/api/votes/simple?${params}`, {
          method: 'DELETE'
        })

        setUserVote(null)
        onVoteChange?.(null)
      } else {
        // 投票或更改投票
        const voteData: any = {
          target_type: targetType,
          vote_type: voteType
        }
        voteData[`${targetType}_id`] = targetId

        await fetch('/api/votes/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(voteData)
        })

        setUserVote(voteType)
        onVoteChange?.(voteType)
      }

      // 重新获取投票统计
      fetchVoteStatus()
    } catch (error) {
      console.error('Failed to vote:', error)
      alert('Failed to vote, please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      const shouldRedirect = confirm('Please login to bookmark. Go to login page?')
      if (shouldRedirect) {
        router.push('/auth')
      }
      return
    }

    setLoading(true)
    try {
      if (isBookmarked) {
        // Remove bookmark
        const bookmarkData: any = {
          bookmark_type: targetType === 'user_resource' ? 'resource' : targetType
        }
        
        // Set the correct ID field based on target type
        if (targetType === 'job') {
          bookmarkData.job_id = targetId
        } else if (targetType === 'paper') {
          bookmarkData.paper_id = targetId
        } else if (targetType === 'resource' || targetType === 'user_resource') {
          bookmarkData.resource_id = targetId
        } else if (targetType === 'thought') {
          bookmarkData.thought_id = targetId
        } else if (targetType === 'insight') {
          bookmarkData.insight_id = targetId
        }
        
        const response = await fetch('/api/user/bookmarks-remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookmarkData)
        })
        
        const result = await response.json()
        
        if (response.ok) {
          setIsBookmarked(false)
          onBookmarkChange?.(false)
        } else {
          console.error('Failed to remove bookmark:', response.status, result)
          throw new Error(result.error || 'Failed to remove bookmark')
        }
      } else {
        // 添加收藏
        const bookmarkData: any = {
          bookmark_type: targetType === 'user_resource' ? 'resource' : targetType
        }

        if (targetType === 'job') {
          bookmarkData.job_id = targetId
        } else if (targetType === 'paper') {
          bookmarkData.paper_id = targetId
        } else if (targetType === 'resource' || targetType === 'user_resource') {
          bookmarkData.resource_id = targetId
          bookmarkData.resource_type = targetType
        } else if (targetType === 'thought') {
          bookmarkData.thought_id = targetId
        } else if (targetType === 'insight') {
          bookmarkData.insight_id = targetId
        }

        const response = await fetch('/api/user/bookmarks-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookmarkData)
        })

        if (response.ok) {
          setIsBookmarked(true)
          onBookmarkChange?.(true)
        } else if (response.status === 409) {
          // 已经收藏了
          setIsBookmarked(true)
          onBookmarkChange?.(true)
        } else {
          throw new Error('Failed to bookmark')
        }
      }
    } catch (error) {
      console.error('Failed to bookmark:', error)
      alert('Bookmark operation failed, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* 投票按钮 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleVote(1)}
          disabled={loading || !isAuthenticated}
          className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
            userVote === 1
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
          } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isAuthenticated ? 'Upvote' : 'Please login first'}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
          {voteStats.upvotes}
        </button>

        <button
          onClick={() => handleVote(-1)}
          disabled={loading || !isAuthenticated}
          className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
            userVote === -1
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
          } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isAuthenticated ? 'Downvote' : 'Please login first'}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
          {voteStats.downvotes}
        </button>
      </div>

      {/* 收藏按钮 */}
      <button
        onClick={handleBookmark}
        disabled={loading || !isAuthenticated}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
          isBookmarked
            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600'
        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isAuthenticated ? (isBookmarked ? 'Remove bookmark' : 'Bookmark') : 'Please login first'}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
        </svg>
        {isBookmarked ? 'Bookmarked' : 'Bookmark'}
      </button>

      {/* Add to Project Button */}
      {itemTitle && (targetType === 'job' || targetType === 'paper' || targetType === 'resource') && (
        <AddToProjectButton 
          itemId={targetId}
          itemType={targetType as 'job' | 'paper' | 'resource'}
          itemTitle={itemTitle}
        />
      )}

      {/* Login status hint */}
      {!isAuthenticated && (
        <span className="text-xs text-gray-500">
          <button 
            onClick={() => router.push('/auth')} 
            className="text-blue-500 hover:text-blue-600 underline cursor-pointer"
          >
            Login
          </button> 
          to vote and bookmark
        </span>
      )}
    </div>
  )
}

export default UserInteractionButtons