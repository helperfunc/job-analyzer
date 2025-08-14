import { useState, useEffect } from 'react'

interface JobResource {
  id: string
  job_id?: string
  user_id: string
  title: string
  url?: string
  resource_type: 'video' | 'article' | 'tool' | 'course' | 'book' | 'other'
  description?: string
  created_at: string
  updated_at?: string
  jobs?: {
    id: string
    title: string
    company: string
  }
}

interface ResourcesTabProps {
  userId: string
  jobId?: string
  showJobLinking?: boolean
}

export default function ResourcesTab({ userId, jobId, showJobLinking = false }: ResourcesTabProps) {
  const [resources, setResources] = useState<JobResource[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    resource_type: 'article' as any,
    description: ''
  })

  useEffect(() => {
    fetchResources()
  }, [userId])

  const fetchResources = async () => {
    try {
      let url = `/api/job-resources?user_id=${userId}`
      if (jobId) {
        url += `&job_id=${jobId}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setResources(data.data)
      } else {
        console.error('Failed to fetch resources:', data.error)
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
    }
  }

  const addResource = async () => {
    try {
      const response = await fetch('/api/job-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_id: jobId || null,
          title: newResource.title,
          url: newResource.url || null,
          resource_type: newResource.resource_type,
          description: newResource.description || null
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Add the new resource to the list
        setResources([data.data, ...resources])
        
        setShowAddForm(false)
        setNewResource({
          title: '',
          url: '',
          resource_type: 'article',
          description: ''
        })
      } else {
        console.error('Failed to add resource:', data.error)
        alert('Failed to add resource. Please try again.')
      }
    } catch (error) {
      console.error('Error adding resource:', error)
      alert('Network error. Please try again.')
    }
  }

  const deleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return
    
    try {
      const response = await fetch(`/api/job-resources/${resourceId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Remove the resource from the list
        setResources(resources.filter(r => r.id !== resourceId))
      } else {
        console.error('Failed to delete resource:', data.error)
        alert('Failed to delete resource. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Network error. Please try again.')
    }
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
              {resource.jobs && (
                <p className="text-xs text-gray-500 mb-2">
                  🔗 Linked to: {resource.jobs.company} - {resource.jobs.title}
                </p>
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