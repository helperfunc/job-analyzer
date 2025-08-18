import { useState, useEffect } from 'react'
import PaperInsights from './PaperInsights'

interface Paper {
  id: string
  title: string
  authors: string[]
  publication_date: string
  abstract: string
  url: string
  arxiv_id?: string
  github_url?: string
  company: string
  tags: string[]
  relatedJobs?: any[]
}

interface Job {
  id: string
  title: string
  company: string
}

interface PapersTabProps {
  papers: Paper[]
  jobId?: string
  onScrapePapers: (company: string) => void
  scraping: boolean
  hydrated?: boolean
  onRelatePaper: (paperId: string, jobId: string) => void
  onUnrelatePaper: (paperId: string, jobId: string) => void
  jobs: Job[]
  onDeletePaper: (paperId: string) => void
  onClearAllPapers: () => void
  onRefreshPapers: () => void
  onShowToast: (message: string) => void
  onAddPaper: (paper: Paper) => void
  onClearScrapingState?: () => void
}

export default function PapersTab({
  papers,
  jobId,
  onScrapePapers,
  scraping,
  hydrated = true,
  onRelatePaper,
  onUnrelatePaper,
  jobs,
  onDeletePaper,
  onClearAllPapers,
  onRefreshPapers,
  onShowToast,
  onAddPaper,
  onClearScrapingState
}: PapersTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  
  // Debug effect to monitor props changes
  useEffect(() => {
    console.log(`📊 PapersTab received props: hydrated=${hydrated}, scraping=${scraping}`)
  }, [hydrated, scraping])
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc')
  const [showAddPaperModal, setShowAddPaperModal] = useState(false)
  const [paperUrl, setPaperUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractedPaper, setExtractedPaper] = useState<Paper | null>(null)
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null)

  // Filter and sort papers
  const filteredPapers = papers.filter(paper => {
    const matchesSearch = searchTerm === '' || 
      paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      paper.abstract.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCompany = selectedCompany === '' || paper.company.toLowerCase() === selectedCompany
    const matchesYear = selectedYear === '' || paper.publication_date.startsWith(selectedYear)
    
    return matchesSearch && matchesCompany && matchesYear
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime()
      case 'date-asc':
        return new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime()
      case 'title-asc':
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      case 'title-desc':
        return b.title.toLowerCase().localeCompare(a.title.toLowerCase())
      default:
        return 0
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getUniqueYears = () => {
    const years = papers.map(paper => paper.publication_date.substring(0, 4))
    return Array.from(new Set(years)).sort().reverse()
  }

  const extractPaperInfo = async () => {
    if (!paperUrl.trim()) {
      onShowToast('❌ Please enter a valid URL')
      return
    }

    setExtracting(true)
    try {
      const response = await fetch('/api/research/extract-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: paperUrl.trim() })
      })

      const data = await response.json()
      if (data.success) {
        setExtractedPaper(data.data)
        onShowToast('✅ Paper information extracted successfully!')
      } else {
        onShowToast('❌ Failed to extract paper information')
      }
    } catch (error) {
      console.error('Error extracting paper:', error)
      onShowToast('❌ Network error while extracting paper')
    } finally {
      setExtracting(false)
    }
  }

  const savePaper = async () => {
    if (!extractedPaper) return

    try {
      const response = await fetch('/api/research/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractedPaper)
      })

      const data = await response.json()
      if (data.success) {
        onAddPaper(data.data)
        onShowToast(`✅ Paper "${extractedPaper.title}" added successfully!`)
        setShowAddPaperModal(false)
        setPaperUrl('')
        setExtractedPaper(null)
      } else {
        onShowToast('❌ Failed to save paper')
      }
    } catch (error) {
      console.error('Error saving paper:', error)
      onShowToast('❌ Network error while saving paper')
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => onScrapePapers('openai')}
            disabled={!hydrated || scraping}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {!hydrated ? 'Loading...' : (scraping ? 'Scraping...' : '📥 Scrape OpenAI Papers')}
          </button>
          <button
            onClick={() => onScrapePapers('anthropic')}
            disabled={!hydrated || scraping}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {!hydrated ? 'Loading...' : (scraping ? 'Scraping...' : '📥 Scrape Anthropic Papers')}
          </button>
          <button
            onClick={() => setShowAddPaperModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            ➕ Add Paper
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onRefreshPapers}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            🔄 Refresh
          </button>
          {scraping && onClearScrapingState && (
            <button
              onClick={onClearScrapingState}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              title="Clear scraping state if buttons are stuck"
            >
              🔧 Reset State
            </button>
          )}
          <button
            onClick={onClearAllPapers}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search papers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Companies</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Years</option>
            {getUniqueYears().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border rounded px-3 py-2"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center">
            {filteredPapers.length} of {papers.length} papers
          </div>
        </div>
      </div>

      {/* Papers List */}
      <div className="space-y-4">
        {filteredPapers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-lg">No papers found</p>
            <p className="text-sm">Try scraping papers or adjusting your search filters</p>
          </div>
        ) : (
          filteredPapers.map((paper) => (
            <div key={paper.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {paper.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      paper.company.toLowerCase() === 'openai' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {paper.company.toLowerCase() === 'openai' ? 'OpenAI' : 'Anthropic'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {formatDate(paper.publication_date)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Authors:</strong> {paper.authors.join(', ')}
                  </p>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onDeletePaper(paper.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete paper"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                {paper.abstract}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {paper.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  📄 Paper
                </a>
                {paper.arxiv_id && (
                  <a
                    href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    📖 arXiv
                  </a>
                )}
                {paper.github_url && (
                  <a
                    href={paper.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    💻 GitHub
                  </a>
                )}
                <button
                  onClick={() => setExpandedPaperId(expandedPaperId === paper.id ? null : paper.id)}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium ml-2"
                >
                  {expandedPaperId === paper.id ? '🧠 Hide Insights' : '🧠 View Insights'}
                </button>
              </div>

              {/* Expandable Insights Section */}
              {expandedPaperId === paper.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <PaperInsights 
                    paperId={paper.id}
                    onShowToast={onShowToast}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Paper Modal */}
      {showAddPaperModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Paper from URL</h3>
              <button
                onClick={() => {
                  setShowAddPaperModal(false)
                  setPaperUrl('')
                  setExtractedPaper(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paper URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={paperUrl}
                    onChange={(e) => setPaperUrl(e.target.value)}
                    placeholder="https://arxiv.org/abs/2301.00001 or https://openai.com/research/..."
                    className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={extractPaperInfo}
                    disabled={extracting || !paperUrl.trim()}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {extracting ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Supports arXiv, OpenAI, Anthropic, and other research paper URLs
                </p>
              </div>

              {/* Extracted Paper Info */}
              {extractedPaper && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold mb-3">Extracted Information:</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={extractedPaper.title}
                        onChange={(e) => setExtractedPaper({...extractedPaper, title: e.target.value})}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company/Institution</label>
                      <input
                        type="text"
                        value={extractedPaper.company || ''}
                        onChange={(e) => setExtractedPaper({...extractedPaper, company: e.target.value})}
                        placeholder="e.g., DeepSeek, OpenAI, Stanford"
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Authors (comma separated)</label>
                      <input
                        type="text"
                        value={extractedPaper.authors.join(', ')}
                        onChange={(e) => setExtractedPaper({
                          ...extractedPaper, 
                          authors: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                        })}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date</label>
                      <input
                        type="date"
                        value={extractedPaper.publication_date || ''}
                        onChange={(e) => setExtractedPaper({...extractedPaper, publication_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    {extractedPaper.abstract && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
                        <p className="text-sm text-gray-600 max-h-20 overflow-y-auto">
                          {extractedPaper.abstract.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                    {extractedPaper.tags.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                        <p className="text-sm text-gray-600">{extractedPaper.tags.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowAddPaperModal(false)
                    setPaperUrl('')
                    setExtractedPaper(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={savePaper}
                  disabled={!extractedPaper}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  Save Paper
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}