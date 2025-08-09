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

  // Track mounting to avoid SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load latest results after component is mounted
  useEffect(() => {
    if (!mounted) return
    
    // Clear any old cached data first
    localStorage.removeItem('openai-jobs-analysis-result')
    localStorage.removeItem('anthropic-jobs-analysis-result')
    
    // Always load fresh data on mount
    const loadLatestData = async () => {
      setInitialLoading(true)
      setResult(null) // Ensure no old data is shown
      
      // Determine which company data to load based on current URL
      const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
      
      try {
        const res = await fetch(`/api/get-summary?company=${currentCompany}&_t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-cache', // Prevent browser caching
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        
        if (res.ok) {
          const data = await res.json()
          console.log(`🔍 Fresh API response for ${currentCompany} - ML jobs:`, data.summary?.most_common_skills?.find(s => s.skill === 'Machine Learning')?.count)
          console.log('🔍 Data source file:', data.dataSource)
          console.log('🔍 Timestamp:', data.timestamp)
          setResult(data)
          // Update localStorage with fresh data
          localStorage.setItem(`${currentCompany}-jobs-analysis-result`, JSON.stringify(data))
        } else {
          console.error('Failed to load summary:', res.status)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setInitialLoading(false)
      }
    }
    
    loadLatestData()
  }, [mounted, url]) // Add url as dependency

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

  const clearResults = () => {
    setResult(null)
    setError('')
    localStorage.removeItem('openai-jobs-analysis-result')
    localStorage.removeItem('anthropic-jobs-analysis-result')
  }

  const refreshStats = async () => {
    setLoading(true)
    setError('')
    
    const currentCompany = url.includes('anthropic.com') ? 'anthropic' : 'openai'
    
    try {
      const res = await fetch(`/api/get-summary?company=${currentCompany}`, {
        method: 'GET',
      })

      if (!res.ok) {
        throw new Error('获取统计失败')
      }

      const data = await res.json()
      setResult(data)
      // Save the refreshed results
      localStorage.setItem(`${currentCompany}-jobs-analysis-result`, JSON.stringify(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              onClick={() => setUrl('https://openai.com/careers/search/')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                url.includes('openai.com') 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              OpenAI
            </button>
            <button
              onClick={() => setUrl('https://www.anthropic.com/jobs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                  className="bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  清除结果
                </button>
                <button
                  onClick={() => router.push('/compare')}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors font-medium"
                >
                  🔥 对比分析
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
                  <div key={index} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => window.open(job.url, '_blank')}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-blue-600 hover:text-blue-800">{job.title}</h3>
                        <p className="text-gray-600">{job.location} • {job.department}</p>
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
        ) : null}

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>爬取的数据会保存在项目的 data/ 目录下</p>
          <p className="mt-1">包含完整的职位信息、薪资和技能要求</p>
        </div>
      </div>
    </div>
  )
}