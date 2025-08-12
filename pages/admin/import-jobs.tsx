import { useState } from 'react'

export default function ImportJobs() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const importJobs = async () => {
    setLoading(true)
    setMessage('Fetching job data...')
    
    try {
      const companies = ['openai', 'anthropic']
      const allJobs: any[] = []
      
      for (const company of companies) {
        const response = await fetch(`/api/get-summary?company=${company}`)
        const data = await response.json()
        
        if (data.success && data.summary && data.summary.highest_paying_jobs) {
          data.summary.highest_paying_jobs.forEach((job: any) => {
            allJobs.push({
              id: generateUUID(),
              title: job.title,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              location: job.location,
              department: job.department,
              salary: job.salary,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              skills: job.skills || [],
              description: job.description,
              url: job.url
            })
          })
        }
      }
      
      setMessage(`Found ${allJobs.length} jobs. Importing to database...`)
      
      // Import to database
      const importResponse = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: allJobs })
      })
      
      const importResult = await importResponse.json()
      
      if (importResult.success) {
        setMessage(`✅ Successfully imported ${importResult.count} jobs to database!`)
      } else {
        setMessage(`❌ Error: ${importResult.message || importResult.error}`)
        if (importResult.sql) {
          console.log('SQL to create table:', importResult.sql)
        }
      }
    } catch (err) {
      setMessage(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Import Jobs to Database</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="mb-4 text-gray-600">
            This will fetch all jobs from the summary data and import them to the database with proper UUIDs.
          </p>
          
          <button
            onClick={importJobs}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import Jobs'}
          </button>
          
          {message && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap">{message}</pre>
            </div>
          )}
        </div>
        
        <div className="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h2 className="font-semibold text-yellow-800 mb-2">Note:</h2>
          <p className="text-yellow-700">
            If you get an error about the jobs table not existing, you need to create it in your Supabase database:
          </p>
          <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  department TEXT,
  salary TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  skills TEXT[],
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`}
          </pre>
        </div>
      </div>
    </div>
  )
}