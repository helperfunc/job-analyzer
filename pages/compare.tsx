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

interface CompanyData {
  name: string
  jobs: Job[]
  total_jobs: number
  jobs_with_salary: number
  avg_salary_min?: number
  avg_salary_max?: number
  highest_salary?: number
  lowest_salary?: number
  top_skills: { skill: string; count: number; percentage: number }[]
}

interface ComparisonResult {
  companies: CompanyData[]
  comparison: {
    salary_comparison: {
      winner: string
      openai_avg?: number
      anthropic_avg?: number
      difference?: number
    }
    skill_overlap: {
      common_skills: string[]
      openai_unique: string[]
      anthropic_unique: string[]
    }
    job_title_analysis: {
      similar_roles: Array<{
        role_type: string
        openai_count: number
        anthropic_count: number
        openai_avg_salary?: number
        anthropic_avg_salary?: number
      }>
    }
    insights: string[]
  }
}

export default function Compare() {
  const router = useRouter()
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadComparison()
  }, [])

  const loadComparison = async () => {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/compare-companies')
      
      if (!res.ok) {
        throw new Error('Failed to load comparison')
      }

      const data = await res.json()
      setComparison(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">加载比较数据中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  if (!comparison || comparison.companies.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🔥 OpenAI vs Anthropic 职位对比分析
            </h1>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              返回首页
            </button>
          </div>

          <div className="bg-yellow-50 p-8 rounded-lg border border-yellow-200 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">需要两家公司的数据才能进行对比</h2>
            
            {comparison && comparison.companies.length === 1 ? (
              <div className="space-y-4">
                <p className="text-lg text-gray-700">
                  目前只有 <span className="font-bold text-blue-600">{comparison.companies[0].name}</span> 的数据
                </p>
                <p className="text-gray-600">
                  请回到首页，切换到另一家公司并运行分析，然后再回来进行对比
                </p>
                <div className="flex justify-center space-x-4 mt-6">
                  <button
                    onClick={() => {
                      router.push('/')
                      setTimeout(() => {
                        const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement
                        if (urlInput) {
                          urlInput.value = comparison.companies[0].name === 'OpenAI' 
                            ? 'https://www.anthropic.com/jobs' 
                            : 'https://openai.com/careers/search/'
                        }
                      }, 100)
                    }}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
                  >
                    {comparison.companies[0].name === 'OpenAI' ? '分析 Anthropic' : '分析 OpenAI'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg text-gray-700">还没有任何公司的职位数据</p>
                <p className="text-gray-600">请回到首页，先分析一家公司的职位数据</p>
                <button
                  onClick={() => router.push('/')}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
                >
                  开始分析职位
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🔥 OpenAI vs Anthropic 职位对比分析
          </h1>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            返回首页
          </button>
        </div>

        {/* Key Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900">🧠 关键洞察</h2>
          <div className="space-y-2">
            {comparison.comparison.insights.map((insight, index) => (
              <p key={index} className="text-gray-700 font-medium">{insight}</p>
            ))}
          </div>
        </div>

        {/* Company Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {comparison.companies.map((company) => (
            <div key={company.name} className={`p-6 rounded-lg border ${
              company.name === 'OpenAI' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
            }`}>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                {company.name === 'OpenAI' ? '🤖 OpenAI' : '🧠 Anthropic'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>总职位数：</span>
                  <span className="font-bold">{company.total_jobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>有薪资职位：</span>
                  <span className="font-bold">{company.jobs_with_salary}</span>
                </div>
                {company.avg_salary_min && company.avg_salary_max && (
                  <div className="flex justify-between">
                    <span>平均薪资：</span>
                    <span className="font-bold text-green-600">
                      ${company.avg_salary_min}k - ${company.avg_salary_max}k
                    </span>
                  </div>
                )}
                {company.highest_salary && (
                  <div className="flex justify-between">
                    <span>最高薪资：</span>
                    <span className="font-bold text-green-600">${company.highest_salary}k</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Salary Comparison */}
        {comparison.comparison.salary_comparison.winner && (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">💰 薪资对比</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${comparison.comparison.salary_comparison.openai_avg}k
                </div>
                <div className="text-sm text-gray-600">OpenAI 平均</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-800">
                  {comparison.comparison.salary_comparison.winner} 胜出
                </div>
                <div className="text-sm text-gray-600">
                  差距: ${comparison.comparison.salary_comparison.difference}k
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${comparison.comparison.salary_comparison.anthropic_avg}k
                </div>
                <div className="text-sm text-gray-600">Anthropic 平均</div>
              </div>
            </div>
          </div>
        )}

        {/* Skills Comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {comparison.companies.map((company) => (
            <div key={company.name} className="bg-white p-6 rounded-lg border">
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                {company.name} 热门技能
              </h3>
              <div className="space-y-2">
                {company.top_skills.slice(0, 8).map((skill, index) => (
                  <div key={skill.skill} className="flex items-center justify-between">
                    <span className="text-gray-700">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-16 h-3 bg-gray-200 rounded-full overflow-hidden ${
                        company.name === 'OpenAI' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        <div 
                          className={`h-full rounded-full ${
                            company.name === 'OpenAI' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min(skill.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-12">
                        {skill.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Skill Overlap Analysis */}
        {comparison.comparison.skill_overlap.common_skills.length > 0 && (
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">🔗 技能重叠分析</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-bold text-green-700 mb-2">共同技能</h4>
                <div className="space-y-1">
                  {comparison.comparison.skill_overlap.common_skills.map(skill => (
                    <span key={skill} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm mr-2 mb-1">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-blue-700 mb-2">OpenAI 独有</h4>
                <div className="space-y-1">
                  {comparison.comparison.skill_overlap.openai_unique.slice(0, 5).map(skill => (
                    <span key={skill} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm mr-2 mb-1">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-purple-700 mb-2">Anthropic 独有</h4>
                <div className="space-y-1">
                  {comparison.comparison.skill_overlap.anthropic_unique.slice(0, 5).map(skill => (
                    <span key={skill} className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm mr-2 mb-1">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Role Analysis */}
        {comparison.comparison.job_title_analysis.similar_roles.length > 0 && (
          <div className="bg-white p-6 rounded-lg border mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">👥 相似职位对比</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-3">职位类型</th>
                    <th className="text-center p-3 text-blue-600">OpenAI 数量</th>
                    <th className="text-center p-3 text-purple-600">Anthropic 数量</th>
                    <th className="text-center p-3 text-green-600">OpenAI 平均薪资</th>
                    <th className="text-center p-3 text-green-600">Anthropic 平均薪资</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.comparison.job_title_analysis.similar_roles.slice(0, 10).map((role, index) => (
                    <tr key={role.role_type} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                      <td className="p-3 font-medium">{role.role_type}</td>
                      <td className="p-3 text-center font-bold text-blue-600">{role.openai_count}</td>
                      <td className="p-3 text-center font-bold text-purple-600">{role.anthropic_count}</td>
                      <td className="p-3 text-center text-green-600">
                        {role.openai_avg_salary ? `$${role.openai_avg_salary}k` : '-'}
                      </td>
                      <td className="p-3 text-center text-green-600">
                        {role.anthropic_avg_salary ? `$${role.anthropic_avg_salary}k` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-500 mt-8">
          <p>🔬 基于最新职位数据的深度分析</p>
          <p className="mt-1">数据更新时间：{new Date().toLocaleString('zh-CN')}</p>
        </div>
      </div>
    </div>
  )
}