import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface Job {
  id: string
  title: string
  company: string
  location: string
  department?: string
  salary?: string
  salary_min?: number
  salary_max?: number
  skills?: string[]
  description?: string
  url?: string
  description_url?: string
}

interface Paper {
  id: string
  title: string
  authors: string[]
  publication_date: string
  abstract: string
  url: string
  arxiv_id?: string
  github_url?: string
  company: string
  tags: string[]
}

interface InterviewResource {
  id: string
  job_id: string
  title: string
  url?: string
  resource_type: 'preparation' | 'question' | 'experience' | 'note' | 'other'
  content: string
  tags: string[]
  created_at: string
}

export default function JobDetail() {
  const router = useRouter()
  const { jobId, company, index } = router.query
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [relatedPapers, setRelatedPapers] = useState<Paper[]>([])
  const [interviewResources, setInterviewResources] = useState<InterviewResource[]>([])
  const [activeTab, setActiveTab] = useState<'info' | 'papers' | 'resources'>('info')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  // Show toast notification
  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  useEffect(() => {
    if (!jobId) return
    fetchJobDetails()
    fetchRelatedPapers()
    fetchInterviewResources()
  }, [jobId])

  const fetchJobDetails = async () => {
    setLoading(true)
    try {
      // Try to fetch from database first
      const dbResponse = await fetch('/api/jobs')
      const dbData = await dbResponse.json()
      
      if (dbData.success && dbData.jobs) {
        const foundJob = dbData.jobs.find((j: Job) => j.id === jobId)
        if (foundJob) {
          setJob(foundJob)
          setLoading(false)
          return
        }
      }
      
      // If not found in database, try to get from summary data
      if (company && index !== undefined) {
        const response = await fetch(`/api/get-summary?company=${company}`)
        const data = await response.json()
        
        if (data.summary && data.summary.highest_paying_jobs) {
          const jobIndex = parseInt(index as string)
          const jobData = data.summary.highest_paying_jobs[jobIndex]
          
          if (jobData) {
            setJob({
              id: jobId as string,
              ...jobData,
              company: (company as string).charAt(0).toUpperCase() + (company as string).slice(1),
              description_url: jobData.url || `https://${company}.com/careers`
            })
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch job details:', err)
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedPapers = async () => {
    if (!jobId) return
    try {
      const response = await fetch(`/api/research/papers/${jobId}`)
      const data = await response.json()
      if (data.success) {
        setRelatedPapers(data.data.map((relation: any) => relation.paper))
      }
    } catch (err) {
      console.error('Failed to fetch related papers:', err)
    }
  }

  const fetchInterviewResources = async () => {
    if (!jobId) return
    try {
      // Get from localStorage for now
      const allResources = JSON.parse(localStorage.getItem('interview_resources') || '[]')
      const jobResources = allResources.filter((resource: InterviewResource) => resource.job_id === jobId)
      setInterviewResources(jobResources)
    } catch (err) {
      console.error('Failed to fetch interview resources:', err)
    }
  }

  const removePaperFromJob = async (paperId: string) => {
    try {
      const response = await fetch('/api/research/unrelate-paper', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        setRelatedPapers(prev => prev.filter(paper => paper.id !== paperId))
        showToastMessage('🗑️ Paper removed from job')
      } else {
        console.error('Failed to unlink paper:', data.error)
        showToastMessage('❌ Failed to remove paper')
      }
    } catch (err) {
      console.error('Failed to remove paper from job:', err)
      showToastMessage('❌ Network error')
    }
  }

  const removeInterviewResource = (resourceId: string) => {
    try {
      const allResources = JSON.parse(localStorage.getItem('interview_resources') || '[]')
      const updatedResources = allResources.filter((resource: InterviewResource) => resource.id !== resourceId)
      localStorage.setItem('interview_resources', JSON.stringify(updatedResources))
      
      setInterviewResources(prev => prev.filter(resource => resource.id !== resourceId))
      showToastMessage('🗑️ Interview resource removed')
    } catch (err) {
      console.error('Failed to remove interview resource:', err)
      showToastMessage('❌ Failed to remove resource')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error || 'Job not found'}</p>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              <p className="text-xl text-gray-600">{job.company}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/jobs')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                All Jobs
              </button>
              <button
                onClick={() => router.push(`/research#jobId=${jobId}`)}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Research
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mb-6 border-b">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Job Info
          </button>
          <button
            onClick={() => setActiveTab('papers')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'papers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Related Papers ({relatedPapers.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Interview Resources ({interviewResources.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location</h3>
                <p className="text-lg">{job.location || 'Remote'}</p>
              </div>
              
              {job.department && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Department</h3>
                  <p className="text-lg">{job.department}</p>
                </div>
              )}
              
              {job.salary && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Salary</h3>
                  <p className="text-lg text-green-600 font-medium">{job.salary}</p>
                </div>
              )}
            </div>

            {job.skills && job.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {(job.url || job.description_url) && (
              <div className="pt-4 border-t">
                <a
                  href={job.url || job.description_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
                >
                  View on {job.company} Website →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Related Papers Tab */}
        {activeTab === 'papers' && (
          <div className="space-y-4">
            {relatedPapers.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <p className="text-gray-500 mb-4">No papers linked to this job yet</p>
                <button
                  onClick={() => router.push('/research')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Link Papers from Research Page
                </button>
              </div>
            ) : (
              relatedPapers.map(paper => (
                <div key={paper.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{paper.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {paper.company} • {paper.publication_date ? new Date(paper.publication_date).getFullYear() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        paper.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                        paper.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {paper.company}
                      </span>
                      <button
                        onClick={() => removePaperFromJob(paper.id)}
                        className="text-red-600 hover:text-red-800 px-2 py-1 text-xs rounded"
                        title="Remove from job"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 line-clamp-3">{paper.abstract}</p>
                  
                  {/* Tags */}
                  {paper.tags && paper.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {paper.tags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    {paper.url && (
                      <a href={paper.url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline text-sm">
                        View Paper →
                      </a>
                    )}
                    {paper.arxiv_id && (
                      <a href={`https://arxiv.org/abs/${paper.arxiv_id}`} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline text-sm">
                        arXiv →
                      </a>
                    )}
                    {paper.github_url && (
                      <a href={paper.github_url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline text-sm">
                        GitHub →
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Interview Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            {interviewResources.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <p className="text-gray-500 mb-4">No interview resources added yet</p>
                <button
                  onClick={() => router.push('/jobs')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Add Resources from Jobs Page
                </button>
              </div>
            ) : (
              interviewResources.map(resource => (
                <div key={resource.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{resource.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          resource.resource_type === 'preparation' ? 'bg-blue-100 text-blue-700' :
                          resource.resource_type === 'question' ? 'bg-purple-100 text-purple-700' :
                          resource.resource_type === 'experience' ? 'bg-green-100 text-green-700' :
                          resource.resource_type === 'note' ? 'bg-gray-100 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {resource.resource_type}
                        </span>
                      </div>
                      {resource.url && (
                        <p className="text-sm text-blue-600 mb-2">
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {resource.url}
                          </a>
                        </p>
                      )}
                      <p className="text-gray-700 mb-3">{resource.content}</p>
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {resource.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeInterviewResource(resource.id)}
                      className="text-red-600 hover:text-red-800 px-2 py-1 text-xs rounded"
                      title="Remove resource"
                    >
                      🗑️
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Added on {new Date(resource.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  )
}