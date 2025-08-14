import { useState, useEffect } from 'react'
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

export default function Home() {
  const router = useRouter()
  const [url, setUrl] = useState('https://openai.com/careers/search/')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true) // New state for initial load
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false) // Track if component is mounted
  const [jobIdMap, setJobIdMap] = useState<Record<string, string>>({}) // Map job keys to UUIDs
  const [navigating, setNavigating] = useState(false) // Track navigation state

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
  }, [])

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
      if (mounted && !result) {
        // Trigger data reload by changing URL state
        const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
        loadCompanyData(url)
      }
    }

    window.addEventListener('focus', handleFocus)
    
    // Also handle visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted && !result) {
        const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
        loadCompanyData(url)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [mounted, result, url])

  // Load latest results when component is mounted or when returning to page
  useEffect(() => {
    if (!mounted) return
    
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
            console.log(`📋 No ${currentCompany} data available`)
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
    
    // Always load data when component mounts or when URL changes
    loadData()
  }, [mounted, url])

  const scrapeJobs = async () => {
    if (!url) return

    setLoading(true)
    setError('')
    setResult(null)
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
        throw new Error('爬取失败')
      }

      const data = await res.json()
      setResult(data)
      // Save results to localStorage for persistence
      localStorage.setItem('openai-jobs-analysis-result', JSON.stringify(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : '爬取失败，请重试')
    } finally {
      setLoading(false)
    }
  }


  const clearResults = async () => {
    const confirmed = confirm('⚠️ 确定要清除所有结果和数据库中的工作数据吗？\n\n这将：\n- 清除当前显示结果\n- 删除数据库中所有工作记录\n- 清除本地缓存\n\n此操作不可撤销！')
    
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
        throw new Error('获取统计失败')
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
      setError(err instanceof Error ? err.message : '获取统计失败，请重试')
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
          AI 公司职位分析器
        </h1>
        <p className="text-gray-600 mb-8">
          快速分析AI公司所有职位，找出薪资最高的技术岗位，支持OpenAI和Anthropic对比
        </p>

        <div className="space-y-4 mb-8">
          <input
            type="url"
            placeholder="输入公司招聘页面URL (支持OpenAI/Anthropic)"
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading || !url}
              className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '分析中...' : '快速分析职位'}
            </button>
            {result && (
              <>
                <button
                  onClick={clearResults}
                  disabled={loading}
                  className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="清除显示结果和数据库中的所有工作数据"
                >
                  {loading ? '🗑️ 清除中...' : '🗑️ 清除所有数据'}
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
                  {navigating ? '⏳ Loading...' : '🔥 对比分析'}
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

        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-xl text-gray-600">加载中...</div>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Success message */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-700 font-medium">{result.message}</p>
              <p className="text-sm text-green-600 mt-1">
                文件保存位置: {result.filepath}
              </p>
            </div>

            {/* Summary */}
            <div className={`p-6 rounded-lg border ${
              result.company === 'OpenAI' ? 'bg-blue-50 border-blue-200' : 
              result.company === 'Anthropic' ? 'bg-purple-50 border-purple-200' : 
              'bg-blue-50 border-blue-200'
            }`}>
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                📊 {result.company || '公司'} 职位总结
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-lg">
                    总职位数: <span className="font-bold text-blue-600">{result.summary.total_jobs}</span>
                  </p>
                </div>
                <div>
                  <p className="text-lg">
                    有薪资数据: <span className="font-bold text-blue-600">{result.summary.jobs_with_salary}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Highest paying jobs */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h2 className="text-xl font-bold mb-4 text-gray-900">💰 薪资最高的职位</h2>
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
                          <p className="text-sm font-medium text-gray-700">核心技能:</p>
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
                            <p className="text-sm text-gray-500">年薪 (USD)</p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-medium text-gray-500">
                              薪资保密
                            </p>
                            <p className="text-xs text-gray-400">
                              {job.description || '薪资未公开'}
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
              <h2 className="text-xl font-bold mb-4 text-gray-900">🛠 最常见技能要求</h2>
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
                    <p className="text-sm text-gray-600">{skill.count} 个职位</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="mb-8">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">暂无工作数据</h2>
              <p className="text-gray-600 mb-6">
                数据库中没有找到工作数据。你可以：
              </p>
              <div className="space-y-4 max-w-md mx-auto">
                <button
                  onClick={scrapeJobs}
                  disabled={loading || !url}
                  className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '分析中...' : '🔍 爬取最新职位数据'}
                </button>
                <div className="text-sm text-gray-500">
                  或选择公司快速开始分析：
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      const newUrl = 'https://openai.com/careers/search/'
                      setUrl(newUrl)
                      loadCompanyData(newUrl)
                    }}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    分析 OpenAI 职位
                  </button>
                  <button
                    onClick={() => {
                      const newUrl = 'https://www.anthropic.com/jobs'
                      setUrl(newUrl)
                      loadCompanyData(newUrl)
                    }}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    分析 Anthropic 职位
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>爬取的数据会保存在项目的 data/ 目录下</p>
          <p className="mt-1">包含完整的职位信息、薪资和技能要求</p>
        </div>
      </div>
    </div>
  )
}