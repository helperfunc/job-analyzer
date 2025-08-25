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

// Check for scraping state on initial load (client-side only)
const getInitialScrapingState = () => {
  if (typeof window === 'undefined') return false
  
  try {
    const scrapingState = localStorage.getItem('research-scraping-in-progress')
    if (scrapingState) {
      const { isActive, timestamp } = JSON.parse(scrapingState)
      const now = Date.now()
      const ageSeconds = Math.round((now - timestamp) / 1000)
      const isStillActive = isActive && (now - timestamp) < 10 * 60 * 1000
      console.log(`🎯 Initial research scraping state check: active=${isActive}, age=${ageSeconds}s, stillActive=${isStillActive}`)
      return isStillActive
    } else {
      console.log('🎯 No research scraping state found in localStorage')
    }
  } catch (error) {
    console.error('Error checking initial research scraping state:', error)
  }
  return false
}

export default function Research() {
  const router = useRouter()
  const { jobId } = router.query
  const [papers, setPapers] = useState<Paper[]>([])
  const [relatedPapers, setRelatedPapers] = useState<JobPaperRelation[]>([])
  const [loading, setLoading] = useState(false)
  const [scraping, _setScraping] = useState(false) // Start with false to avoid hydration issues
  const [hydrated, setHydrated] = useState(false) // Track hydration state
  const [mounted, setMounted] = useState(false) // Track if component is mounted
  const [error, setError] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [jobs, setJobs] = useState<any[]>([])
  
  // Wrapper to log scraping state changes
  const setScraping = (newState: boolean) => {
    console.log(`🔄 setScraping: ${scraping} -> ${newState}`)
    _setScraping(newState)
  }

  // Show toast notification
  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  // Track mounting to avoid SSR issues
  useEffect(() => {
    setMounted(true)
    setHydrated(true)
    
    // Check for scraping state after hydration is complete
    let hasChecked = false // Prevent multiple checks
    
    const checkScrapingState = () => {
      if (hasChecked) {
        console.log('⚠️ Skipping duplicate hydration check')
        return
      }
      hasChecked = true
      
      console.log('🔍 Checking research scraping state in hydration...')
      const scrapingState = localStorage.getItem('research-scraping-in-progress')
      console.log('🔍 Raw localStorage value:', scrapingState)
      
      if (scrapingState) {
        try {
          const { isActive, timestamp } = JSON.parse(scrapingState)
          const now = Date.now()
          const isStillActive = isActive && (now - timestamp) < 10 * 60 * 1000
          const ageSeconds = Math.round((now - timestamp) / 1000)
          console.log(`🔍 Hydration research scraping check: active=${isActive}, age=${ageSeconds}s, stillActive=${isStillActive}`)
          
          if (isStillActive) {
            console.log('🔧 Setting research scraping state after hydration!')
            setScraping(true)
            // Start polling for completion since scraping was already in progress
            setTimeout(() => startPollingForCompletion(), 1000) // Small delay to ensure state is set
            // Note: Don't set loading=true for scraping state, that's for data loading
          } else {
            console.log('🔍 Research scraping state expired or inactive')
          }
        } catch (error) {
          console.error('Error in hydration research scraping check:', error)
        }
      } else {
        console.log('🎯 No research scraping state found after hydration')
      }
    }
    
    // Run the check after a brief delay to ensure hydration is complete
    setTimeout(checkScrapingState, 100)
  }, [])

  // Debug effect to monitor scraping state changes
  useEffect(() => {
    console.log(`📊 Research scraping state changed: ${scraping}`)
  }, [scraping])

  useEffect(() => {
    if (!mounted) return
    
    if (jobId) {
      fetchRelatedPapers()
    } else {
      fetchAllPapers()
    }
  }, [jobId, mounted])

  const fetchAllPapers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/research/papers-simple?limit=500')
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
    console.log(`🚀 Starting paper scraping for ${company}`)
    setScraping(true)
    setError('')
    
    // Save scraping state to localStorage
    const scrapingState = {
      isActive: true,
      timestamp: Date.now(),
      company: company
    }
    localStorage.setItem('research-scraping-in-progress', JSON.stringify(scrapingState))
    console.log(`💾 Saved research scraping state:`, scrapingState)
    
    try {
      // Use different endpoint for DeepMind
      const endpoint = company === 'deepmind' 
        ? '/api/scrape-deepmind'
        : '/api/research/scrape-papers-puppeteer'
      
      const body = company === 'deepmind'
        ? { type: 'papers', pages: 5 }
        : { company }
      
      console.log(`📡 Making API call to ${endpoint} for ${company} papers...`)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      console.log(`📡 API response status: ${response.status}`)
      const data = await response.json()
      console.log(`📡 API response data:`, data)
      
      // Check if this is a "started" response (background scraping) or "completed" response
      if (data.success && data.status === 'started') {
        console.log('✅ Background paper scraping started')
        setError('')
        showToastMessage(`🔄 Started scraping ${company} papers in background...`)
        
        // Start polling for completion
        startPollingForCompletion()
        
      } else if (data.success && (data.count !== undefined || data.data)) {
        // This is a completed response (sync mode or DeepMind response)
        const count = data.count || (data.data ? data.data.length : 0)
        console.log('✅ Paper scraping completed successfully, clearing state')
        showToastMessage(`✅ Successfully scraped ${count} ${company} papers`)
        setScraping(false)
        localStorage.removeItem('research-scraping-in-progress')
        console.log('🗑️ Removed research scraping state (completed)')
        
        // Refresh the papers list
        if (jobId) {
          fetchRelatedPapers()
        } else {
          fetchAllPapers()
        }
      } else {
        throw new Error(data.error || 'Failed to scrape papers')
      }
    } catch (err) {
      console.error('❌ Error scraping papers:', err)
      setError('Network error while scraping')
      showToastMessage('❌ Network error while scraping')
      setScraping(false)
      localStorage.removeItem('research-scraping-in-progress')
      console.log('🗑️ Removed research scraping state (error)')
    }
  }

  const startPollingForCompletion = () => {
    console.log('🔄 Starting research polling for completion...')
    let pollCount = 0
    let initialPaperCount = papers.length
    let hasDetectedNewData = false
    
    const pollInterval = setInterval(async () => {
      pollCount++
      console.log(`🔄 Research poll #${pollCount}: Checking for new papers...`)
      
      try {
        // Fetch current papers count
        const response = await fetch('/api/research/papers-simple?limit=1')
        const data = await response.json()
        const currentPaperCount = data.total || data.data?.length || 0
        
        console.log(`📊 Research poll #${pollCount}: Paper count ${initialPaperCount} -> ${currentPaperCount}`)
        
        if (currentPaperCount > initialPaperCount) {
          if (!hasDetectedNewData) {
            hasDetectedNewData = true
            console.log(`📊 New research data detected! Count changed from ${initialPaperCount} to ${currentPaperCount}`)
          }
          
          // Wait at least 30 seconds after first detecting new data to ensure scraping is complete
          const waitedEnoughAfterDetection = pollCount >= 3 // 30 seconds minimum wait
          
          if (hasDetectedNewData && waitedEnoughAfterDetection) {
            console.log('✅ Research scraping detected as complete!')
            clearInterval(pollInterval)
            
            // Clear scraping state
            setScraping(false)
            localStorage.removeItem('research-scraping-in-progress')
            console.log('🗑️ Polling cleared research scraping state')
            
            // Refresh the papers list
            console.log('🔄 Refreshing papers list after scraping completion...')
            if (jobId) {
              await fetchRelatedPapers()
            } else {
              await fetchAllPapers()
            }
            
            showToastMessage('✅ Research scraping completed!')
          }
        } else if (hasDetectedNewData && pollCount >= 12) {
          // If we previously detected data but count hasn't increased for 2 minutes, assume completion
          console.log('✅ Research scraping appears complete (no new data for 2+ minutes)')
          clearInterval(pollInterval)
          
          // Clear scraping state
          setScraping(false)
          localStorage.removeItem('research-scraping-in-progress')
          console.log('🗑️ Polling cleared research scraping state (timeout)')
          
          // Refresh the papers list
          console.log('🔄 Refreshing papers list after timeout completion...')
          if (jobId) {
            await fetchRelatedPapers()
          } else {
            await fetchAllPapers()
          }
          
          showToastMessage('✅ Research scraping completed!')
        }
        
        // Stop polling after reasonable time (10 minutes)
        if (pollCount >= 60) {
          console.log('⏰ Research polling timeout reached, stopping...')
          clearInterval(pollInterval)
          setScraping(false)
          localStorage.removeItem('research-scraping-in-progress')
          showToastMessage('⏰ Research scraping timeout - check manually')
        }
      } catch (pollError) {
        console.error('❌ Research polling error:', pollError)
        // Don't stop polling for network errors, continue trying
      }
    }, 10000) // Poll every 10 seconds
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

  const clearScrapingState = () => {
    setScraping(false)
    localStorage.removeItem('research-scraping-in-progress')
    console.log('🗑️ Manually cleared research scraping state')
    showToastMessage('🗑️ Research scraping state cleared')
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
            hydrated={hydrated}
            onRelatePaper={relatePaperToJob}
            onUnrelatePaper={unrelatePaperFromJob}
            jobs={jobs}
            onDeletePaper={deletePaper}
            onClearAllPapers={() => clearAllPapers()}
            onRefreshPapers={fetchAllPapers}
            onShowToast={showToastMessage}
            onAddPaper={(paper) => setPapers(prev => [...prev, paper])}
            onClearScrapingState={clearScrapingState}
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