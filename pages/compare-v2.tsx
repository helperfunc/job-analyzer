import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface CompanyStats {
  name: string
  total_jobs: number
  jobs_with_salary: number
  avg_salary_min?: number
  avg_salary_max?: number
  highest_salary?: number
  lowest_salary?: number
  top_skills: { skill: string; count: number; percentage: number }[]
  departments: { department: string; count: number }[]
}

interface ComparisonResult {
  companies: CompanyStats[]
  insights: string[]
  skillOverlap: {
    common: string[]
    byCompany: { [company: string]: string[] }
  }
}

interface CompanyInfo {
  name: string
  jobCount: number
}

export default function CompareV2() {
  const router = useRouter()
  const [availableCompanies, setAvailableCompanies] = useState<CompanyInfo[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAvailableCompanies()
  }, [])

  const loadAvailableCompanies = async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      
      if (data.success && data.jobs) {
        // Get unique companies and their job counts
        const companyMap = new Map<string, number>()
        data.jobs.forEach((job: any) => {
          if (job.company) {
            const count = companyMap.get(job.company) || 0
            companyMap.set(job.company, count + 1)
          }
        })
        
        // Convert to CompanyInfo array and sort by job count
        const companiesInfo: CompanyInfo[] = Array.from(companyMap.entries())
          .map(([name, jobCount]) => ({ name, jobCount }))
          .sort((a, b) => {
            const countDiff = b.jobCount - a.jobCount
            return countDiff !== 0 ? countDiff : a.name.localeCompare(b.name)
          })
        
        setAvailableCompanies(companiesInfo)
        
        // Log for debugging
        console.log('Company job counts:', companiesInfo)
      }
    } catch (err) {
      setError('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyToggle = (company: string) => {
    setSelectedCompanies(prev => {
      if (prev.includes(company)) {
        return prev.filter(c => c !== company)
      } else {
        return [...prev, company]
      }
    })
  }

  const compareCompanies = async () => {
    if (selectedCompanies.length < 2) {
      setError('Please select at least 2 companies to compare')
      return
    }

    setComparing(true)
    setError('')
    
    try {
      const res = await fetch('/api/compare-companies-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: selectedCompanies })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to compare companies')
      }

      setComparison(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare companies')
    } finally {
      setComparing(false)
    }
  }

  const getCompanyColor = (index: number) => {
    const colors = [
      'blue',
      'purple', 
      'green',
      'orange',
      'pink',
      'indigo'
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading companies...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🔥 Company Comparison
          </h1>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Back to Home
          </button>
        </div>

        {/* Company Selection */}
        {!comparison && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <h2 className="text-xl font-bold mb-4">Select Companies to Compare</h2>
            <p className="text-gray-600 mb-6">Choose at least 2 companies to see a detailed comparison</p>
            
            {availableCompanies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No companies with job data available</p>
                <button
                  onClick={() => router.push('/jobs')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Go to Jobs Page
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {availableCompanies.map(companyInfo => (
                    <label
                      key={companyInfo.name}
                      className={`
                        flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedCompanies.includes(companyInfo.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(companyInfo.name)}
                        onChange={() => handleCompanyToggle(companyInfo.name)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{companyInfo.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({companyInfo.jobCount} jobs)</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {selectedCompanies.length} companies selected
                  </div>
                  <button
                    onClick={compareCompanies}
                    disabled={selectedCompanies.length < 2 || comparing}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comparing ? 'Comparing...' : 'Compare Companies'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Comparison Results */}
        {comparison && (
          <>
            {/* Key Insights */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border mb-8">
              <h2 className="text-xl font-bold mb-4 text-gray-900">🧠 Key Insights</h2>
              <div className="space-y-2">
                {comparison.insights.map((insight, index) => (
                  <p key={index} className="text-gray-700 font-medium">{insight}</p>
                ))}
              </div>
            </div>

            {/* Company Overview */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {comparison.companies.map((company, index) => {
                const color = getCompanyColor(index)
                return (
                  <div key={company.name} className={`p-6 rounded-lg border bg-${color}-50 border-${color}-200`}>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">
                      {company.name}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Jobs:</span>
                        <span className="font-bold">{company.total_jobs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Jobs with Salary:</span>
                        <span className="font-bold">{company.jobs_with_salary}</span>
                      </div>
                      {company.avg_salary_min && company.avg_salary_max && (
                        <div className="flex justify-between">
                          <span>Avg Salary:</span>
                          <span className="font-bold text-green-600">
                            ${company.avg_salary_min}k - ${company.avg_salary_max}k
                          </span>
                        </div>
                      )}
                      {company.highest_salary && (
                        <div className="flex justify-between">
                          <span>Highest Salary:</span>
                          <span className="font-bold text-green-600">${company.highest_salary}k</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Skills Comparison */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
              <h2 className="text-xl font-bold mb-6 text-gray-900">🛠️ Skills Comparison</h2>
              
              {/* Common Skills */}
              {comparison.skillOverlap.common.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-green-700 mb-3">Common Skills Across Companies</h3>
                  <div className="flex flex-wrap gap-2">
                    {comparison.skillOverlap.common.map(skill => (
                      <span key={skill} className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Company-specific Skills */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comparison.companies.map((company, index) => {
                  const color = getCompanyColor(index)
                  return (
                    <div key={company.name}>
                      <h3 className={`font-bold text-${color}-700 mb-3`}>{company.name} Top Skills</h3>
                      <div className="space-y-2">
                        {company.top_skills.slice(0, 8).map((skill) => (
                          <div key={skill.skill} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{skill.skill}</span>
                            <div className="flex items-center gap-2">
                              <div className={`w-16 h-3 bg-${color}-100 rounded-full overflow-hidden`}>
                                <div 
                                  className={`h-full bg-${color}-500 rounded-full`}
                                  style={{ width: `${Math.min(skill.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 w-10">
                                {skill.percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Departments Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
              <h2 className="text-xl font-bold mb-6 text-gray-900">🏢 Departments Breakdown</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comparison.companies.map((company, index) => {
                  const color = getCompanyColor(index)
                  return (
                    <div key={company.name}>
                      <h3 className={`font-bold text-${color}-700 mb-3`}>{company.name}</h3>
                      <div className="space-y-2">
                        {company.departments.slice(0, 6).map((dept) => (
                          <div key={dept.department} className="flex justify-between">
                            <span className="text-sm text-gray-700">{dept.department || 'Unspecified'}</span>
                            <span className={`text-sm font-bold text-${color}-600`}>{dept.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setComparison(null)
                  setSelectedCompanies([])
                  loadAvailableCompanies() // Refresh company list
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Compare Different Companies
              </button>
              <button
                onClick={() => router.push('/jobs')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                View All Jobs
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}