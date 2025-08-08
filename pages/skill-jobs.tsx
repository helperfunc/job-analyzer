import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface Job {
  title: string
  url: string
  location: string
  department: string
  salary?: string
  salary_min?: number
  salary_max?: number
  skills?: string[]
}

interface SkillJobsResponse {
  success: boolean
  skill: string
  total: number
  jobs: Job[]
}

export default function SkillJobs() {
  const router = useRouter()
  const { skill } = router.query
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<'salary' | 'title'>('salary')

  useEffect(() => {
    if (skill && typeof skill === 'string') {
      fetchJobsBySkill(skill)
    }
  }, [skill])

  const fetchJobsBySkill = async (skillName: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/jobs-by-skill?skill=${encodeURIComponent(skillName)}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }

      const data: SkillJobsResponse = await response.json()
      setJobs(data.jobs)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取职位失败')
    } finally {
      setLoading(false)
    }
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'salary') {
      return (b.salary_max || 0) - (a.salary_max || 0)
    } else {
      return a.title.localeCompare(b.title)
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mb-4 transition-colors"
          >
            ← 返回
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            技能筛选: {skill}
          </h1>
          <p className="text-gray-600 mb-4">
            找到 {jobs.length} 个需要该技能的职位
          </p>

          <div className="flex space-x-4 mb-6">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'salary' | 'title')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="salary">按薪资排序</option>
              <option value="title">按职位名称排序</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {sortedJobs.map((job, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.open(job.url, '_blank')}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2">
                    {job.title}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    📍 {job.location} • 🏢 {job.department}
                  </p>
                  
                  {job.skills && job.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">所有技能:</p>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((jobSkill, i) => (
                          <span 
                            key={i}
                            className={`px-2 py-1 rounded text-xs cursor-pointer hover:bg-opacity-80 transition-colors ${
                              jobSkill === skill 
                                ? 'bg-blue-200 text-blue-800 font-medium border border-blue-300' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (jobSkill !== skill) {
                                router.push(`/skill-jobs?skill=${encodeURIComponent(jobSkill)}`)
                              }
                            }}
                          >
                            {jobSkill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-right ml-6">
                  {job.salary_min && job.salary_max ? (
                    <>
                      <p className="text-2xl font-bold text-green-600">
                        ${job.salary_min}K - ${job.salary_max}K
                      </p>
                      <p className="text-sm text-gray-500">年薪 (USD)</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-gray-500">
                        薪资保密
                      </p>
                      <p className="text-xs text-gray-400">
                        点击查看详情
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  💰 {job.salary ? `薪资范围: ${job.salary}` : '薪资未公开'} • 
                  🔗 点击查看完整职位描述
                </p>
              </div>
            </div>
          ))}
        </div>

        {jobs.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg mb-2">未找到需要该技能的职位</p>
            <p className="text-gray-400">请尝试其他技能或返回主页</p>
          </div>
        )}
      </div>
    </div>
  )
}