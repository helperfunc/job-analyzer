import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { formatSalary } from '../utils/formatSalary'

interface JobSummary {
  title: string
  salary?: string
  salary_min?: number
  salary_max?: number
  skills: string[]
  location: string
  department: string
  description?: string
  url?: string
}

interface ScrapeResult {
  success: boolean
  message: string
  company?: string
  filepath: string
  summary: {
    total_jobs: number
    jobs_with_salary: number
    highest_paying_jobs: JobSummary[]
    most_common_skills: { skill: string; count: number }[]
  }
}

// Check for scraping state on initial load (client-side only)
const getInitialScrapingState = () => {
  if (typeof window === 'undefined') return false
  
  try {
    const scrapingState = localStorage.getItem('scraping-in-progress')
    if (scrapingState) {
      const { isActive, timestamp } = JSON.parse(scrapingState)
      const now = Date.now()
      const ageSeconds = Math.round((now - timestamp) / 1000)
      const isStillActive = isActive && (now - timestamp) < 10 * 60 * 1000
      console.log(`🎯 Initial scraping state check: active=${isActive}, age=${ageSeconds}s, stillActive=${isStillActive}`)
      return isStillActive
    } else {
      console.log('🎯 No scraping state found in localStorage')
    }
  } catch (error) {
    console.error('Error checking initial scraping state:', error)
  }
  return false
}

