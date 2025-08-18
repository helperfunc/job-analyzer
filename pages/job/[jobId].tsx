import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import JobThoughts from '../../components/JobThoughts'

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

interface JobResource {
  id: string
  job_id?: string
  user_id: string
  title: string
  url?: string
  resource_type: 'course' | 'book' | 'video' | 'article' | 'tool' | 'preparation' | 'question' | 'experience' | 'note' | 'other'
  description?: string
  content?: string
  tags?: string[]
  created_at: string
  updated_at?: string
  jobs?: {
    id: string
    title: string
    company: string
  }
}

export default function JobDetail() {
  const router = useRouter()
  const { jobId, company, index } = router.query
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [relatedPapers, setRelatedPapers] = useState<Paper[]>([])
  const [jobResources, setJobResources] = useState<JobResource[]>([])
  const [allJobResources, setAllJobResources] = useState<JobResource[]>([])
  const [activeTab, setActiveTab] = useState<'info' | 'papers' | 'resources'>('info')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [allPapers, setAllPapers] = useState<Paper[]>([])
  const [showAddPaperModal, setShowAddPaperModal] = useState(false)
  const [showAddResourceModal, setShowAddResourceModal] = useState(false)
  const [showLinkResourceModal, setShowLinkResourceModal] = useState(false)
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    resource_type: 'note' as JobResource['resource_type'],
    description: '',
    content: '',
    tags: [] as string[]
  })
  const [paperSearchFilter, setPaperSearchFilter] = useState({
    search: '',
    company: 'all'
  })

  // Show toast notification
  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  useEffect(() => {
    if (!router.isReady) return
    if (!jobId) {
      console.error('No jobId provided')
      setError('No job ID provided')
      setLoading(false)
      return
    }
    
    console.log('Loading job details for:', jobId)
    fetchJobDetails()
    fetchRelatedPapers()
    fetchJobResources()
    fetchAllPapers()
    fetchAllJobResources()
  }, [router.isReady, jobId])

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


  const fetchAllPapers = async () => {
    try {
      const response = await fetch('/api/research/papers?limit=500')
      const data = await response.json()
      if (data.success) {
        setAllPapers(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch papers:', err)
    }
  }

  const fetchJobResources = async () => {
    if (!jobId) return
    try {
      const response = await fetch(`/api/resource-job-relations?job_id=${jobId}`)
      const data = await response.json()
      if (data.success) {
        setJobResources(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch job resources:', err)
    }
  }

  const fetchAllJobResources = async () => {
    try {
      const response = await fetch('/api/job-resources?user_id=default')
      const data = await response.json()
      if (data.success) {
        setAllJobResources(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch all job resources:', err)
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

  const deletePaper = async (paperId: string, paperTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete the paper "${paperTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/research/delete-paper', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: paperId })
      })
      const data = await response.json()
      
      if (data.success) {
        // Remove from both related papers and all papers lists
        setRelatedPapers(prev => prev.filter(paper => paper.id !== paperId))
        setAllPapers(prev => prev.filter(paper => paper.id !== paperId))
        showToastMessage('🗑️ Paper deleted permanently')
      } else {
        console.error('Failed to delete paper:', data.error)
        showToastMessage('❌ Failed to delete paper')
      }
    } catch (err) {
      console.error('Failed to delete paper:', err)
      showToastMessage('❌ Network error')
    }
  }

  const deleteCurrentJob = async () => {
    if (!job) return

    if (!confirm(`Are you sure you want to permanently delete the job "${job.title}"? This action cannot be undone and will remove all associated resources and papers.`)) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        showToastMessage(`🗑️ Job "${job.title}" deleted successfully`)
        // Redirect to jobs page after deletion
        router.push('/jobs')
      } else {
        console.error('Failed to delete job:', data.error)
        showToastMessage('❌ Failed to delete job')
      }
    } catch (err) {
      console.error('Failed to delete job:', err)
      showToastMessage('❌ Network error occurred')
    }
  }

  const linkResourceToJob = async (resourceId: string) => {
    try {
      const response = await fetch('/api/resource-job-relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          resource_id: resourceId,
          resource_type: 'job_resources'
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh both job resources and available resources
        fetchJobResources()
        fetchAllJobResources()
        showToastMessage(`✅ Resource linked to job successfully`)
      } else if (response.status === 409) {
        showToastMessage('⚠️ Resource is already linked to this job')
      } else {
        console.error('Failed to link resource:', data.error)
        showToastMessage('❌ Failed to link resource')
      }
    } catch (err) {
      console.error('Failed to link resource to job:', err)
      showToastMessage('❌ Network error')
    }
  }

  const unlinkResourceFromJob = async (resourceId: string) => {
    try {
      const response = await fetch(`/api/resource-job-relations?job_id=${jobId}&resource_id=${resourceId}&resource_type=job_resources`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh both job resources and available resources
        fetchJobResources()
        fetchAllJobResources()
        showToastMessage(`✅ Resource unlinked from job successfully`)
      } else {
        console.error('Failed to unlink resource:', data.error)
        showToastMessage('❌ Failed to unlink resource')
      }
    } catch (err) {
      console.error('Failed to unlink resource from job:', err)
      showToastMessage('❌ Network error')
    }
  }


  const addPaperToJob = async (paperId: string) => {
    try {
      const response = await fetch('/api/research/relate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId,
          relevance_score: 0.8,
          relevance_reason: 'Manually linked from job detail page'
        })
      })
      const data = await response.json()
      
      if (data.success) {
        const linkedPaper = allPapers.find(p => p.id === paperId)
        if (linkedPaper) {
          setRelatedPapers(prev => [...prev, linkedPaper])
          showToastMessage(`✅ Paper "${linkedPaper.title}" linked to job`)
        }
      } else {
        console.error('Failed to link paper:', data.error)
        showToastMessage('❌ Failed to link paper')
      }
    } catch (err) {
      console.error('Failed to link paper to job:', err)
      showToastMessage('❌ Network error')
    }
  }

  const addJobResource = async () => {
    if (!jobId || !newResource.title.trim()) return

    try {
      const response = await fetch('/api/job-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'default',
          title: newResource.title,
          url: newResource.url || null,
          resource_type: newResource.resource_type,
          description: newResource.description || newResource.content,
          tags: newResource.tags
        })
      })

      const data = await response.json()

      if (data.success) {
        // Link the newly created resource to this job
        await linkResourceToJob(data.data.id)
        setShowAddResourceModal(false)
        setNewResource({
          title: '',
          url: '',
          resource_type: 'note',
          description: '',
          content: '',
          tags: []
        })
      } else {
        console.error('Failed to add resource:', data.error)
        showToastMessage(`❌ Failed to add resource`)
      }
    } catch (err) {
      console.error('Failed to add job resource:', err)
      showToastMessage(`❌ Network error occurred`)
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
              <button
                onClick={deleteCurrentJob}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                title="Delete this job"
              >
                🗑️ Delete
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
            Job Resources ({jobResources.length})
          </button>
          <button
            onClick={() => setActiveTab('thoughts')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'thoughts'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Thoughts
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Related Papers ({relatedPapers.length})</h3>
              <button
                onClick={() => setShowAddPaperModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                + Add Paper
              </button>
            </div>
            {relatedPapers.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <p className="text-gray-500 mb-4">No papers linked to this job yet</p>
                <button
                  onClick={() => setShowAddPaperModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add First Paper
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
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        paper.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                        paper.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {paper.company}
                      </span>
                      <button
                        onClick={() => removePaperFromJob(paper.id)}
                        className="text-orange-600 hover:text-orange-800 px-2 py-1 text-xs rounded"
                        title="Remove from job"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => deletePaper(paper.id, paper.title)}
                        className="text-red-600 hover:text-red-800 px-2 py-1 text-xs rounded"
                        title="Delete paper permanently"
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

        {/* Job Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Job Resources ({jobResources.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddResourceModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  + Create Resource
                </button>
                <button
                  onClick={() => setShowLinkResourceModal(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                >
                  + Link Existing
                </button>
              </div>
            </div>
            {jobResources.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <p className="text-gray-500 mb-4">No resources linked to this job yet</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowAddResourceModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Create First Resource
                  </button>
                  <button
                    onClick={() => setShowLinkResourceModal(true)}
                    className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                  >
                    Link Existing Resource
                  </button>
                </div>
              </div>
            ) : (
              jobResources.map(resource => (
                <div key={resource.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{resource.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          resource.resource_type === 'course' ? 'bg-blue-100 text-blue-700' :
                          resource.resource_type === 'book' ? 'bg-purple-100 text-purple-700' :
                          resource.resource_type === 'video' ? 'bg-red-100 text-red-700' :
                          resource.resource_type === 'article' ? 'bg-green-100 text-green-700' :
                          resource.resource_type === 'tool' ? 'bg-yellow-100 text-yellow-700' :
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
                      {(resource.description || resource.content) && (
                        <p className="text-gray-700 mb-3">{resource.description || resource.content}</p>
                      )}
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {resource.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => unlinkResourceFromJob(resource.id)}
                      className="text-orange-600 hover:text-orange-800 px-2 py-1 text-xs rounded"
                      title="Unlink from job"
                    >
                      🔗
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

        {/* My Thoughts Tab */}
        {activeTab === 'thoughts' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <JobThoughts 
              jobId={jobId as string}
              onShowToast={showToastMessage}
            />
          </div>
        )}

        {/* Add Paper Modal */}
        {showAddPaperModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Paper to Job</h3>
                <button
                  onClick={() => {
                    setShowAddPaperModal(false)
                    setPaperSearchFilter({ search: '', company: 'all' })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Search and Filter Controls */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Papers</label>
                    <input
                      type="text"
                      placeholder="Search by title, authors, or abstract..."
                      value={paperSearchFilter.search}
                      onChange={(e) => setPaperSearchFilter({...paperSearchFilter, search: e.target.value})}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      value={paperSearchFilter.company}
                      onChange={(e) => setPaperSearchFilter({...paperSearchFilter, company: e.target.value})}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Companies</option>
                      <option value="OpenAI">OpenAI</option>
                      <option value="Anthropic">Anthropic</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Papers List */}
              <div className="overflow-y-auto max-h-[50vh]">
                <div className="grid gap-3">
                  {allPapers.filter(paper => {
                    // Filter out papers that are already linked to this job
                    if (relatedPapers.some(linkedPaper => linkedPaper.id === paper.id)) {
                      return false
                    }
                    
                    // Apply search filter
                    if (paperSearchFilter.search) {
                      const searchLower = paperSearchFilter.search.toLowerCase()
                      const matchesSearch = 
                        paper.title.toLowerCase().includes(searchLower) ||
                        paper.abstract?.toLowerCase().includes(searchLower) ||
                        paper.authors.some(author => author.toLowerCase().includes(searchLower))
                      if (!matchesSearch) return false
                    }
                    
                    // Apply company filter
                    if (paperSearchFilter.company !== 'all' && paper.company !== paperSearchFilter.company) {
                      return false
                    }
                    
                    return true
                  }).map(paper => (
                    <div
                      key={paper.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{paper.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {paper.authors.slice(0, 3).join(', ')}
                            {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {paper.company} • {paper.publication_date ? new Date(paper.publication_date).getFullYear() : 'N/A'}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            paper.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                            paper.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {paper.company}
                          </span>
                          <button
                            onClick={() => addPaperToJob(paper.id)}
                            className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                          >
                            Add Paper
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {paper.abstract}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {allPapers.filter(paper => {
                    if (relatedPapers.some(linkedPaper => linkedPaper.id === paper.id)) {
                      return false
                    }
                    if (paperSearchFilter.search) {
                      const searchLower = paperSearchFilter.search.toLowerCase()
                      const matchesSearch = 
                        paper.title.toLowerCase().includes(searchLower) ||
                        paper.abstract?.toLowerCase().includes(searchLower) ||
                        paper.authors.some(author => author.toLowerCase().includes(searchLower))
                      if (!matchesSearch) return false
                    }
                    if (paperSearchFilter.company !== 'all' && paper.company !== paperSearchFilter.company) {
                      return false
                    }
                    return true
                  }).length} available papers to add
                </div>
                <button
                  onClick={() => {
                    setShowAddPaperModal(false)
                    setPaperSearchFilter({ search: '', company: 'all' })
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Resource Modal */}
        {showAddResourceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New Resource</h3>
                <button
                  onClick={() => {
                    setShowAddResourceModal(false)
                    setNewResource({
                      title: '',
                      url: '',
                      resource_type: 'note',
                      description: '',
                      content: '',
                      tags: []
                    })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newResource.title}
                    onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                    placeholder="Resource title..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                  <select
                    value={newResource.resource_type}
                    onChange={(e) => setNewResource({...newResource, resource_type: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="note">Note</option>
                    <option value="course">Course</option>
                    <option value="book">Book</option>
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="tool">Tool</option>
                    <option value="preparation">Preparation Material</option>
                    <option value="question">Interview Questions</option>
                    <option value="experience">Experience/Tips</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL (optional)</label>
                  <input
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newResource.description}
                    onChange={(e) => setNewResource({...newResource, description: e.target.value, content: e.target.value})}
                    placeholder="Resource description, notes, or content..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newResource.tags.join(', ')}
                    onChange={(e) => setNewResource({...newResource, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                    placeholder="interview, preparation, technical..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={addJobResource}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    disabled={!newResource.title.trim()}
                  >
                    Create & Link Resource
                  </button>
                  <button
                    onClick={() => {
                      setShowAddResourceModal(false)
                      setNewResource({
                        title: '',
                        url: '',
                        resource_type: 'note',
                        description: '',
                        content: '',
                        tags: []
                      })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Resource Modal */}
        {showLinkResourceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Link Resource to Job</h3>
                <button
                  onClick={() => setShowLinkResourceModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Available Resources List */}
              <div className="overflow-y-auto max-h-[50vh]">
                <div className="grid gap-3">
                  {allJobResources.filter(resource => {
                    // Only show resources that are not already linked to this job
                    return !resource.job_id || resource.job_id !== jobId
                  }).map(resource => (
                    <div
                      key={resource.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{resource.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              resource.resource_type === 'course' ? 'bg-blue-100 text-blue-700' :
                              resource.resource_type === 'book' ? 'bg-purple-100 text-purple-700' :
                              resource.resource_type === 'video' ? 'bg-red-100 text-red-700' :
                              resource.resource_type === 'article' ? 'bg-green-100 text-green-700' :
                              resource.resource_type === 'tool' ? 'bg-yellow-100 text-yellow-700' :
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
                            <p className="text-sm text-blue-600 mb-1">
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {resource.url}
                              </a>
                            </p>
                          )}
                          {resource.description && (
                            <p className="text-sm text-gray-700">{resource.description}</p>
                          )}
                          {resource.jobs && (
                            <p className="text-xs text-gray-500 mt-1">
                              Currently linked to: {resource.jobs.company} - {resource.jobs.title}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => linkResourceToJob(resource.id)}
                            className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded"
                            disabled={resource.job_id === jobId}
                          >
                            Link to Job
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {allJobResources.filter(resource => !resource.job_id || resource.job_id !== jobId).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-2">No resources available to link.</p>
                      <p className="text-sm">Create resources in the Jobs page first.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {allJobResources.filter(resource => !resource.job_id || resource.job_id !== jobId).length} available resources
                </div>
                <button
                  onClick={() => setShowLinkResourceModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Done
                </button>
              </div>
            </div>
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