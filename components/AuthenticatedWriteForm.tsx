import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import VisibilitySelector from './VisibilitySelector'

interface AuthenticatedWriteFormProps {
  type: 'thought' | 'insight' | 'comment'
  targetId?: string
  targetType?: string
  onSubmit: (data: any) => void
  placeholder?: string
  buttonText?: string
}

const AuthenticatedWriteForm: React.FC<AuthenticatedWriteFormProps> = ({
  type,
  targetId,
  targetType,
  onSubmit,
  placeholder = `Write your ${type}...`,
  buttonText = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`
}) => {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private' | 'friends'>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        content: content.trim(),
        visibility,
        targetId,
        targetType,
        type
      })
      setContent('')
    } catch (error) {
      console.error(`Error submitting ${type}:`, error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <div className="text-center">
          <div className="mb-4">
            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Login Required to Write {type.charAt(0).toUpperCase() + type.slice(1)}s
          </h3>
          <p className="text-gray-600 mb-4">
            Share your insights with the community by logging in first.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/auth')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login to Write
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <VisibilitySelector
              value={visibility}
              onChange={setVisibility}
              compact={true}
            />
          </div>
          
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : buttonText}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AuthenticatedWriteForm