import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import VisibilitySelector from './VisibilitySelector'

interface ResourceFormProps {
  onSubmit: (data: any) => void
  initialData?: any
  loading?: boolean
}

const ResourceForm: React.FC<ResourceFormProps> = ({
  onSubmit,
  initialData = null,
  loading = false
}) => {
  const { isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    resource_type: initialData?.resource_type || 'tutorial',
    url: initialData?.url || '',
    tags: initialData?.tags || [],
    visibility: initialData?.visibility || (isAuthenticated ? 'public' : 'public'), // Default to public for anonymous users
    content: initialData?.content || ''
  })
  
  const [newTag, setNewTag] = useState('')

  const resourceTypes = [
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'article', label: 'Article' },
    { value: 'video', label: 'Video' },
    { value: 'book', label: 'Book' },
    { value: 'course', label: 'Course' },
    { value: 'tool', label: 'Tool' },
    { value: 'dataset', label: 'Dataset' },
    { value: 'repository', label: 'Repository' },
    { value: 'preparation', label: 'Interview Prep' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag: string) => tag !== tagToRemove)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter resource title"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          required
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe your resource"
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="resource_type" className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </label>
        <select
          id="resource_type"
          value={formData.resource_type}
          onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {resourceTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* URL */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
          URL (optional)
        </label>
        <input
          type="url"
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com"
        />
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Content (optional)
        </label>
        <textarea
          id="content"
          rows={6}
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add detailed content about this resource"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add a tag"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Add
          </button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Visibility Control */}
      {isAuthenticated ? (
        <VisibilitySelector
          value={formData.visibility}
          onChange={(visibility) => setFormData({ ...formData, visibility })}
        />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800">Public Resource</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Resources created without login are automatically public and visible to everyone. 
                <a href="/auth" className="underline font-medium"> Login</a> to control visibility.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : initialData ? 'Update Resource' : 'Create Resource'}
        </button>
      </div>
    </form>
  )
}

export default ResourceForm