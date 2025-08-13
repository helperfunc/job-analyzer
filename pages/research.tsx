import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ResourcesTab from '../components/ResourcesTab'

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
  relatedJobs?: any[] // Jobs linked to this paper
}

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

interface JobPaperRelation {
  id: string
  job_id: string
  paper_id: string
  relevance_score: number
  relevance_reason: string
  paper: Paper
}

interface UserInsight {
  id: string
  job_id: string
  user_id: string
  insight_type: 'note' | 'resource' | 'experience'
  content: string
  resources: any[]
  created_at: string
  updated_at: string
}

export default function Research() {
  const router = useRouter()
  const { jobId } = router.query
  const [activeTab, setActiveTab] = useState<'papers' | 'insights' | 'gap' | 'resources'>('papers')
  const [papers, setPapers] = useState<Paper[]>([])
  const [relatedPapers, setRelatedPapers] = useState<JobPaperRelation[]>([])
  const [insights, setInsights] = useState<UserInsight[]>([])
  const [resources, setResources] = useState<JobResource[]>([])
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [jobs, setJobs] = useState<any[]>([])
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [showJobSelector, setShowJobSelector] = useState(false)
  const [selectedPaperId, setSelectedPaperId] = useState<string>('')
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsImporting, setJobsImporting] = useState(false)
  const [jobSearchFilter, setJobSearchFilter] = useState({
    search: '',
    company: 'all'
  })
  const [paperFilter, setPaperFilter] = useState({
    company: 'all',
    year: 'all',
    tag: 'all'
  })
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [papersPerPage] = useState(10)
  
  // 模拟用户ID，实际应该从认证系统获取
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'demo-user' : 'demo-user'

  // Show toast notification
  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  useEffect(() => {
    if (jobId) {
      fetchRelatedPapers()
      fetchInsights()
    } else {
      fetchAllPapers()
    }
    
    // Handle hash navigation for tabs
    const hash = window.location.hash
    if (hash === '#insights') setActiveTab('insights')
    else if (hash === '#gap') setActiveTab('gap')
    else if (hash === '#resources') setActiveTab('resources')
    else setActiveTab('papers')
  }, [jobId])

  const fetchAllPapers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/research/papers?limit=500')
      const data = await response.json()
      if (data.success) {
        // Fetch related jobs for each paper
        const papersWithJobs = await Promise.all(
          data.data.map(async (paper: Paper) => {
            try {
              const jobsResponse = await fetch(`/api/research/paper-jobs?paperId=${paper.id}`)
              const jobsData = await jobsResponse.json()
              return {
                ...paper,
                relatedJobs: jobsData.success ? jobsData.data : []
              }
            } catch {
              return { ...paper, relatedJobs: [] }
            }
          })
        )
        setPapers(papersWithJobs)
        // Check if using mock data
        if (data.message && data.message.includes('mock data')) {
          setIsUsingMockData(true)
        }
      }
    } catch (err) {
      setError('Failed to fetch papers')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedPapers = async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/research/papers/${jobId}`)
      const data = await response.json()
      if (data.success) {
        setRelatedPapers(data.data)
      }
    } catch (err) {
      setError('Failed to fetch related papers')
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    if (!jobId) return
    try {
      const response = await fetch(`/api/research/insights/${jobId}?user_id=${userId}`)
      const data = await response.json()
      if (data.success) {
        setInsights(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err)
    }
  }

  const addInsight = async (type: 'note' | 'resource' | 'experience', content: string) => {
    if (!jobId) return
    try {
      const response = await fetch('/api/research/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          user_id: userId,
          insight_type: type,
          content
        })
      })
      const data = await response.json()
      if (data.success) {
        fetchInsights()
      }
    } catch (err) {
      console.error('Failed to add insight:', err)
    }
  }

  const deletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return
    
    try {
      const response = await fetch(`/api/research/papers?id=${paperId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        fetchAllPapers() // Refresh the papers list
        alert('Paper deleted successfully')
      }
    } catch (err) {
      console.error('Failed to delete paper:', err)
      alert('Failed to delete paper')
    }
  }

  const scrapePapers = async (company: 'openai' | 'anthropic') => {
    setScraping(true)
    setError('')
    try {
      const response = await fetch('/api/research/scrape-papers-puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company })
      })
      const data = await response.json()
      if (data.success) {
        fetchAllPapers() // Refresh papers list
        alert(`Successfully scraped ${data.count} papers from ${company}`)
      } else {
        setError(data.error || 'Failed to scrape papers')
      }
    } catch (err) {
      setError('Failed to scrape papers')
    } finally {
      setScraping(false)
    }
  }

  const relatePaperToJob = async (paperId: string, jobId: string, retryCount = 0) => {
    const maxRetries = 2
    
    try {
      const response = await fetch('/api/research/relate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId,
          relevance_score: 0.8,
          relevance_reason: 'Manually linked by user'
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update the local state instead of refreshing everything
        setPapers(prevPapers => 
          prevPapers.map(paper => {
            if (paper.id === paperId) {
              // Find the job details to add
              const linkedJob = jobs.find(j => j.id === jobId)
              if (linkedJob) {
                showToastMessage(`✅ Paper linked to ${linkedJob.title}`)
                return {
                  ...paper,
                  relatedJobs: [...(paper.relatedJobs || []), linkedJob]
                }
              }
            }
            return paper
          })
        )
        
        // If we're on a job-specific page, update related papers too
        if (jobId === router.query.jobId) {
          fetchRelatedPapers()
        }
      } else {
        // Check if it's a foreign key constraint error (job not found)
        if (data.error?.includes('job_paper_relations_job_id_fkey') && retryCount < maxRetries) {
          console.log(`⚠️ Job not found in database, refreshing jobs and retrying... (attempt ${retryCount + 1}/${maxRetries + 1})`)
          // Refresh jobs and retry
          await fetchJobs()
          setTimeout(() => {
            relatePaperToJob(paperId, jobId, retryCount + 1)
          }, 1000)
        } else {
          console.error(`Failed to link paper: ${data.error || 'Unknown error'}`)
        }
      }
    } catch (err) {
      console.error('Failed to relate paper to job:', err)
      if (retryCount < maxRetries) {
        console.log(`⚠️ Network error, retrying... (attempt ${retryCount + 1}/${maxRetries + 1})`)
        setTimeout(() => {
          relatePaperToJob(paperId, jobId, retryCount + 1)
        }, 1000)
      } else {
        console.error('Network error: Failed to link paper to job')
      }
    }
  }

  const unrelatePaperFromJob = async (paperId: string, jobId: string) => {
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
        // Update the local state to remove the job from paper
        setPapers(prevPapers => 
          prevPapers.map(paper => {
            if (paper.id === paperId) {
              const removedJob = paper.relatedJobs?.find(job => job.id === jobId)
              if (removedJob) {
                showToastMessage(`🗑️ Removed from ${removedJob.title}`)
              }
              return {
                ...paper,
                relatedJobs: (paper.relatedJobs || []).filter(job => job.id !== jobId)
              }
            }
            return paper
          })
        )
      } else {
        console.error(`Failed to unlink paper: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to unrelate paper from job:', err)
    }
  }

  // Generate a UUID v4-like ID
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const fetchJobs = async (retryCount = 0) => {
    const maxRetries = 3
    const retryDelay = 2000 // 2 seconds
    
    try {
      setJobsLoading(true)
      console.log(`🔍 Fetching jobs (attempt ${retryCount + 1}/${maxRetries + 1})...`)
      
      // First try to fetch from database
      const dbResponse = await fetch('/api/jobs')
      const dbData = await dbResponse.json()
      
      if (dbData.success && dbData.jobs && dbData.jobs.length > 0) {
        // Use database jobs if available
        console.log(`✅ Found ${dbData.jobs.length} jobs in database`)
        setJobs(dbData.jobs)
        setJobsLoading(false)
        return
      }
      
      // If no jobs in database, check if we should retry (jobs might be importing)
      if (retryCount < maxRetries) {
        console.log(`⏳ No jobs in database yet, retrying in ${retryDelay/1000}s... (jobs might still be importing)`)
        setJobsImporting(true)
        setTimeout(() => {
          fetchJobs(retryCount + 1)
        }, retryDelay)
        return
      }
      
      // After all retries, fallback to summary data and try to import
      console.log('📋 Fallback: Generating jobs from summary data and importing...')
      setJobsImporting(true)
      const companies = ['openai', 'anthropic']
      const allJobs: any[] = []
      
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
                description_url: job.url || `https://${company}.com/careers`
              })
            })
          }
        } catch (err) {
          console.error(`Failed to fetch ${company} jobs:`, err)
        }
      }
      
      // Try to import these jobs to database for future use
      if (allJobs.length > 0) {
        try {
          console.log(`🔄 Importing ${allJobs.length} jobs to database...`)
          const importResponse = await fetch('/api/jobs/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobs: allJobs })
          })
          const importResult = await importResponse.json()
          if (importResult.success) {
            console.log(`✅ Successfully imported ${importResult.count} jobs to database`)
          }
        } catch (importErr) {
          console.log('⚠️ Failed to import jobs (non-critical):', importErr)
        }
      }
      
      setJobs(allJobs)
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setJobsLoading(false)
      setJobsImporting(false)
    }
  }

  const clearAllPapers = async () => {
    if (!confirm('Are you sure you want to delete ALL papers from the database? This action cannot be undone.')) {
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // If using mock data, just clear local state
      if (isUsingMockData) {
        setPapers([])
        setRelatedPapers([])
        alert('Cleared all papers from local storage (using mock data)')
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/research/clear-papers', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Clear papers response:', data)
      
      if (data.success) {
        setPapers([])
        setRelatedPapers([])
        alert(data.message || `Successfully deleted ${data.deletedCount || 0} papers from database`)
      } else {
        setError(data.error || 'Failed to clear papers')
        alert(`Error: ${data.error || 'Failed to clear papers'}`)
      }
    } catch (err) {
      console.error('Error clearing papers:', err)
      setError('Failed to clear papers')
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs() // This will now use the intelligent retry mechanism
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Research Center</h1>
        
        {/* Mock data notice */}
        {isUsingMockData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              📌 当前使用模拟数据展示。配置Supabase后可使用完整功能。
            </p>
          </div>
        )}

        {/* Jobs loading/importing status */}
        {(jobsLoading || jobsImporting) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-800">
                {jobsImporting 
                  ? '⏳ 职位数据导入中，请稍候... (防止并发冲突)'
                  : '🔍 正在加载职位数据...'
                }
              </p>
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="flex space-x-6 mb-8 border-b">
          <button
            onClick={() => setActiveTab('papers')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'papers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Papers & Research
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'insights'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Insights
          </button>
          <button
            onClick={() => setActiveTab('gap')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'gap'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Skill Gap Analysis
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Job Resources
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'papers' && (
              <PapersTab 
                papers={jobId ? relatedPapers.map(r => r.paper) : papers}
                jobId={jobId as string}
                onScrapePapers={scrapePapers}
                scraping={scraping}
                onRelatePaper={relatePaperToJob}
                onUnrelatePaper={unrelatePaperFromJob}
                jobs={jobs}
                onDeletePaper={deletePaper}
                onClearAllPapers={() => clearAllPapers()}
                onRefreshPapers={fetchAllPapers}
                onShowToast={showToastMessage}
                onAddPaper={(paper) => setPapers(prev => [paper, ...prev])}
              />
            )}
            
            {activeTab === 'insights' && (
              <InsightsTab 
                insights={insights}
                onAddInsight={addInsight}
                jobId={jobId as string}
              />
            )}
            
            {activeTab === 'gap' && (
              <GapAnalysisTab 
                jobId={jobId as string}
                userId={userId}
              />
            )}
            
            {activeTab === 'resources' && (
              <ResourcesTab 
                userId={userId}
              />
            )}
          </>
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

// Papers Tab Component
function PapersTab({ papers, jobId, onScrapePapers, scraping, onRelatePaper, onUnrelatePaper, jobs, onDeletePaper, onClearAllPapers, onRefreshPapers, onShowToast, onAddPaper }: { 
  papers: Paper[], 
  jobId?: string,
  onScrapePapers: (company: 'openai' | 'anthropic') => void,
  scraping: boolean,
  onRelatePaper: (paperId: string, jobId: string) => void,
  onUnrelatePaper: (paperId: string, jobId: string) => void,
  jobs: any[],
  onDeletePaper?: (paperId: string) => void,
  onClearAllPapers?: () => void,
  onRefreshPapers?: () => void,
  onShowToast?: (message: string) => void,
  onAddPaper?: (paper: Paper) => void
}) {
  const router = useRouter()
  const [showJobModal, setShowJobModal] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [filter, setFilter] = useState({
    company: 'all',
    year: 'all',
    tag: 'all',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [papersPerPage] = useState(10)
  const [jobSearchFilter, setJobSearchFilter] = useState({
    search: '',
    company: 'all'
  })
  const [showCreatePaperModal, setShowCreatePaperModal] = useState(false)
  const [newPaper, setNewPaper] = useState({
    title: '',
    authors: [] as string[],
    publication_date: '',
    abstract: '',
    url: '',
    arxiv_id: '',
    github_url: '',
    company: '',
    tags: [] as string[]
  })
  
  // Paper insights state
  const [showInsightsModal, setShowInsightsModal] = useState(false)
  const [selectedPaperForInsights, setSelectedPaperForInsights] = useState<Paper | null>(null)
  const [paperInsights, setPaperInsights] = useState<{[key: string]: any[]}>({})
  const [newInsight, setNewInsight] = useState({
    insight: '',
    insight_type: 'note'
  })

  // Generate a UUID v4-like ID
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const createPaper = async () => {
    if (!newPaper.title.trim() || !newPaper.abstract.trim() || !newPaper.url.trim()) {
      onShowToast?.('❌ Title, abstract, and URL are required')
      return
    }

    try {
      const paperData = {
        ...newPaper,
        id: generateUUID(),
        authors: newPaper.authors.filter(author => author.trim()),
        tags: newPaper.tags.filter(tag => tag.trim()),
        publication_date: newPaper.publication_date || new Date().toISOString().split('T')[0]
      }

      const response = await fetch('/api/research/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paperData)
      })

      const data = await response.json()

      if (data.success) {
        onShowToast?.(`✅ Paper "${paperData.title}" created successfully!`)
        setShowCreatePaperModal(false)
        setNewPaper({
          title: '',
          authors: [],
          publication_date: '',
          abstract: '',
          url: '',
          arxiv_id: '',
          github_url: '',
          company: '',
          tags: []
        })
        
        // Add the new paper to the local state for immediate display
        if (onAddPaper) {
          onAddPaper(data.data)
        } else {
          onRefreshPapers?.()
        }
      } else {
        console.error('Failed to create paper:', data.error)
        onShowToast?.(`❌ Failed to create paper`)
      }
    } catch (err) {
      console.error('Failed to create paper:', err)
      onShowToast?.(`❌ Network error occurred`)
    }
  }

  // Fetch insights for a specific paper
  const fetchPaperInsights = async (paperId: string) => {
    try {
      const response = await fetch(`/api/paper-insights?paper_id=${paperId}&user_id=default-user`)
      const data = await response.json()
      
      if (data.success) {
        setPaperInsights(prev => ({
          ...prev,
          [paperId]: data.data
        }))
      }
    } catch (error) {
      console.error('Error fetching paper insights:', error)
    }
  }

  // Create a new insight for a paper
  const createPaperInsight = async () => {
    if (!selectedPaperForInsights || !newInsight.insight.trim()) {
      onShowToast?.('❌ Insight content is required')
      return
    }

    try {
      const response = await fetch('/api/paper-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: selectedPaperForInsights.id,
          user_id: 'default-user',
          insight: newInsight.insight,
          insight_type: newInsight.insight_type
        })
      })

      const data = await response.json()

      if (data.success) {
        onShowToast?.('✅ Insight added successfully!')
        setNewInsight({ insight: '', insight_type: 'note' })
        
        // Update local state
        setPaperInsights(prev => ({
          ...prev,
          [selectedPaperForInsights.id]: [
            data.data,
            ...(prev[selectedPaperForInsights.id] || [])
          ]
        }))
      } else {
        onShowToast?.('❌ Failed to add insight')
      }
    } catch (error) {
      console.error('Error creating insight:', error)
      onShowToast?.('❌ Network error occurred')
    }
  }

  // Delete an insight
  const deletePaperInsight = async (insightId: string, paperId: string) => {
    if (!confirm('Are you sure you want to delete this insight?')) return

    try {
      const response = await fetch(`/api/paper-insights/${insightId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        onShowToast?.('✅ Insight deleted successfully!')
        
        // Update local state
        setPaperInsights(prev => ({
          ...prev,
          [paperId]: (prev[paperId] || []).filter(insight => insight.id !== insightId)
        }))
      } else {
        onShowToast?.('❌ Failed to delete insight')
      }
    } catch (error) {
      console.error('Error deleting insight:', error)
      onShowToast?.('❌ Network error occurred')
    }
  }

  // Load insights when opening the modal
  const openInsightsModal = (paper: Paper) => {
    setSelectedPaperForInsights(paper)
    setShowInsightsModal(true)
    fetchPaperInsights(paper.id)
  }

  // Filter papers based on current filter settings
  const filteredPapers = papers.filter(paper => {
    // Exclude "Research" category papers
    if (paper.company === 'Research') {
      return false
    }
    
    if (filter.company !== 'all' && paper.company.toLowerCase() !== filter.company.toLowerCase()) {
      return false
    }
    
    if (filter.year !== 'all') {
      const paperYear = paper.publication_date ? new Date(paper.publication_date).getFullYear().toString() : '2024'
      if (paperYear !== filter.year) return false
    }
    
    if (filter.tag !== 'all') {
      if (!paper.tags || !paper.tags.some(tag => tag.toLowerCase().includes(filter.tag.toLowerCase()))) {
        return false
      }
    }
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      return paper.title.toLowerCase().includes(searchLower) || 
             paper.abstract?.toLowerCase().includes(searchLower) ||
             paper.authors.some(author => author.toLowerCase().includes(searchLower))
    }
    
    return true
  })

  // Get unique values for filter options, excluding "Research" category
  const companies = [...new Set(papers.map(p => p.company))].filter(c => c !== 'Research')
  const years = [...new Set(papers.map(p => {
    return p.publication_date ? new Date(p.publication_date).getFullYear().toString() : '2024'
  }))].sort().reverse()
  const allTags = [...new Set(papers.flatMap(p => p.tags || []))].slice(0, 10)

  // Pagination logic
  const totalPages = Math.ceil(filteredPapers.length / papersPerPage)
  const indexOfLastPaper = currentPage * papersPerPage
  const indexOfFirstPaper = indexOfLastPaper - papersPerPage
  const currentPapers = filteredPapers.slice(indexOfFirstPaper, indexOfLastPaper)

  // Reset to first page when filters change
  const handleFilterChange = (newFilter: any) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }
  
  return (
    <div>
      {/* Controls Section */}
      <div className="mb-6 space-y-4">
        {/* Scrape buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowCreatePaperModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + Create Paper
          </button>
          <button
            onClick={() => onScrapePapers('openai')}
            disabled={scraping}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scraping ? 'Scraping...' : 'Fetch OpenAI Papers'}
          </button>
          <button
            onClick={() => onScrapePapers('anthropic')}
            disabled={scraping}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scraping ? 'Scraping...' : 'Fetch Anthropic Papers'}
          </button>
          {papers.length > 0 && onClearAllPapers && (
            <button
              onClick={onClearAllPapers}
              disabled={scraping}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All Papers
            </button>
          )}
        </div>

        {/* Filters */}
        {papers.length > 0 && (
          <div className="bg-white p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={filter.year}
                  onChange={(e) => handleFilterChange({...filter, year: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                <select
                  value={filter.tag}
                  onChange={(e) => handleFilterChange({...filter, tag: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search papers..."
                  value={filter.search}
                  onChange={(e) => handleFilterChange({...filter, search: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-3 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Showing {indexOfFirstPaper + 1}-{Math.min(indexOfLastPaper, filteredPapers.length)} of {filteredPapers.length} papers
                {filteredPapers.length !== papers.length && ` (filtered from ${papers.length})`}
              </span>
              <button
                onClick={() => handleFilterChange({company: 'all', year: 'all', tag: 'all', search: ''})}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid gap-4">
        {filteredPapers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            {papers.length === 0 ? (
              <>
                <p className="text-gray-500 mb-4">No papers found</p>
                <p className="text-sm text-gray-400">Click the buttons above to fetch papers from OpenAI or Anthropic</p>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-4">No papers match your filters</p>
                <p className="text-sm text-gray-400">Try adjusting your search criteria or clear filters</p>
              </>
            )}
          </div>
        ) : (
          currentPapers.map(paper => (
            <div key={paper.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold flex-1">{paper.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ml-4 ${
                  paper.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                  paper.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {paper.company}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {paper.authors.join(', ')} • {paper.publication_date ? new Date(paper.publication_date).getFullYear() : 'N/A'}
              </p>
              <p className="text-gray-700 mb-3 line-clamp-3">{paper.abstract}</p>
              
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
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => openInsightsModal(paper)}
                    className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded"
                  >
                    Add Insights ({paperInsights[paper.id]?.length || 0})
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPaper(paper)
                      setShowJobModal(true)
                    }}
                    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                  >
                    Link to Job
                  </button>
                  {onDeletePaper && (
                    <button
                      onClick={() => onDeletePaper(paper.id)}
                      className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
                    >
                      Delete Paper
                    </button>
                  )}
                </div>
              </div>
              
              {/* Related Jobs Section */}
              {paper.relatedJobs && paper.relatedJobs.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Linked to Jobs:</p>
                  <div className="grid gap-2">
                    {paper.relatedJobs.map((job: any) => (
                      <div key={job.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 
                              className="font-medium text-blue-600 hover:underline cursor-pointer"
                              onClick={() => window.open(`/job/${job.id}?company=${job.company.toLowerCase()}&index=0`, '_blank')}
                            >
                              {job.title}
                            </h4>
                            <p className="text-sm text-gray-600">{job.company} • {job.location || 'Remote'}</p>
                            {job.salary && (
                              <p className="text-sm text-green-600">{job.salary}</p>
                            )}
                          </div>
                          <button
                            onClick={() => onUnrelatePaper(paper.id, job.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Remove from this job"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onUnrelatePaper(paper.id, job.id)}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                          >
                            Delete from Job
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-3 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
      
      {/* Job Selection Modal */}
      {showJobModal && selectedPaper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Link "{selectedPaper.title}" to Jobs</h3>
              <button
                onClick={() => {
                  setShowJobModal(false)
                  setSelectedPaper(null)
                  setJobSearchFilter({ search: '', company: 'all' })
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Jobs</label>
                  <input
                    type="text"
                    placeholder="Search by title, company, or location..."
                    value={jobSearchFilter.search}
                    onChange={(e) => setJobSearchFilter({...jobSearchFilter, search: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    value={jobSearchFilter.company}
                    onChange={(e) => setJobSearchFilter({...jobSearchFilter, company: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Companies</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="Anthropic">Anthropic</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Jobs List */}
            <div className="overflow-y-auto max-h-[50vh]">
              <div className="grid gap-3">
                {jobs.filter(job => {
                  // Filter out jobs that are already linked to this paper
                  if (selectedPaper.relatedJobs?.some((relatedJob: any) => relatedJob.id === job.id)) {
                    return false
                  }
                  
                  // Apply search filter
                  if (jobSearchFilter.search) {
                    const searchLower = jobSearchFilter.search.toLowerCase()
                    const matchesSearch = 
                      job.title.toLowerCase().includes(searchLower) ||
                      job.company.toLowerCase().includes(searchLower) ||
                      (job.location && job.location.toLowerCase().includes(searchLower)) ||
                      (job.department && job.department.toLowerCase().includes(searchLower))
                    if (!matchesSearch) return false
                  }
                  
                  // Apply company filter
                  if (jobSearchFilter.company !== 'all' && job.company !== jobSearchFilter.company) {
                    return false
                  }
                  
                  return true
                }).map(job => (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => window.open(`/job/${job.id}?company=${job.company.toLowerCase()}&index=0`, '_blank')}
                      >
                        <div className="font-medium text-blue-600 hover:underline">{job.title}</div>
                        <div className="text-sm text-gray-600">{job.company} • {job.location || 'Remote'}</div>
                        {job.salary && (
                          <div className="text-sm text-green-600 mt-1">{job.salary}</div>
                        )}
                        {job.department && (
                          <div className="text-xs text-gray-500 mt-1">{job.department}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await onRelatePaper(selectedPaper.id, job.id)
                          // Update the selected paper locally to reflect the new relationship
                          const linkedJob = jobs.find(j => j.id === job.id)
                          if (linkedJob) {
                            setSelectedPaper(prev => prev ? {
                              ...prev,
                              relatedJobs: [...(prev.relatedJobs || []), linkedJob]
                            } : null)
                            onShowToast?.(`✅ Added to ${linkedJob.title}`)
                          }
                        }}
                        className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                      >
                        Add to Job
                      </button>
                      
                      <button
                        onClick={() => window.open(`/job/${job.id}?company=${job.company.toLowerCase()}&index=0`, '_blank')}
                        className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded"
                      >
                        View Job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {jobs.filter(job => {
                  // Filter out jobs that are already linked to this paper
                  if (selectedPaper.relatedJobs?.some((relatedJob: any) => relatedJob.id === job.id)) {
                    return false
                  }
                  
                  if (jobSearchFilter.search) {
                    const searchLower = jobSearchFilter.search.toLowerCase()
                    const matchesSearch = 
                      job.title.toLowerCase().includes(searchLower) ||
                      job.company.toLowerCase().includes(searchLower) ||
                      (job.location && job.location.toLowerCase().includes(searchLower))
                    if (!matchesSearch) return false
                  }
                  if (jobSearchFilter.company !== 'all' && job.company !== jobSearchFilter.company) {
                    return false
                  }
                  return true
                }).length} available jobs to link
              </div>
              <button
                onClick={() => {
                  setShowJobModal(false)
                  setSelectedPaper(null)
                  setJobSearchFilter({ search: '', company: 'all' })
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Paper Modal */}
      {showCreatePaperModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Paper</h3>
              <button
                onClick={() => {
                  setShowCreatePaperModal(false)
                  setNewPaper({
                    title: '',
                    authors: [],
                    publication_date: '',
                    abstract: '',
                    url: '',
                    arxiv_id: '',
                    github_url: '',
                    company: '',
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper Title *</label>
                <input
                  type="text"
                  value={newPaper.title}
                  onChange={(e) => setNewPaper({...newPaper, title: e.target.value})}
                  placeholder="e.g. Attention Is All You Need"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authors (comma-separated)</label>
                <input
                  type="text"
                  value={newPaper.authors.join(', ')}
                  onChange={(e) => setNewPaper({...newPaper, authors: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="e.g. John Doe, Jane Smith"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                  <input
                    type="text"
                    value={newPaper.company}
                    onChange={(e) => setNewPaper({...newPaper, company: e.target.value})}
                    placeholder="e.g. OpenAI, Anthropic, Google"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date</label>
                  <input
                    type="date"
                    value={newPaper.publication_date}
                    onChange={(e) => setNewPaper({...newPaper, publication_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper URL *</label>
                <input
                  type="url"
                  value={newPaper.url}
                  onChange={(e) => setNewPaper({...newPaper, url: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">arXiv ID</label>
                  <input
                    type="text"
                    value={newPaper.arxiv_id}
                    onChange={(e) => setNewPaper({...newPaper, arxiv_id: e.target.value})}
                    placeholder="e.g. 1706.03762"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={newPaper.github_url}
                    onChange={(e) => setNewPaper({...newPaper, github_url: e.target.value})}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Abstract *</label>
                <textarea
                  value={newPaper.abstract}
                  onChange={(e) => setNewPaper({...newPaper, abstract: e.target.value})}
                  placeholder="Paper abstract and summary..."
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newPaper.tags.join(', ')}
                  onChange={(e) => setNewPaper({...newPaper, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="e.g. machine learning, transformer, attention"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createPaper}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  disabled={!newPaper.title.trim() || !newPaper.abstract.trim() || !newPaper.url.trim()}
                >
                  Create Paper
                </button>
                <button
                  onClick={() => {
                    setShowCreatePaperModal(false)
                    setNewPaper({
                      title: '',
                      authors: [],
                      publication_date: '',
                      abstract: '',
                      url: '',
                      arxiv_id: '',
                      github_url: '',
                      company: '',
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

      {/* Paper Insights Modal */}
      {showInsightsModal && selectedPaperForInsights && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Personal Insights</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    "{selectedPaperForInsights.title}"
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowInsightsModal(false)
                    setSelectedPaperForInsights(null)
                    setNewInsight({ insight: '', insight_type: 'note' })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Add New Insight Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="text-md font-semibold mb-3">Add New Insight</h4>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insight Type</label>
                    <select
                      value={newInsight.insight_type}
                      onChange={(e) => setNewInsight({...newInsight, insight_type: e.target.value})}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="note">Personal Note</option>
                      <option value="analysis">Analysis</option>
                      <option value="relevance">Relevance to Career</option>
                      <option value="application">Practical Application</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Insight</label>
                    <textarea
                      value={newInsight.insight}
                      onChange={(e) => setNewInsight({...newInsight, insight: e.target.value})}
                      placeholder="Share your thoughts about this paper..."
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={createPaperInsight}
                    disabled={!newInsight.insight.trim()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Add Insight
                  </button>
                </div>
              </div>

              {/* Existing Insights */}
              <div className="max-h-96 overflow-y-auto">
                <h4 className="text-md font-semibold mb-3">Your Insights ({paperInsights[selectedPaperForInsights.id]?.length || 0})</h4>
                {paperInsights[selectedPaperForInsights.id]?.length === 0 || !paperInsights[selectedPaperForInsights.id] ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No insights yet. Add your first insight above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paperInsights[selectedPaperForInsights.id]?.map((insight: any) => (
                      <div key={insight.id} className="bg-white border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${{
                            'note': 'bg-blue-100 text-blue-700',
                            'analysis': 'bg-green-100 text-green-700',
                            'relevance': 'bg-yellow-100 text-yellow-700',
                            'application': 'bg-purple-100 text-purple-700',
                            'other': 'bg-gray-100 text-gray-700'
                          }[insight.insight_type] || 'bg-gray-100 text-gray-700'}`}>
                            {insight.insight_type}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(insight.created_at).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => deletePaperInsight(insight.id, selectedPaperForInsights.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-700">{insight.insight}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Insights Tab Component
function InsightsTab({ insights, onAddInsight, jobId }: { 
  insights: UserInsight[], 
  onAddInsight: (type: 'note' | 'resource' | 'experience', content: string) => void,
  jobId?: string 
}) {
  const [newInsight, setNewInsight] = useState('')
  const [insightType, setInsightType] = useState<'note' | 'resource' | 'experience'>('note')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newInsight.trim()) {
      onAddInsight(insightType, newInsight)
      setNewInsight('')
    }
  }

  if (!jobId) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">个人见解功能</h3>
          <p className="text-gray-500 mb-4">记录你对特定职位的想法、经验和学习心得</p>
          <div className="text-left text-sm text-gray-600 space-y-2">
            <p><strong>Note:</strong> 记录一般性笔记和想法</p>
            <p><strong>Resource:</strong> 保存有用的资源链接</p>
            <p><strong>Experience:</strong> 分享相关经验</p>
          </div>
          <p className="text-sm text-gray-400 mt-4">从职位详情页面进入可以为特定职位添加见解</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insight Type
          </label>
          <select
            value={insightType}
            onChange={(e) => setInsightType(e.target.value as any)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="note">Note</option>
            <option value="resource">Resource</option>
            <option value="experience">Experience</option>
          </select>
        </div>
        <div className="mb-4">
          <textarea
            value={newInsight}
            onChange={(e) => setNewInsight(e.target.value)}
            placeholder="Share your insights, resources, or experiences..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Insight
        </button>
      </form>

      <div className="grid gap-4">
        {insights.map(insight => (
          <div key={insight.id} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                insight.insight_type === 'note' ? 'bg-gray-100 text-gray-700' :
                insight.insight_type === 'resource' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {insight.insight_type}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(insight.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{insight.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Gap Analysis Tab Component
function GapAnalysisTab({ jobId, userId }: { jobId?: string, userId: string }) {
  const [currentSkills, setCurrentSkills] = useState<string[]>([])
  const [gapAnalysis, setGapAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const analyzeGap = async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const response = await fetch('/api/research/analyze-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          user_id: userId,
          current_skills: currentSkills
        })
      })
      const data = await response.json()
      if (data.success) {
        setGapAnalysis(data.data)
      }
    } catch (err) {
      console.error('Failed to analyze gap:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!jobId) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <div className="max-w-lg mx-auto">
          <h3 className="text-lg font-semibold mb-2">技能差距分析</h3>
          <p className="text-gray-500 mb-4">AI分析你的技能与职位要求的差距</p>
          <div className="text-left text-sm text-gray-600 space-y-2">
            <p><strong>1. 输入你的技能</strong>: 用逗号分隔，如"Python, React, Machine Learning"</p>
            <p><strong>2. AI分析差距</strong>: 系统会比较你的技能与职位要求</p>
            <p><strong>3. 获得建议</strong>: 了解需要学习的技能和优先级</p>
            <p><strong>4. 制定计划</strong>: 根据分析结果制定学习计划</p>
          </div>
          <p className="text-sm text-gray-400 mt-4">从职位详情页面进入可以分析特定职位的技能差距</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Current Skills</h3>
        <textarea
          value={currentSkills.join(', ')}
          onChange={(e) => setCurrentSkills(e.target.value.split(',').map(s => s.trim()))}
          placeholder="Enter your skills separated by commas (e.g., Python, Machine Learning, React)"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
          rows={3}
        />
        <button
          onClick={analyzeGap}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze Skill Gap'}
        </button>
      </div>

      {gapAnalysis && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Gap Analysis Results</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700">Match Percentage</h4>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${gapAnalysis.gap_analysis?.skill_match_percentage || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {gapAnalysis.gap_analysis?.skill_match_percentage || 0}% match
              </p>
            </div>
            
            {gapAnalysis.gap_analysis?.missing_skills && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Missing Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {gapAnalysis.gap_analysis.missing_skills.map((skill: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}