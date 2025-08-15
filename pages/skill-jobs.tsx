import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface Job {
  id: string
  title: string
  company: string
  location: string
  department?: string
  salary?: string
  salary_min?: number
  salary_max?: number
  skills?: string[]
  description?: string
  url?: string
}

export default function SkillJobs() {
  const router = useRouter()
  const { skill, company } = router.query
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (skill) {
      fetchJobsBySkill()
    } else {
      setLoading(false)
    }
  }, [skill, company])

  const fetchJobsBySkill = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (skill) params.append('skill', skill as string)
      if (company) params.append('company', company as string)
      
      const response = await fetch(`/api/jobs-by-skill?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setJobs(data.jobs || [])
      } else {
        setError(data.error || 'Failed to fetch jobs')
      }
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const formatSalary = (job: Job): string => {
    if (job.salary) return job.salary
    if (job.salary_min && job.salary_max) {
      return `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
    }
    if (job.salary_min) return `$${job.salary_min.toLocaleString()}+`
    if (job.salary_max) return `Up to $${job.salary_max.toLocaleString()}`
    return 'Not specified'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">
              Jobs with {skill} Skills
              {company && <span className="text-gray-600"> at {company}</span>}
            </h1>
            <button
              onClick={() => router.push('/jobs')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              All Jobs
            </button>
          </div>
          {!loading && (
            <p className="text-gray-600">
              Found {jobs?.length || 0} positions requiring {skill} skills
              {company && ` at ${company}`}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Jobs List */}
        {!loading && !error && (
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                <p className="text-gray-500 text-lg">
                  No jobs found with {skill} skills
                  {company && ` at ${company}`}
                </p>
                <button
                  onClick={() => router.push('/jobs')}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  View all jobs →
                </button>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/job/${job.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      <p className="text-gray-600">
                        {job.company} • {job.location || 'Remote'}
                        {job.department && ` • ${job.department}`}
                      </p>
                    </div>
                    <span className="text-green-600 font-medium">
                      {formatSalary(job)}
                    </span>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {job.skills.map((s, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1 text-sm rounded-full ${
                            s.toLowerCase() === skill?.toString().toLowerCase()
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {job.description && (
                    <p className="text-gray-700 text-sm line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}