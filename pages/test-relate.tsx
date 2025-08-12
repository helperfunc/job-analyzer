import { useState, useEffect } from 'react'

export default function TestRelate() {
  const [jobs, setJobs] = useState<any[]>([])
  const [papers, setPapers] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Fetch jobs
    fetchJobs()
    // Fetch papers
    fetchPapers()
  }, [])

  const fetchJobs = async () => {
    try {
      // Use the same logic as research page
      const dbResponse = await fetch('/api/jobs')
      const dbData = await dbResponse.json()
      
      if (dbData.success && dbData.jobs && dbData.jobs.length > 0) {
        setJobs(dbData.jobs)
      } else {
        // Fallback to summary data
        const companies = ['openai', 'anthropic']
        const allJobs: any[] = []
        
        for (const company of companies) {
          const response = await fetch(`/api/get-summary?company=${company}`)
          const data = await response.json()
          if (data.summary && data.summary.highest_paying_jobs) {
            data.summary.highest_paying_jobs.forEach((job: any, index: number) => {
              allJobs.push({
                ...job,
                id: generateUUID(),
                company: company.charAt(0).toUpperCase() + company.slice(1),
                description_url: job.url || `https://${company}.com/careers`
              })
            })
          }
        }
        setJobs(allJobs)
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    }
  }

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/research/papers?limit=5')
      const data = await response.json()
      if (data.success) {
        setPapers(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch papers:', err)
    }
  }

  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const testRelate = async (paperId: string, jobId: string) => {
    try {
      setMessage(`Testing relate: paper=${paperId}, job=${jobId}`)
      
      const response = await fetch('/api/research/relate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId,
          relevance_score: 0.8,
          relevance_reason: 'Test relation'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage(`✅ Success! Relation created.`)
      } else {
        setMessage(`❌ Error: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setMessage(`❌ Network error: ${err}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Paper-Job Relation</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p className="font-medium">Status: {message || 'Ready'}</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">Papers ({papers.length})</h2>
          <div className="space-y-2">
            {papers.slice(0, 3).map(paper => (
              <div key={paper.id} className="p-2 border rounded">
                <p className="font-medium">{paper.title}</p>
                <p className="text-sm text-gray-600">ID: {paper.id}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Jobs ({jobs.length})</h2>
          <div className="space-y-2">
            {jobs.slice(0, 3).map(job => (
              <div key={job.id} className="p-2 border rounded">
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-gray-600">ID: {job.id}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {papers.length > 0 && jobs.length > 0 && (
        <button
          onClick={() => testRelate(papers[0].id, jobs[0].id)}
          className="mt-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Relate First Paper to First Job
        </button>
      )}
    </div>
  )
}