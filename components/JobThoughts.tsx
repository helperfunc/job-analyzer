import { useState, useEffect } from 'react'

interface JobThought {
  id: string
  job_id: string
  user_id: string
  thought_type: 'general' | 'pros' | 'cons' | 'questions' | 'preparation'
  content: string
  rating?: number
  is_interested: boolean
  created_at: string
  updated_at: string
}

interface JobThoughtsProps {
  jobId: string
  onShowToast?: (message: string) => void
}

export default function JobThoughts({ jobId, onShowToast }: JobThoughtsProps) {
  const [thoughts, setThoughts] = useState<JobThought[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingThought, setEditingThought] = useState<JobThought | null>(null)
  
  // Form state
  const [thoughtType, setThoughtType] = useState<JobThought['thought_type']>('general')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState<number>(3)
  const [isInterested, setIsInterested] = useState(true)

  useEffect(() => {
    fetchThoughts()
  }, [jobId])

  const fetchThoughts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/job-thoughts?job_id=${jobId}`)
      const data = await response.json()
      if (data.success) {
        setThoughts(data.data)
      }
    } catch (error) {
      console.error('Error fetching thoughts:', error)
      onShowToast?.('❌ Failed to load thoughts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      const url = editingThought 
        ? `/api/job-thoughts/${editingThought.id}`
        : '/api/job-thoughts'
      
      const method = editingThought ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          thought_type: thoughtType,
          content,
          rating,
          is_interested: isInterested
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Handle specific error messages
        if (response.status === 400 && data.error) {
          onShowToast?.(`⚠️ ${data.error}`)
          // If job not found, notify parent component
          if (data.error.includes('Job not found')) {
            console.error('Job not found in database:', jobId)
          }
        } else {
          onShowToast?.('❌ Failed to save thought')
        }
        return
      }
      
      if (data.success) {
        onShowToast?.(`✅ Thought ${editingThought ? 'updated' : 'added'} successfully`)
        fetchThoughts()
        resetForm()
      }
    } catch (error) {
      console.error('Error saving thought:', error)
      onShowToast?.('❌ Failed to save thought')
    }
  }

  const handleDelete = async (thoughtId: string) => {
    if (!confirm('Are you sure you want to delete this thought?')) return

    try {
      const response = await fetch(`/api/job-thoughts/${thoughtId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        onShowToast?.('✅ Thought deleted successfully')
        fetchThoughts()
      }
    } catch (error) {
      console.error('Error deleting thought:', error)
      onShowToast?.('❌ Failed to delete thought')
    }
  }

  const resetForm = () => {
    setShowAddForm(false)
    setEditingThought(null)
    setThoughtType('general')
    setContent('')
    setRating(3)
    setIsInterested(true)
  }

  const thoughtTypeColors = {
    general: 'bg-gray-100 text-gray-800',
    pros: 'bg-green-100 text-green-800',
    cons: 'bg-red-100 text-red-800',
    questions: 'bg-blue-100 text-blue-800',
    preparation: 'bg-purple-100 text-purple-800'
  }

  const thoughtTypeIcons = {
    general: '💭',
    pros: '✅',
    cons: '❌',
    questions: '❓',
    preparation: '📚'
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Thoughts & Notes</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Add Thought
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingThought) && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={thoughtType}
                onChange={(e) => setThoughtType(e.target.value as JobThought['thought_type'])}
                className="w-full border rounded px-3 py-2"
              >
                <option value="general">General Thoughts</option>
                <option value="pros">Pros / Advantages</option>
                <option value="cons">Cons / Concerns</option>
                <option value="questions">Questions to Ask</option>
                <option value="preparation">Interview Preparation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Level (1-5 stars)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Thoughts
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full border rounded px-3 py-2"
              placeholder="Write your thoughts, questions, or notes about this position..."
              required
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isInterested}
                onChange={(e) => setIsInterested(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">I'm interested in this position</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editingThought ? 'Update' : 'Save'} Thought
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Thoughts List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : thoughts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📝</div>
          <p>No thoughts yet. Add your first thought!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {thoughts.map((thought) => (
            <div key={thought.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${thoughtTypeColors[thought.thought_type]}`}>
                    {thoughtTypeIcons[thought.thought_type]} {thought.thought_type}
                  </span>
                  {thought.rating && (
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < thought.rating ? '' : 'opacity-30'}>★</span>
                      ))}
                    </div>
                  )}
                  {!thought.is_interested && (
                    <span className="text-xs text-red-600">Not interested</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingThought(thought)
                      setThoughtType(thought.thought_type)
                      setContent(thought.content)
                      setRating(thought.rating || 3)
                      setIsInterested(thought.is_interested)
                      setShowAddForm(false)
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(thought.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{thought.content}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(thought.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}