export default function Home() {
  const router = useRouter()
  const [url, setUrl] = useState('https://openai.com/careers/search/')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true) // New state for initial load
  const [scrapingInProgress, _setScrapingInProgress] = useState(false) // Start with false to avoid hydration issues
  const [hydrated, setHydrated] = useState(false) // Track hydration state
  
  // Wrapper to log scraping state changes
  const setScrapingInProgress = (newState: boolean) => {
    console.log(`🔄 setScrapingInProgress: ${scrapingInProgress} -> ${newState}`, new Error().stack?.split('\n')[2]?.trim())
    _setScrapingInProgress(newState)
  }
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false) // Track if component is mounted
  const [jobIdMap, setJobIdMap] = useState<Record<string, string>>({}) // Map job keys to UUIDs
  const [navigating, setNavigating] = useState(false) // Track navigation state
  const isApiCallInProgress = useRef(false) // Prevent duplicate API calls
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null) // For polling scraping status

  // Generate a UUID v4-like ID
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Get or create a UUID for a job
  const getJobId = (company: string, index: number): string => {
    const key = `${company}-${index}`
    if (!jobIdMap[key]) {
      const newId = generateUUID()
      setJobIdMap(prev => ({ ...prev, [key]: newId }))
      return newId
    }
    return jobIdMap[key]
  }

  // Poll scraping status to detect when it's complete
  const pollScrapingStatus = () => {
    if (pollingIntervalRef.current) return // Already polling
    
    console.log('🔄 Starting scraping status polling...')
    let pollCount = 0
    const maxPolls = 200 // Stop polling after 16+ minutes (200 * 5 seconds) - enough for full scraping
    
    // Get the scraping start timestamp
    let scrapingStartTime = Date.now()
    const scrapingState = localStorage.getItem('scraping-in-progress')
    if (scrapingState) {
      try {
        const { timestamp } = JSON.parse(scrapingState)
        scrapingStartTime = timestamp
      } catch (error) {
        console.error('Error parsing scraping timestamp:', error)
      }
    }
    
    // Track initial data count to detect new data
    let initialDataCount = 0
    let hasDetectedNewData = false
    
    pollingIntervalRef.current = setInterval(async () => {
      pollCount++
      console.log(`📊 Polling attempt ${pollCount}...`)
      
      // Double-check we still have scraping state
      const currentScrapingState = localStorage.getItem('scraping-in-progress')
      if (!currentScrapingState) {
        console.log('🚫 Scraping state lost during polling, stopping...')
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        setLoading(false)
        setScrapingInProgress(false)
        return
      }
      
      try {
        const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
        
        // First, check the real scraping status from server
        const statusRes = await fetch(`/api/scraping-status?company=${currentCompany}&_t=${Date.now()}`)
        let scrapingStillActive = false
        
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          scrapingStillActive = statusData.isActive
          
          if (scrapingStillActive) {
            const durationMinutes = Math.round(statusData.duration / (60 * 1000))
            console.log(`📊 Server confirms scraping is active (${durationMinutes} minutes running)`)
          } else {
            console.log(`📊 Server confirms scraping is NOT active`)
          }
        }
        
        // If server says scraping is not active, check for results
        if (!scrapingStillActive) {
          const res = await fetch(`/api/get-summary?company=${currentCompany}&_t=${Date.now()}`)
          
          if (res.ok) {
            const data = await res.json()
            const currentDataCount = data.summary?.total_jobs || 0
            
            // On first poll, remember the initial data count
            if (pollCount === 1) {
              initialDataCount = currentDataCount
              console.log(`📊 Initial data count: ${initialDataCount}`)
            }
            
            if (currentDataCount > 0) {
              const dataCountChanged = currentDataCount !== initialDataCount
              
              if (dataCountChanged) {
                hasDetectedNewData = true
                console.log(`📊 New data detected! Count changed from ${initialDataCount} to ${currentDataCount}`)
              }
              
              // If server says not active AND we have data, scraping is complete
              console.log('✅ Scraping detected as complete! (Server status + data found)')
              setResult(data)
              setLoading(false)
              setScrapingInProgress(false)
              localStorage.removeItem('scraping-in-progress')
              
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }
              return
            } else {
              console.log(`📊 No data found yet, but server says scraping is not active (poll ${pollCount}/${maxPolls})`)
            }
          }
        } else {
          console.log(`📊 Scraping still active on server, continuing to wait... (poll ${pollCount}/${maxPolls})`)
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          console.log('⏰ Polling timeout reached, stopping...')
          setLoading(false)
          setScrapingInProgress(false)
          localStorage.removeItem('scraping-in-progress')
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      } catch (err) {
        console.error('Error polling scraping status:', err)
      }
    }, 5000) // Poll every 5 seconds
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Auto-import jobs to database when result is loaded
  const autoImportJobs = async (resultData: ScrapeResult) => {
    // Only auto-import if we don't have any data in the database yet
    if (!resultData || !resultData.summary || !resultData.summary.highest_paying_jobs) {
      return
    }
    
    try {
      // Check if we already have jobs in database
      const dbCheckResponse = await fetch('/api/jobs')
      const dbCheckData = await dbCheckResponse.json()
      
      if (dbCheckData.success && dbCheckData.jobs && dbCheckData.jobs.length > 0) {
        console.log('📋 Database already contains jobs, skipping auto-import')
        return
      }
      
      console.log('🔄 Database is empty, auto-importing jobs...')
      
      const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
      const jobs = resultData.summary.highest_paying_jobs.map((job, index) => ({
        id: getJobId(currentCompany, index),
        title: job.title,
        company: currentCompany.charAt(0).toUpperCase() + currentCompany.slice(1),
        location: job.location,
        department: job.department,
        salary: job.salary,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        skills: job.skills || [],
        description: job.description,
        url: job.url
      }))

      const importResponse = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs })
      })

      const importResult = await importResponse.json()
      console.log(`📊 Import result: ${importResult.message}`)
      if (importResult.count > 0) {
        console.log(`✅ Auto-imported ${importResult.count} new jobs to database`)
      }
    } catch (err) {
      console.log('⚠️ Auto-import failed (non-critical):', err)
    }
  }

  // Track mounting to avoid SSR issues
  useEffect(() => {
    setMounted(true)
    setHydrated(true)
    
    // Check for scraping state after hydration is complete
    const checkScrapingState = () => {
      const scrapingState = localStorage.getItem('scraping-in-progress')
      if (scrapingState) {
        try {
          const { isActive, timestamp } = JSON.parse(scrapingState)
          const now = Date.now()
          const isStillActive = isActive && (now - timestamp) < 10 * 60 * 1000
          const ageSeconds = Math.round((now - timestamp) / 1000)
          console.log(`🔍 Hydration scraping check: active=${isActive}, age=${ageSeconds}s, stillActive=${isStillActive}`)
          
          if (isStillActive) {
            console.log('🔧 Setting scraping state after hydration!')
            setScrapingInProgress(true)
            setLoading(true)
            setInitialLoading(false)
            
            // Start polling after setting state
            setTimeout(() => {
              console.log('🔄 Starting post-hydration polling...')
              pollScrapingStatus()
            }, 500)
          }
        } catch (error) {
          console.error('Error in hydration scraping check:', error)
        }
      } else {
        console.log('🎯 No scraping state found after hydration')
      }
    }
    
    // Run the check after a brief delay to ensure hydration is complete
    setTimeout(checkScrapingState, 100)
  }, [])

  // Update URL from scraping state if needed
  useEffect(() => {
    if (!mounted || !scrapingInProgress) return

    // Get the URL from scraping state
    const scrapingState = localStorage.getItem('scraping-in-progress')
    if (scrapingState) {
      try {
        const { url: scrapingUrl } = JSON.parse(scrapingState)
        if (scrapingUrl && scrapingUrl !== url) {
          console.log('📌 Restoring URL from scraping state:', scrapingUrl)
          setUrl(scrapingUrl)
        }
      } catch (error) {
        console.error('Error parsing scraping URL:', error)
      }
    }
  }, [mounted, scrapingInProgress])

  // Handle router events for navigation loading
  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== router.asPath) {
        setNavigating(true)
      }
    }
    
    const handleComplete = () => {
      setNavigating(false)
    }

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router])

  // Reload data when page gains focus (user returns to tab/window)
  useEffect(() => {
    const handleFocus = () => {
      // Don't reload data if scraping is in progress
      if (mounted && !result && !scrapingInProgress && !loading) {
        const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
        loadCompanyData(url)
      }
    }

    window.addEventListener('focus', handleFocus)
    
    // Also handle visibility change
    const handleVisibilityChange = () => {
      // Don't reload data if scraping is in progress
      if (!document.hidden && mounted && !result && !scrapingInProgress && !loading) {
        const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
        loadCompanyData(url)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [mounted, result, url, scrapingInProgress, loading])

  // Load latest results when component is mounted or when returning to page
  useEffect(() => {
    if (!mounted) return
    
    // Double check scraping state before loading data
    const scrapingState = localStorage.getItem('scraping-in-progress')
    let isScrapingActive = false
    if (scrapingState) {
      try {
        const { isActive, timestamp } = JSON.parse(scrapingState)
        const now = Date.now()
        isScrapingActive = isActive && (now - timestamp) < 10 * 60 * 1000
      } catch (error) {
        console.error('Error checking scraping state in loadData:', error)
      }
    }
    
    // Don't load data if scraping is active
    if (scrapingInProgress || isScrapingActive) {
      console.log('🚫 Skipping data load - scraping is active')
      return
    }
    
    const loadData = async () => {
      // Check localStorage first
      const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
      const cachedData = localStorage.getItem(`${currentCompany}-jobs-analysis-result`)
      
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData)
          setResult(data)
          setInitialLoading(false)
          return
        } catch (e) {
          console.error('Failed to parse cached data:', e)
        }
      }
      
      // If no cached data or parse failed, load from API
      setInitialLoading(true)
      setResult(null)
      
      try {
        const res = await fetch(`/api/get-summary?company=${currentCompany}&_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        
        if (res.ok) {
          const data = await res.json()
          if (data.summary?.total_jobs > 0) {
            console.log(`🔍 Loaded ${currentCompany} data:`, data.summary?.total_jobs, 'jobs')
            setResult(data)
            localStorage.setItem(`${currentCompany}-jobs-analysis-result`, JSON.stringify(data))
          } else {
            console.log(`📋 No ${currentCompany} data available (this is normal if scraping is in progress)`)
            setResult(null)
          }
        } else {
          console.error('Failed to load summary:', res.status)
          setResult(null)
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setResult(null)
      } finally {
        setInitialLoading(false)
      }
    }
    
    // Always load data when component mounts or when URL changes (unless scraping)
    loadData()
  }, [mounted, url, scrapingInProgress])

  const scrapeJobs = async () => {
    if (!url || loading || isApiCallInProgress.current || scrapingInProgress) return // Prevent duplicate calls when already loading

    isApiCallInProgress.current = true
    setLoading(true)
    setScrapingInProgress(true)
    setError('')
    setResult(null)
    
    // Save scraping state to localStorage
    localStorage.setItem('scraping-in-progress', JSON.stringify({
      isActive: true,
      timestamp: Date.now(),
      url: url
    }))
    
    // Clear saved results when starting new analysis
    localStorage.removeItem('openai-jobs-analysis-result')

    try {
      const res = await fetch('/api/scrape-with-puppeteer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!res.ok) {
        throw new Error('Scraping failed')
      }

      const data = await res.json()
      
      // Check if this is a "started" response (background scraping) or "completed" response
      if (data.success && data.status === 'started') {
        console.log('✅ Background scraping started, beginning polling...')
        setError('')
        
        // Start polling to detect completion
        setTimeout(() => {
          if (scrapingInProgress) {
            console.log('🔄 Starting polling for background scraping...')
            pollScrapingStatus()
          }
        }, 2000) // Wait 2 seconds before starting polling
        
      } else if (data.success && data.summary) {
        // This is a completed response (legacy sync mode)
        console.log('✅ Scraping completed successfully, clearing state')
        setResult(data)
        setScrapingInProgress(false)
        localStorage.removeItem('scraping-in-progress')
        localStorage.setItem('openai-jobs-analysis-result', JSON.stringify(data))
      } else {
        throw new Error(data.error || 'Scraping failed')
      }
    } catch (err) {
      console.log('❌ Scraping API call failed')
      setError(err instanceof Error ? err.message : 'Scraping failed, please retry')
      setScrapingInProgress(false)
      localStorage.removeItem('scraping-in-progress')
    } finally {
      setLoading(false)
      isApiCallInProgress.current = false
    }
  }


  const clearResults = async () => {
    const confirmed = confirm('⚠️ Are you sure you want to clear all results and job data from the database?\n\nThis will:\n- Clear current display results\n- Delete all job records from database\n- Clear local cache\n\nThis operation cannot be undone!')
    
    if (!confirmed) return

    try {
      setLoading(true)
      
      // Clear database
      const response = await fetch('/api/jobs/clear-all', {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Clear UI state
        setResult(null)
        setError('')
        
        // Clear localStorage
        localStorage.removeItem('openai-jobs-analysis-result')
        localStorage.removeItem('anthropic-jobs-analysis-result')
        
        alert(`✅ ${data.message}`)
      } else {
        alert(`❌ 清除数据库失败: ${data.error}`)
      }
    } catch (error) {
      console.error('Error clearing results:', error)
      alert('❌ 清除数据库时发生网络错误')
    } finally {
      setLoading(false)
    }
  }

  // Load data for specific company when user clicks company buttons
  const loadCompanyData = async (companyUrl: string) => {
    if (loading || scrapingInProgress) return // Prevent calls when already loading or scraping
    
    setLoading(true)
    setError('')
    
    const currentCompany = companyUrl.includes('anthropic.com') ? 'anthropic' : 'openai'
    
    try {
      const res = await fetch(`/api/get-summary?company=${currentCompany}&_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (!res.ok) {
        throw new Error('Failed to get statistics')
      }

      const data = await res.json()
      if (data.summary?.total_jobs > 0) {
        console.log(`🔍 Loaded ${currentCompany} data:`, data.summary?.total_jobs, 'jobs from ${data.dataSource}')
        setResult(data)
        localStorage.setItem(`${currentCompany}-jobs-analysis-result`, JSON.stringify(data))
      } else {
        console.log(`📋 No ${currentCompany} data available in database or files`)
        setResult(null)
        // Clear localStorage if no data available
        localStorage.removeItem(`${currentCompany}-jobs-analysis-result`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get statistics, please retry')
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    await loadCompanyData(url)
  }

  const navigateWithLoading = (path: string) => {
    setNavigating(true)
    router.push(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Loading Overlay */}
      {navigating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">Loading page...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          AI Company Job Analyzer
        </h1>
        <p className="text-gray-600 mb-8">
          Quickly analyze all positions at AI companies, find the highest-paying tech roles, supports OpenAI and Anthropic comparison
        </p>

        <div className="space-y-4 mb-8">
          <input
            type="url"
            placeholder="Enter company careers page URL (supports OpenAI/Anthropic)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          
          {/* Quick company selection */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                const newUrl = 'https://openai.com/careers/search/'
                setUrl(newUrl)
                loadCompanyData(newUrl)
              }}
              disabled={!hydrated || loading || scrapingInProgress}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                url.includes('openai.com') 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              OpenAI
            </button>
            <button
              onClick={() => {
                const newUrl = 'https://www.anthropic.com/jobs'
                setUrl(newUrl)
                loadCompanyData(newUrl)
              }}
              disabled={!hydrated || loading || scrapingInProgress}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                url.includes('anthropic.com') 
                  ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Anthropic
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={scrapeJobs}
              disabled={!hydrated || loading || !url || scrapingInProgress}
              className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {!hydrated ? 'Loading...' : (loading || scrapingInProgress ? 'Analyzing...' : 'Quick Job Analysis')}
            </button>
            {result && (
              <>
                <button
                  onClick={clearResults}
                  disabled={!hydrated || loading || scrapingInProgress}
                  className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Clear display results and all job data from database"
                >
                  {loading ? '🗑️ Clearing...' : '🗑️ Clear All Data'}
                </button>
                <button
                  onClick={() => navigateWithLoading('/jobs')}
                  disabled={navigating}
                  className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {navigating ? '⏳ Loading...' : '📋 Jobs'}
                </button>
                <button
                  onClick={() => navigateWithLoading('/research')}
                  disabled={navigating}
                  className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {navigating ? '⏳ Loading...' : '🔬 Research'}
                </button>
                <button
                  onClick={() => navigateWithLoading('/resources')}
                  disabled={navigating}
                  className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {navigating ? '⏳ Loading...' : '📚 Resources'}
                </button>
                <button
                  onClick={() => navigateWithLoading('/compare-v2')}
                  disabled={navigating}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {navigating ? '⏳ Loading...' : '🔥 Comparison'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {scrapingInProgress && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Scraping is in progress in the background. Please wait...
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs mt-2 opacity-60">
                Debug: loading={loading.toString()}, scrapingInProgress={scrapingInProgress.toString()}, mounted={mounted.toString()}
              </div>
            )}
          </div>
        )}

        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-xl text-gray-600">Loading...</div>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Success message */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-700 font-medium">{result.message}</p>
              <p className="text-sm text-green-600 mt-1">
                File saved at: {result.filepath}
              </p>
            </div>

            {/* Summary */}
            <div className={`p-6 rounded-lg border ${
              result.company === 'OpenAI' ? 'bg-blue-50 border-blue-200' : 
              result.company === 'Anthropic' ? 'bg-purple-50 border-purple-200' : 
              'bg-blue-50 border-blue-200'
            }`}>
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                📊 {result.company || 'Company'} Job Summary
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-lg">
                    Total Jobs: <span className="font-bold text-blue-600">{result.summary.total_jobs}</span>
                  </p>
                </div>
                <div>
                  <p className="text-lg">
                    With Salary Data: <span className="font-bold text-blue-600">{result.summary.jobs_with_salary}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Highest paying jobs */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h2 className="text-xl font-bold mb-4 text-gray-900">💰 Highest Paying Jobs</h2>
              <div className="space-y-3">
                {result.summary.highest_paying_jobs.slice(0, 10).map((job, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-blue-600 hover:text-blue-800 cursor-pointer"
                             onClick={() => {
                               const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
                               const jobId = getJobId(currentCompany, index)
                               router.push(`/job/${jobId}?company=${currentCompany}&index=${index}`)
                             }}>{job.title}</h3>
                        <p className="text-gray-600">{job.location} • {job.department}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
                              const jobId = getJobId(currentCompany, index)
                              router.push(`/job/${jobId}?company=${currentCompany}&index=${index}`)
                            }}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                          >
                            View Details
                          </button>
                          {job.url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(job.url, '_blank')
                              }}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                            >
                              Original Post →
                            </button>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Core Skills:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {job.skills.slice(0, 6).map((skill, i) => (
                              <span 
                                key={i} 
                                className="bg-blue-100 px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
                                  router.push(`/skill-jobs?skill=${encodeURIComponent(skill)}&company=${currentCompany}`)
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {formatSalary(job.salary, job.salary_min, job.salary_max) ? (
                          <>
                            <p className="text-xl font-bold text-green-600">
                              {formatSalary(job.salary, job.salary_min, job.salary_max)}
                            </p>
                            <p className="text-sm text-gray-500">Annual Salary (USD)</p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-medium text-gray-500">
                              Salary Confidential
                            </p>
                            <p className="text-xs text-gray-400">
                              {job.description || 'Salary not disclosed'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most common skills */}
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h2 className="text-xl font-bold mb-4 text-gray-900">🛠 Most Common Skill Requirements</h2>
              <div className="grid grid-cols-3 gap-3">
                {result.summary.most_common_skills.map((skill, index) => (
                  <div 
                    key={index} 
                    className="bg-white p-3 rounded-lg border cursor-pointer hover:shadow-md hover:bg-blue-50 transition-all"
                    onClick={() => {
                      const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
                      router.push(`/skill-jobs?skill=${encodeURIComponent(skill.skill)}&company=${currentCompany}`)
                    }}
                  >
                    <p className="font-medium text-blue-600">{skill.skill}</p>
                    <p className="text-sm text-gray-600">{skill.count} positions</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="mb-8">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">No Job Data Available</h2>
              <p className="text-gray-600 mb-6">
                No job data found in database. You can:
              </p>
              <div className="space-y-4 max-w-md mx-auto">
                <button
                  onClick={scrapeJobs}
                  disabled={!hydrated || loading || !url || scrapingInProgress}
                  className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {!hydrated ? 'Loading...' : (loading || scrapingInProgress ? 'Analyzing...' : '🔍 Scrape Latest Job Data')}
                </button>
                <div className="text-sm text-gray-500">
                  Or choose a company to start analysis:
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      const newUrl = 'https://openai.com/careers/search/'
                      setUrl(newUrl)
                      loadCompanyData(newUrl)
                    }}
                    disabled={!hydrated || loading || scrapingInProgress}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Analyze OpenAI Jobs
                  </button>
                  <button
                    onClick={() => {
                      const newUrl = 'https://www.anthropic.com/jobs'
                      setUrl(newUrl)
                      loadCompanyData(newUrl)
                    }}
                    disabled={!hydrated || loading || scrapingInProgress}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Analyze Anthropic Jobs
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Scraped data will be saved in the project's data/ directory</p>
          <p className="mt-1">Contains complete job information, salary and skill requirements</p>
        </div>
      </div>
    </div>
  )
}