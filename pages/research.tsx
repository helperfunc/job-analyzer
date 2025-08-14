import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

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
  relatedJobs?: any[]
}

interface JobPaperRelation {
  id: string
  job_id: string
  paper_id: string
  relevance_score: number
  relevance_reason: string
  paper: Paper
}

export default function Research() {
  const router = useRouter()
  const { jobId } = router.query
  const [papers, setPapers] = useState<Paper[]>([])
  const [relatedPapers, setRelatedPapers] = useState<JobPaperRelation[]>([])
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [jobs, setJobs] = useState<any[]>([])

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
    } else {
      fetchAllPapers()
    }
  }, [jobId])

  const fetchAllPapers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/research/papers?limit=500')
      const data = await response.json()
      if (data.success) {
        setPapers(data.data)
        console.log(`Loaded ${data.data.length} papers`)
      } else {
        setError('Failed to load papers')
        setPapers([])
      }
    } catch (err) {
      console.error('Failed to fetch papers:', err)
      setError('Network error')
      setPapers([])
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
        console.log(`Loaded ${data.data.length} papers for job ${jobId}`)
      } else {
        setRelatedPapers([])
      }
    } catch (err) {
      console.error('Failed to fetch related papers:', err)
      setRelatedPapers([])
    } finally {
      setLoading(false)
    }
  }

  const scrapePapers = async (company: string) => {
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
        showToastMessage(`✅ Successfully scraped ${data.count} papers`)
        // Refresh the papers list
        if (jobId) {
          fetchRelatedPapers()
        } else {
          fetchAllPapers()
        }
      } else {
        setError(data.error || 'Failed to scrape papers')
        showToastMessage('❌ Failed to scrape papers')
      }
    } catch (err) {
      console.error('Error scraping papers:', err)
      setError('Network error while scraping')
      showToastMessage('❌ Network error while scraping')
    } finally {
      setScraping(false)
    }
  }

  const deletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return
    
    try {
      const response = await fetch('/api/research/delete-paper', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: paperId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        showToastMessage('🗑️ Paper deleted successfully')
        // Remove from local state
        setPapers(prev => prev.filter(paper => paper.id !== paperId))
        setRelatedPapers(prev => prev.filter(relation => relation.paper.id !== paperId))
      } else {
        showToastMessage('❌ Failed to delete paper')
      }
    } catch (err) {
      console.error('Error deleting paper:', err)
      showToastMessage('❌ Network error while deleting')
    }
  }

  const clearAllPapers = async () => {
    if (!confirm('Are you sure you want to clear all papers? This action cannot be undone.')) return
    
    try {
      const response = await fetch('/api/research/clear-papers', {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        showToastMessage(`🗑️ Cleared ${data.deletedCount} papers`)
        setPapers([])
        setRelatedPapers([])
      } else {
        showToastMessage('❌ Failed to clear papers')
      }
    } catch (err) {
      console.error('Error clearing papers:', err)
      showToastMessage('❌ Network error while clearing')
    }
  }

  const relatePaperToJob = async (paperId: string, jobId: string) => {
    try {
      const response = await fetch('/api/research/relate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId,
          relevance_score: 0.8,
          relevance_reason: 'Manually linked from research page'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        showToastMessage('🔗 Paper linked to job successfully')
        // Refresh related papers if viewing a specific job
        if (jobId === router.query.jobId) {
          fetchRelatedPapers()
        }
      } else {
        showToastMessage('❌ Failed to link paper to job')
      }
    } catch (err) {
      console.error('Error linking paper to job:', err)
      showToastMessage('❌ Network error while linking')
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
        showToastMessage('🔗 Paper unlinked from job successfully')
        // Remove from related papers if viewing specific job
        if (jobId === router.query.jobId) {
          setRelatedPapers(prev => prev.filter(relation => relation.paper.id !== paperId))
        }
      } else {
        showToastMessage('❌ Failed to unlink paper from job')
      }
    } catch (err) {
      console.error('Error unlinking paper from job:', err)
      showToastMessage('❌ Network error while unlinking')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {jobId ? 'Job-Related Papers' : 'Research Center'}
            </h1>
            <p className="text-gray-600 mt-2">
              {jobId 
                ? 'Papers specifically related to this job position' 
                : 'Discover and manage research papers from AI companies'
              }
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:underline"
            >
              ← Back
            </button>
            {!jobId && (
              <button
                onClick={() => router.push('/jobs')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                View Jobs
              </button>
            )}
          </div>
        </div>

        {/* Papers & Research */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 border-b-2 border-blue-600 pb-3 inline-block">
            Papers & Research
          </h2>
        </div>

        {/* Papers Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
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
            onAddPaper={(paper) => setPapers(prev => [...prev, paper])}
          />
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

// Import PapersTab component (this would normally be in a separate file)
import PapersTab from '../components/PapersTab'