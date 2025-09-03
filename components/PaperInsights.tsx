import { useState, useEffect } from 'react'
import UserInteractionButtons from './UserInteractionButtons'
import AuthenticatedWriteForm from './AuthenticatedWriteForm'

interface PaperInsight {
  id: string
  paper_id: string
  user_id: string
  insight: string
  insight_type: string
  thought_type: string
  rating?: number
  relevance_to_career?: number
  implementation_difficulty?: number
  created_at: string
  updated_at: string
}

interface PaperInsightsProps {
  paperId: string
  onShowToast?: (message: string) => void
}

export default function PaperInsights({ paperId, onShowToast }: PaperInsightsProps) {
  const [insights, setInsights] = useState<PaperInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingInsight, setEditingInsight] = useState<PaperInsight | null>(null)
  
  // Form state
  const [thoughtType, setThoughtType] = useState('general')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState<number>(3)
  const [relevanceToCareer, setRelevanceToCareer] = useState<number>(3)
  const [implementationDifficulty, setImplementationDifficulty] = useState<number>(3)

  useEffect(() => {
    fetchInsights()
  }, [paperId])

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/paper-insights?paper_id=${paperId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        setInsights(data.data)
      } else {
        // Ensure insights is always an array
        setInsights([])
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error fetching insights:', error)
      }
      setInsights([]) // Ensure insights is reset on error
      onShowToast?.('❌ Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      const url = editingInsight 
        ? `/api/paper-insights/${editingInsight.id}`
        : '/api/paper-insights'
      
      const method = editingInsight ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          insight: content,
          thought_type: thoughtType,
          rating,
          relevance_to_career: relevanceToCareer,
          implementation_difficulty: implementationDifficulty
        })
      })

      const data = await response.json()
      if (data.success) {
        onShowToast?.(`✅ Insight ${editingInsight ? 'updated' : 'added'} successfully`)
        fetchInsights()
        resetForm()
      }
    } catch (error) {
      console.error('Error saving insight:', error)
      onShowToast?.('❌ Failed to save insight')
    }
  }

  const handleDelete = async (insightId: string) => {
    if (!confirm('Are you sure you want to delete this insight?')) return

    try {
      const response = await fetch(`/api/paper-insights/${insightId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        onShowToast?.('✅ Insight deleted successfully')
        fetchInsights()
      }
    } catch (error) {
      console.error('Error deleting insight:', error)
      onShowToast?.('❌ Failed to delete insight')
    }
  }

  const resetForm = () => {
    setShowAddForm(false)
    setEditingInsight(null)
    setThoughtType('general')
    setContent('')
    setRating(3)
    setRelevanceToCareer(3)
    setImplementationDifficulty(3)
  }

  const thoughtTypeColors = {
    general: 'bg-gray-100 text-gray-800',
    key_takeaway: 'bg-green-100 text-green-800',
    application: 'bg-blue-100 text-blue-800',
    critique: 'bg-red-100 text-red-800'
  }

  const thoughtTypeIcons = {
    general: '💭',
    key_takeaway: '💡',
    application: '🚀',
    critique: '🤔'
  }

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-xl ${star <= value ? 'text-yellow-500' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Insights & Analysis</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          ➕ Add Insight
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingInsight) && !editingInsight && (
        <AuthenticatedWriteForm
          type="insight"
          targetId={paperId}
          targetType="paper"
          placeholder="What did you learn? How can you apply this? What questions do you have?"
          buttonText="Add Insight"
          onSubmit={async (data) => {
            const extendedData = {
              paper_id: paperId,
              insight: data.content,
              thought_type: 'general',
              rating: 3,
              relevance_to_career: 3,
              implementation_difficulty: 3,
              visibility: data.visibility
            }
            
            const response = await fetch('/api/paper-insights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(extendedData)
            })

            const result = await response.json()
            if (!response.ok) {
              throw new Error(result.error || 'Failed to save insight')
            }
            
            if (result.success) {
              onShowToast?.('✅ Insight added successfully')
              fetchInsights()
              resetForm()
            }
          }}
        />
      )}
      
      {/* Edit Form - Legacy form for editing existing insights */}
      {editingInsight && (
        <form onSubmit={handleSubmit} className="bg-purple-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insight Type
            </label>
            <select
              value={thoughtType}
              onChange={(e) => setThoughtType(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="general">General Thoughts</option>
              <option value="key_takeaway">Key Takeaway</option>
              <option value="application">Practical Application</option>
              <option value="critique">Critique / Question</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Insight
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full border rounded px-3 py-2"
              placeholder="What did you learn? How can you apply this? What questions do you have?"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StarRating 
              value={rating} 
              onChange={setRating}
              label="Paper Quality"
            />
            <StarRating 
              value={relevanceToCareer} 
              onChange={setRelevanceToCareer}
              label="Career Relevance"
            />
            <StarRating 
              value={implementationDifficulty} 
              onChange={setImplementationDifficulty}
              label="Implementation Difficulty"
            />
          </div>

          <div className="text-xs text-gray-600">
            <p>• Paper Quality: How well-written and insightful is the paper?</p>
            <p>• Career Relevance: How relevant is this to your career goals?</p>
            <p>• Implementation Difficulty: How hard would it be to implement these ideas?</p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              Update Insight
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

      {/* Insights List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : !insights || insights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🧠</div>
          <p>No insights yet. Add your first insight!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(insights || []).map((insight) => (
            <div key={insight.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    thoughtTypeColors[insight.thought_type as keyof typeof thoughtTypeColors] || thoughtTypeColors.general
                  }`}>
                    {thoughtTypeIcons[insight.thought_type as keyof typeof thoughtTypeIcons] || thoughtTypeIcons.general} {insight.thought_type}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingInsight(insight)
                      setThoughtType(insight.thought_type)
                      setContent(insight.insight)
                      setRating(insight.rating || 3)
                      setRelevanceToCareer(insight.relevance_to_career || 3)
                      setImplementationDifficulty(insight.implementation_difficulty || 3)
                      setShowAddForm(false)
                    }}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(insight.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap mb-3">{insight.insight}</p>

              {/* Ratings Display */}
              <div className="flex flex-wrap gap-4 text-sm">
                {insight.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">Quality:</span>
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < (insight.rating || 0) ? '' : 'opacity-30'}>★</span>
                      ))}
                    </div>
                  </div>
                )}
                {insight.relevance_to_career && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">Career:</span>
                    <div className="flex text-blue-500">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < (insight.relevance_to_career || 0) ? '' : 'opacity-30'}>★</span>
                      ))}
                    </div>
                  </div>
                )}
                {insight.implementation_difficulty && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">Difficulty:</span>
                    <div className="flex text-red-500">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < (insight.implementation_difficulty || 0) ? '' : 'opacity-30'}>★</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vote and Bookmark buttons */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <UserInteractionButtons
                  targetType="insight"
                  targetId={insight.id}
                />
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                {new Date(insight.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}