import React, { useState } from 'react'
import { useRouter } from 'next/router'

interface ScrapingResult {
  success: boolean
  message: string
  data?: any[]
}

export default function AdminDeepMind() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapingResult | null>(null)
  const [pages, setPages] = useState(3)
  const router = useRouter()

  const scrapeJobs = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/scrape-deepmind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'jobs',
          pages: pages
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error scraping jobs:', error)
      setResult({
        success: false,
        message: 'Network error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const scrapePapers = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/scrape-deepmind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'papers',
          pages: pages
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error scraping papers:', error)
      setResult({
        success: false,
        message: 'Network error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back
          </button>
          
          <h1 className="text-3xl font-bold mb-2">DeepMind Data Scraper</h1>
          <p className="text-gray-600">Scrape jobs and research papers from DeepMind</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Scraping Configuration</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of pages to scrape:
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={pages}
              onChange={(e) => setPages(parseInt(e.target.value) || 1)}
              className="border border-gray-300 rounded px-3 py-2 w-20"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={scrapeJobs}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Scraping...' : 'Scrape Jobs'}
            </button>

            <button
              onClick={scrapePapers}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Scraping...' : 'Scrape Papers'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-700">Scraping DeepMind data...</span>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Scraping Results</h2>
            
            <div className={`p-4 rounded-lg mb-4 ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                {result.message}
              </p>
            </div>

            {result.success && result.data && result.data.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">
                  Data Preview ({result.data.length} items)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.data.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      {item.company && (
                        <p className="text-sm text-gray-600">
                          {item.company} - {item.location}
                        </p>
                      )}
                      {item.authors && (
                        <p className="text-sm text-gray-600">
                          Authors: {item.authors.join(', ')}
                        </p>
                      )}
                      {item.venue && (
                        <p className="text-sm text-gray-600">
                          Venue: {item.venue}
                        </p>
                      )}
                      {item.salary_range && (
                        <p className="text-sm text-green-600 font-medium">
                          Salary: {item.salary_range}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {result.data.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      ... and {result.data.length - 5} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            {result.success && (
              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => router.push('/jobs')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Jobs
                </button>
                <button
                  onClick={() => router.push('/research')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  View Papers
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Note</h3>
          <p className="text-yellow-700">
            This scraper currently uses mock data for demonstration. In production, 
            it would implement actual web scraping from DeepMind's career pages and 
            research publications.
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-yellow-600">
            <li>Careers: https://deepmind.google/about/careers/</li>
            <li>Greenhouse: https://job-boards.greenhouse.io/deepmind/</li>
            <li>Publications: https://deepmind.google/research/publications/</li>
          </ul>
        </div>
      </div>
    </div>
  )
}