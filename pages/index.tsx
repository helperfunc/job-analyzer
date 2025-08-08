import { useState } from 'react'
import { useRouter } from 'next/router'

interface JobSummary {
  title: string
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
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState('')

  const scrapeJobs = async () => {
    if (!url) return

    setLoading(true)
    setError('')
    setResult(null)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : '爬取失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          OpenAI 职位分析器
        </h1>
        <p className="text-gray-600 mb-8">
          快速分析OpenAI所有职位，找出薪资最高的技术岗位
        </p>

        <div className="space-y-4 mb-8">
          <input
            type="url"
            placeholder="输入OpenAI招聘页面URL"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <button
            onClick={scrapeJobs}
            disabled={loading || !url}
            className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '分析中...' : '快速分析职位'}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Success message */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-700 font-medium">{result.message}</p>
              <p className="text-sm text-green-600 mt-1">
                文件保存位置: {result.filepath}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-bold mb-4 text-gray-900">📊 爬取总结</h2>
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
                                  router.push(`/skill-jobs?skill=${encodeURIComponent(skill)}`)
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {job.salary_min && job.salary_max ? (
                          <>
                            <p className="text-xl font-bold text-green-600">
                              ${job.salary_min}k - ${job.salary_max}k
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
                    onClick={() => router.push(`/skill-jobs?skill=${encodeURIComponent(skill.skill)}`)}
                  >
                    <p className="font-medium text-blue-600">{skill.skill}</p>
                    <p className="text-sm text-gray-600">{skill.count} 个职位</p>
                  </div>
                ))}
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