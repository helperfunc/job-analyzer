import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import fs from 'fs'
import path from 'path'

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

interface SkillPageProps {
  jobs: Job[]
  skill: string
}

export default function SkillPage({ jobs, skill }: SkillPageProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'salary' | 'title'>('salary')

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'salary') {
      return (b.salary_max || 0) - (a.salary_max || 0)
    } else {
      return a.title.localeCompare(b.title)
    }
  })

  if (router.isFallback) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">加载中...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mb-4"
          >
            ← 返回
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            技能: {skill}
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
                    {job.location} • {job.department}
                  </p>
                  
                  {job.skills && job.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">所有技能:</p>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((jobSkill, i) => (
                          <span 
                            key={i}
                            className={`px-2 py-1 rounded text-xs ${
                              jobSkill === skill 
                                ? 'bg-blue-200 text-blue-800 font-medium' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
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
            </div>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">未找到需要该技能的职位</p>
          </div>
        )}
      </div>
    </div>
  )
}

export async function getStaticProps({ params }: { params: { skill: string } }) {
  const skill = decodeURIComponent(params.skill)
  
  try {
    // Read the latest job data
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    
    if (files.length === 0) {
      return {
        props: {
          jobs: [],
          skill
        }
      }
    }
    
    const latestFile = files.sort().pop()!
    const filepath = path.join(dataDir, latestFile)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    // Filter jobs that have this skill
    const jobsWithSkill = data.jobs.filter((job: Job) => 
      job.skills && job.skills.includes(skill)
    )
    
    return {
      props: {
        jobs: jobsWithSkill,
        skill
      },
      revalidate: 3600 // Revalidate every hour
    }
  } catch (error) {
    console.error('Error reading job data:', error)
    return {
      props: {
        jobs: [],
        skill
      }
    }
  }
}

export async function getStaticPaths() {
  // We'll generate paths dynamically
  return {
    paths: [],
    fallback: true
  }
}