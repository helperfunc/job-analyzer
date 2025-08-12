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
  created_at: string
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
  linkedJobs?: Job[] // Jobs linked to this paper
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

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({
    search: '',
    company: 'all',
    department: 'all',
    salaryRange: 'all'
  })
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showPaperModal, setShowPaperModal] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    resource_type: 'note' as 'preparation' | 'question' | 'experience' | 'note' | 'other',
    content: '',
    tags: [] as string[]
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [jobsPerPage] = useState(12)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [paperSearchFilter, setPaperSearchFilter] = useState({
    search: '',
    company: 'all'
  })
  const [linkedPapers, setLinkedPapers] = useState<Paper[]>([])
  const [modalTab, setModalTab] = useState<'link' | 'linked'>('link')

  // Generate a UUID v4-like ID
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Show toast notification
  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  useEffect(() => {
    fetchJobs()
    fetchPapers()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      // First try to fetch from database
      const dbResponse = await fetch('/api/jobs')
      const dbData = await dbResponse.json()
      
      if (dbData.success && dbData.jobs && dbData.jobs.length > 0) {
        setJobs(dbData.jobs)
        setLoading(false)
        return
      }
      
      // Fallback to summary data and import
      console.log('Fallback: Generating jobs from summary data...')
      const companies = ['openai', 'anthropic']
      const allJobs: Job[] = []
      
      for (const company of companies) {
        try {
          const response = await fetch(`/api/get-summary?company=${company}`)
          const data = await response.json()
          if (data.summary && data.summary.highest_paying_jobs) {
            data.summary.highest_paying_jobs.forEach((job: any, index: number) => {
              allJobs.push({
                ...job,
                id: generateUUID(),
                company: company.charAt(0).toUpperCase() + company.slice(1),
                description_url: job.url || `https://${company}.com/careers`,
                created_at: new Date().toISOString()
              })
            })
          }
        } catch (err) {
          console.error(`Failed to fetch ${company} jobs:`, err)
        }
      }
      
      // Try to import these jobs to database
      if (allJobs.length > 0) {
        try {
          await fetch('/api/jobs/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobs: allJobs })
          })
        } catch (importErr) {
          console.log('Failed to import jobs (non-critical):', importErr)
        }
      }
      
      setJobs(allJobs)
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
      setError('Failed to fetch jobs')
    } finally {
      setLoading(false)
    }
  }

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/research/papers?limit=500')
      const data = await response.json()
      if (data.success) {
        // Fetch linked jobs for each paper
        const papersWithJobs = await Promise.all(
          data.data.map(async (paper: Paper) => {
            try {
              const jobsResponse = await fetch(`/api/research/paper-jobs?paperId=${paper.id}`)
              const jobsData = await jobsResponse.json()
              return {
                ...paper,
                linkedJobs: jobsData.success ? jobsData.data : []
              }
            } catch {
              return { ...paper, linkedJobs: [] }
            }
          })
        )
        setPapers(papersWithJobs)
      }
    } catch (err) {
      console.error('Failed to fetch papers:', err)
    }
  }

  const fetchLinkedPapers = async (jobId: string) => {
    try {
      const response = await fetch(`/api/research/papers/${jobId}`)
      const data = await response.json()
      if (data.success) {
        setLinkedPapers(data.data.map((relation: any) => relation.paper))
      } else {
        setLinkedPapers([])
      }
    } catch (err) {
      console.error('Failed to fetch linked papers:', err)
      setLinkedPapers([])
    }
  }

  const unlinkPaperFromJob = async (jobId: string, paperId: string) => {
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
        // Update both linked papers list and papers state
        setLinkedPapers(prev => prev.filter(paper => paper.id !== paperId))
        setPapers(prevPapers => 
          prevPapers.map(paper => {
            if (paper.id === paperId) {
              return {
                ...paper,
                linkedJobs: (paper.linkedJobs || []).filter(job => job.id !== jobId)
              }
            }
            return paper
          })
        )
        
        const paper = linkedPapers.find(p => p.id === paperId)
        if (paper) {
          showToastMessage(`🗑️ Paper "${paper.title}" unlinked from job`)
        }
      } else {
        console.error('Failed to unlink paper:', data.error)
        showToastMessage('❌ Failed to unlink paper')
      }
    } catch (err) {
      console.error('Failed to unlink paper from job:', err)
      showToastMessage('❌ Network error occurred')
    }
  }

  const linkJobToPaper = async (jobId: string, paperId: string) => {
    try {
      const response = await fetch('/api/research/relate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId,
          relevance_score: 0.8,
          relevance_reason: 'Manually linked from Jobs page'
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update the local state instead of closing modal
        const linkedJob = jobs.find(j => j.id === jobId)
        const linkedPaper = papers.find(p => p.id === paperId)
        
        if (linkedJob && linkedPaper) {
          // Update papers state to include this job as linked
          setPapers(prevPapers => 
            prevPapers.map(paper => {
              if (paper.id === paperId) {
                return {
                  ...paper,
                  linkedJobs: [...(paper.linkedJobs || []), linkedJob]
                }
              }
              return paper
            })
          )
          // Update linked papers list if currently viewing linked tab
          setLinkedPapers(prev => [...prev, linkedPaper])
          showToastMessage(`✅ ${linkedJob.title} linked to ${linkedPaper.title}`)
        }
      } else {
        console.error(`Failed to link: ${data.error || 'Unknown error'}`)
        showToastMessage(`❌ Failed to link job to paper`)
      }
    } catch (err) {
      console.error('Failed to link job to paper:', err)
      showToastMessage(`❌ Network error occurred`)
    }
  }

  const addInterviewResource = async () => {
    if (!selectedJob || !newResource.title.trim()) return

    try {
      // For now, we'll store this locally since we don't have interview_resources API yet
      const resource: InterviewResource = {
        id: generateUUID(),
        job_id: selectedJob.id,
        title: newResource.title,
        url: newResource.url,
        resource_type: newResource.resource_type,
        content: newResource.content,
        tags: newResource.tags,
        created_at: new Date().toISOString()
      }

      // Store in localStorage for now
      const existingResources = JSON.parse(localStorage.getItem('interview_resources') || '[]')
      existingResources.push(resource)
      localStorage.setItem('interview_resources', JSON.stringify(existingResources))

      showToastMessage(`✅ Interview resource "${resource.title}" added successfully!`)
      setShowResourceModal(false)
      setNewResource({
        title: '',
        url: '',
        resource_type: 'note',
        content: '',
        tags: []
      })
    } catch (err) {
      console.error('Failed to add interview resource:', err)
      showToastMessage(`❌ Failed to add interview resource`)
    }
  }

  // Filter jobs based on current filter settings
  const filteredJobs = jobs.filter(job => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      const matchesSearch = 
        job.title.toLowerCase().includes(searchLower) ||
        job.company.toLowerCase().includes(searchLower) ||
        (job.location && job.location.toLowerCase().includes(searchLower)) ||
        (job.department && job.department.toLowerCase().includes(searchLower)) ||
        (job.skills && job.skills.some(skill => skill.toLowerCase().includes(searchLower)))
      if (!matchesSearch) return false
    }
    
    if (filter.company !== 'all' && job.company !== filter.company) {
      return false
    }
    
    if (filter.department !== 'all' && job.department !== filter.department) {
      return false
    }
    
    return true
  })

  // Get unique values for filters
  const companies = [...new Set(jobs.map(job => job.company))]
  const departments = [...new Set(jobs.map(job => job.department).filter(Boolean))]

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage)
  const indexOfLastJob = currentPage * jobsPerPage
  const indexOfFirstJob = indexOfLastJob - jobsPerPage
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob)

  const handleFilterChange = (newFilter: any) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Jobs Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/research')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Research
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Home
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search jobs..."
                value={filter.search}
                onChange={(e) => handleFilterChange({...filter, search: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={filter.company}
                onChange={(e) => handleFilterChange({...filter, company: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filter.department}
                onChange={(e) => handleFilterChange({...filter, department: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => handleFilterChange({search: '', company: 'all', department: 'all', salaryRange: 'all'})}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Showing {indexOfFirstJob + 1}-{Math.min(indexOfLastJob, filteredJobs.length)} of {filteredJobs.length} jobs
              {filteredJobs.length !== jobs.length && ` (filtered from ${jobs.length})`}
            </span>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentJobs.map(job => (
            <div key={job.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 
                    className="text-lg font-semibold text-blue-600 hover:underline cursor-pointer line-clamp-2"
                    onClick={() => window.open(`/job/${job.id}?company=${job.company.toLowerCase()}&index=0`, '_blank')}
                  >
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                  <p className="text-sm text-gray-500">{job.location || 'Remote'}</p>
                  {job.department && (
                    <p className="text-xs text-gray-500 mt-1">{job.department}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  job.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                  job.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {job.company}
                </span>
              </div>

              {job.salary && (
                <p className="text-sm text-green-600 font-medium mb-3">{job.salary}</p>
              )}

              {job.skills && job.skills.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{job.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedJob(job)
                    setShowPaperModal(true)
                    setModalTab('link')
                    fetchLinkedPapers(job.id)
                  }}
                  className="flex-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded"
                >
                  Link to Paper
                </button>
                <button
                  onClick={() => {
                    setSelectedJob(job)
                    setShowResourceModal(true)
                  }}
                  className="flex-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded"
                >
                  Add Resource
                </button>
              </div>
              
              <button
                onClick={() => window.open(`/job/${job.id}?company=${job.company.toLowerCase()}&index=0`, '_blank')}
                className="w-full mt-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded"
              >
                View Details
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Link to Paper Modal */}
        {showPaperModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Papers for "{selectedJob.title}"</h3>
                <button
                  onClick={() => {
                    setShowPaperModal(false)
                    setSelectedJob(null)
                    setPaperSearchFilter({ search: '', company: 'all' })
                    setLinkedPapers([])
                    setModalTab('link')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-4 mb-4 border-b">
                <button
                  onClick={() => setModalTab('link')}
                  className={`pb-2 px-1 font-medium transition-colors ${
                    modalTab === 'link'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Link New Papers
                </button>
                <button
                  onClick={() => setModalTab('linked')}
                  className={`pb-2 px-1 font-medium transition-colors ${
                    modalTab === 'linked'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Linked Papers ({linkedPapers.length})
                </button>
              </div>

              {/* Link New Papers Tab */}
              {modalTab === 'link' && (
                <>
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
                </>
              )}

              {modalTab === 'link' && (
                <>
                  {/* Papers List */}
                  <div className="overflow-y-auto max-h-[50vh]">
                    <div className="grid gap-3">
                      {papers.filter(paper => {
                        // Filter out papers that are already linked to this job
                        if (paper.linkedJobs?.some((linkedJob: Job) => linkedJob.id === selectedJob.id)) {
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
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              paper.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                              paper.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {paper.company}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {paper.abstract}
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              {paper.linkedJobs && paper.linkedJobs.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Already linked to:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {paper.linkedJobs.slice(0, 2).map((linkedJob: Job) => (
                                      <span key={linkedJob.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        {linkedJob.title}
                                      </span>
                                    ))}
                                    {paper.linkedJobs.length > 2 && (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        +{paper.linkedJobs.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => linkJobToPaper(selectedJob.id, paper.id)}
                              className="ml-4 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded flex-shrink-0"
                            >
                              Link Job
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Linked Papers Tab */}
              {modalTab === 'linked' && (
                <div className="overflow-y-auto max-h-[50vh]">
                  {linkedPapers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No papers linked to this job yet</p>
                      <button
                        onClick={() => setModalTab('link')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Link Papers
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {linkedPapers.map(paper => (
                        <div key={paper.id} className="border rounded-lg p-4 bg-blue-50">
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
                                onClick={() => unlinkPaperFromJob(selectedJob.id, paper.id)}
                                className="text-red-600 hover:text-red-800 px-2 py-1 text-xs rounded"
                                title="Unlink paper"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {paper.abstract}
                          </div>

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
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {modalTab === 'link' ? (
                    `${papers.filter(paper => {
                      // Filter out papers that are already linked to this job
                      if (paper.linkedJobs?.some((linkedJob: Job) => linkedJob.id === selectedJob.id)) {
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
                    }).length} available papers to link`
                  ) : (
                    `${linkedPapers.length} papers linked to this job`
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowPaperModal(false)
                    setSelectedJob(null)
                    setPaperSearchFilter({ search: '', company: 'all' })
                    setLinkedPapers([])
                    setModalTab('link')
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Interview Resource Modal */}
        {showResourceModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Interview Resource for "{selectedJob.title}"</h3>
                <button
                  onClick={() => {
                    setShowResourceModal(false)
                    setSelectedJob(null)
                    setNewResource({
                      title: '',
                      url: '',
                      resource_type: 'note',
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={newResource.content}
                    onChange={(e) => setNewResource({...newResource, content: e.target.value})}
                    placeholder="Resource content, notes, or description..."
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
                    onClick={addInterviewResource}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Add Resource
                  </button>
                  <button
                    onClick={() => {
                      setShowResourceModal(false)
                      setSelectedJob(null)
                      setNewResource({
                        title: '',
                        url: '',
                        resource_type: 'note',
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