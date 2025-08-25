import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import UserInteractionButtons from '../components/UserInteractionButtons'
import ResourceThoughts from '../components/ResourceThoughts'

interface Resource {
  id: string
  job_id?: string
  title: string
  url?: string
  description?: string
  resource_type: string
  content?: string
  tags?: string[]
  created_at: string
  job?: {
    id: string
    title: string
    company: string
  }
}

interface Job {
  id: string
  title: string
  company: string
}

export default function ResourcesPage() {
  const router = useRouter()
  const [resources, setResources] = useState<Resource[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedResourceType, setSelectedResourceType] = useState<'job_resources' | 'interview_resources'>('job_resources')
  const [selectedJob, setSelectedJob] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    description: '',
    resource_type: 'course',
    content: '',
    tags: [] as string[],
    job_id: ''
  })

  const resourceTypes = [
    { value: 'course', label: 'Course', icon: '🎓' },
    { value: 'book', label: 'Book', icon: '📚' },
    { value: 'video', label: 'Video', icon: '🎥' },
    { value: 'article', label: 'Article', icon: '📄' },
    { value: 'tool', label: 'Tool', icon: '🛠️' },
    { value: 'preparation', label: 'Preparation', icon: '📝' },
    { value: 'question', label: 'Question', icon: '❓' },
    { value: 'experience', label: 'Experience', icon: '💡' },
    { value: 'note', label: 'Note', icon: '📋' },
    { value: 'other', label: 'Other', icon: '🔖' }
  ]

  useEffect(() => {
    fetchResources()
    fetchJobs()
  }, [])

  const fetchResources = async () => {
    try {
      const [jobResourcesRes, interviewResourcesRes] = await Promise.all([
        fetch('/api/job-resources'),
        fetch('/api/interview-resources')
      ])

      const [jobResourcesData, interviewResourcesData] = await Promise.all([
        jobResourcesRes.json(),
        interviewResourcesRes.json()
      ])

      const allResources = [
        ...(jobResourcesData.success && jobResourcesData.data ? jobResourcesData.data.map((r: any) => ({ ...r, source: 'job_resources' })) : []),
        ...(interviewResourcesData.success && interviewResourcesData.data ? interviewResourcesData.data.map((r: any) => ({ ...r, source: 'interview_resources' })) : [])
      ]

      setResources(allResources)
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error fetching resources:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      const data = await response.json()
      if (data.success && data.data) {
        setJobs(data.data)
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error fetching jobs:', error)
      }
    }
  }

  const handleSubmit = async () => {
    if (!newResource.title.trim() || !newResource.content.trim()) return

    try {
      const endpoint = selectedResourceType === 'job_resources' ? '/api/job-resources' : '/api/interview-resources'
      
      const bodyData = selectedResourceType === 'job_resources' 
        ? {
            user_id: 'default',
            job_id: newResource.job_id || null,
            title: newResource.title,
            url: newResource.url || null,
            resource_type: newResource.resource_type,
            description: newResource.content
          }
        : {
            job_id: newResource.job_id || null,
            title: newResource.title,
            url: newResource.url || null,
            resource_type: newResource.resource_type,
            content: newResource.content,
            tags: newResource.tags
          }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchResources()
        setShowAddModal(false)
        resetForm()
      } else {
        alert('Failed to create resource: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error creating resource:', error)
      }
      alert('Network error while creating resource')
    }
  }

  const handleDelete = async (resourceId: string, source: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    try {
      const endpoint = source === 'job_resources' ? '/api/job-resources' : '/api/interview-resources'
      
      const response = await fetch(`${endpoint}?id=${resourceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchResources()
      } else {
        alert('Failed to delete resource')
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error deleting resource:', error)
      }
      alert('Network error while deleting resource')
    }
  }

  const resetForm = () => {
    setNewResource({
      title: '',
      url: '',
      description: '',
      resource_type: 'course',
      content: '',
      tags: [],
      job_id: ''
    })
  }

  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchTerm || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.content?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = !selectedType || resource.resource_type === selectedType
    const matchesJob = !selectedJob || resource.job_id === selectedJob

    return matchesSearch && matchesType && matchesJob
  })

  const getResourceIcon = (type: string) => {
    const resourceType = resourceTypes.find(rt => rt.value === type)
    return resourceType ? resourceType.icon : '🔖'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resource Management Center</h1>
              <p className="text-gray-600 mt-2">
                Create, organize, and manage all your job-related resources in one place
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                ➕ Add Resource
              </button>
              <button
                onClick={() => router.push('/jobs')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                📋 View Jobs
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              {resourceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All Jobs</option>
              {jobs && jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.company}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              {filteredResources.length} of {resources.length} resources
            </div>
          </div>
        </div>

        {/* Resources List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResources.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No resources found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedType || selectedJob 
                    ? 'Try adjusting your search filters' 
                    : 'Start building your resource collection'}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  ➕ Add Your First Resource
                </button>
              </div>
            ) : (
              filteredResources.map((resource) => (
                <div key={resource.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getResourceIcon(resource.resource_type)}</span>
                        <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                          {resource.resource_type}
                        </span>
                      </div>
                      
                      {resource.job_id && (
                        <div className="mb-2">
                          <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            📋 Linked to job: {jobs && jobs.find(j => j.id === resource.job_id)?.title || 'Unknown Job'}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-gray-700 text-sm mb-3">
                        {resource.content || resource.description || ''}
                      </p>
                      
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          🔗 View Resource
                        </a>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleDelete(resource.id, resource.source)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete resource"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Created: {new Date(resource.created_at).toLocaleDateString()}
                  </div>
                  
                  {/* Vote and Bookmark buttons */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <UserInteractionButtons
                      targetType="resource"
                      targetId={resource.id}
                      itemTitle={resource.title}
                    />
                  </div>

                  {/* Resource Thoughts Section */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <ResourceThoughts 
                      resourceId={resource.id}
                      isPublic={true}
                      onShowToast={(message) => alert(message)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Resource Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Resource</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Resource Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resource Category
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="job_resources"
                        checked={selectedResourceType === 'job_resources'}
                        onChange={(e) => setSelectedResourceType(e.target.value as any)}
                        className="mr-2"
                      />
                      📋 Job Resource
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="interview_resources"
                        checked={selectedResourceType === 'interview_resources'}
                        onChange={(e) => setSelectedResourceType(e.target.value as any)}
                        className="mr-2"
                      />
                      💼 Interview Resource
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newResource.title}
                    onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                    placeholder="e.g., Python for Data Science Course"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Resource Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={newResource.resource_type}
                    onChange={(e) => setNewResource({...newResource, resource_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    {resourceTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link to Job (Optional)
                  </label>
                  <select
                    value={newResource.job_id}
                    onChange={(e) => setNewResource({...newResource, job_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No specific job</option>
                    {jobs && jobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.title} - {job.company}
                      </option>
                    ))}
                  </select>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Content/Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description/Notes *
                  </label>
                  <textarea
                    value={newResource.content}
                    onChange={(e) => setNewResource({...newResource, content: e.target.value})}
                    placeholder="Describe this resource, your notes, why it's useful..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!newResource.title.trim() || !newResource.content.trim()}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create Resource
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}