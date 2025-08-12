import { useState, useEffect } from 'react'

interface JobResource {
  id: string
  user_id: string
  title: string
  url?: string
  resource_type: 'video' | 'article' | 'tool' | 'course' | 'book' | 'other'
  description?: string
  tags: string[]
  rating?: number
  notes?: string
  created_at: string
}

export default function ResourcesTab({ userId }: { userId: string }) {
  const [resources, setResources] = useState<JobResource[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    resource_type: 'article' as any,
    description: '',
    rating: 5,
    notes: ''
  })

  useEffect(() => {
    fetchResources()
  }, [userId])

  const fetchResources = async () => {
    // Use localStorage for persistence since API not implemented yet
    const storageKey = `job-resources-${userId}`
    const storedResources = localStorage.getItem(storageKey)
    
    if (storedResources) {
      try {
        setResources(JSON.parse(storedResources))
        return
      } catch (error) {
        console.error('Error parsing stored resources:', error)
      }
    }
    
    // Default mock data for first time users
    const defaultResources = [
      {
        id: '1',
        user_id: userId,
        title: 'System Design Interview Guide',
        url: 'https://github.com/donnemartin/system-design-primer',
        resource_type: 'article',
        description: 'Comprehensive guide for system design interviews',
        tags: ['system-design', 'interview'],
        rating: 5,
        notes: 'Excellent resource for senior roles',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: userId,
        title: 'LeetCode Patterns',
        url: 'https://seanprashad.com/leetcode-patterns/',
        resource_type: 'tool',
        description: 'Curated list of LeetCode questions grouped by patterns',
        tags: ['leetcode', 'algorithms'],
        rating: 4,
        notes: 'Great for interview prep',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        user_id: userId,
        title: 'ML System Design Interview',
        url: 'https://www.youtube.com/watch?v=example',
        resource_type: 'video',
        description: 'How to approach ML system design interviews',
        tags: ['ml', 'system-design', 'interview'],
        rating: 5,
        notes: 'Great walkthrough by ex-Google engineer',
        created_at: new Date().toISOString()
      }
    ]
    
    setResources(defaultResources)
    localStorage.setItem(storageKey, JSON.stringify(defaultResources))
  }

  const addResource = async () => {
    const resource: JobResource = {
      id: Date.now().toString(),
      user_id: userId,
      ...newResource,
      tags: [],
      created_at: new Date().toISOString()
    }
    const updatedResources = [resource, ...resources]
    setResources(updatedResources)
    
    // Save to localStorage
    const storageKey = `job-resources-${userId}`
    localStorage.setItem(storageKey, JSON.stringify(updatedResources))
    
    setShowAddForm(false)
    setNewResource({
      title: '',
      url: '',
      resource_type: 'article',
      description: '',
      rating: 5,
      notes: ''
    })
  }

  const deleteResource = (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return
    
    const updatedResources = resources.filter(r => r.id !== resourceId)
    setResources(updatedResources)
    
    // Save to localStorage
    const storageKey = `job-resources-${userId}`
    localStorage.setItem(storageKey, JSON.stringify(updatedResources))
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Job Search Resources</h2>
          <p className="text-gray-600 text-sm mt-1">
            Save useful videos, articles, tools, and other resources for your job search
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Resource'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Resource</h3>
          <div className="grid gap-4">
            <input
              type="text"
              placeholder="Title"
              value={newResource.title}
              onChange={(e) => setNewResource({...newResource, title: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              placeholder="URL (optional)"
              value={newResource.url}
              onChange={(e) => setNewResource({...newResource, url: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newResource.resource_type}
              onChange={(e) => setNewResource({...newResource, resource_type: e.target.value as any})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="video">Video</option>
              <option value="article">Article</option>
              <option value="tool">Tool</option>
              <option value="course">Course</option>
              <option value="book">Book</option>
              <option value="other">Other</option>
            </select>
            <textarea
              placeholder="Description"
              value={newResource.description}
              onChange={(e) => setNewResource({...newResource, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating: {newResource.rating}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={newResource.rating}
                onChange={(e) => setNewResource({...newResource, rating: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
            <textarea
              placeholder="Personal notes"
              value={newResource.notes}
              onChange={(e) => setNewResource({...newResource, notes: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <button
              onClick={addResource}
              disabled={!newResource.title}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Save Resource
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {resources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500 mb-2">No resources saved yet</p>
            <p className="text-sm text-gray-400">
              Start building your job search toolkit by adding helpful resources
            </p>
          </div>
        ) : (
          resources.map(resource => (
            <div key={resource.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{resource.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resource.resource_type === 'video' ? 'bg-red-100 text-red-700' :
                    resource.resource_type === 'article' ? 'bg-blue-100 text-blue-700' :
                    resource.resource_type === 'tool' ? 'bg-green-100 text-green-700' :
                    resource.resource_type === 'course' ? 'bg-purple-100 text-purple-700' :
                    resource.resource_type === 'book' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {resource.resource_type}
                  </span>
                  {resource.rating && (
                    <span className="text-sm text-gray-600">
                      {'★'.repeat(resource.rating)}{'☆'.repeat(5 - resource.rating)}
                    </span>
                  )}
                  <button
                    onClick={() => deleteResource(resource.id)}
                    className="text-sm bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded ml-2 font-bold"
                    title="Delete resource"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {resource.description && (
                <p className="text-gray-700 mb-2">{resource.description}</p>
              )}
              {resource.notes && (
                <p className="text-sm text-gray-600 italic mb-2">"{resource.notes}"</p>
              )}
              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {resource.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {resource.url && (
                <a href={resource.url} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1">
                  Visit Resource →
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}