import { useState, useEffect } from 'react'

interface LinkItemsModalProps {
  projectId: string
  currentLinkedJobs: string[]
  currentLinkedPapers: string[]
  currentLinkedResources: string[]
  onUpdate: (linkedJobs: string[], linkedPapers: string[], linkedResources: string[]) => void
  onClose: () => void
}

interface Job {
  id: string
  title: string
  company: string
}

interface Paper {
  id: string
  title: string
  company: string
}

interface Resource {
  id: string
  title: string
  resource_type: string
}

export default function LinkItemsModal({
  projectId,
  currentLinkedJobs,
  currentLinkedPapers,
  currentLinkedResources,
  onUpdate,
  onClose
}: LinkItemsModalProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'papers' | 'resources'>('jobs')
  const [jobs, setJobs] = useState<Job[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [selectedJobs, setSelectedJobs] = useState<string[]>(currentLinkedJobs)
  const [selectedPapers, setSelectedPapers] = useState<string[]>(currentLinkedPapers)
  const [selectedResources, setSelectedResources] = useState<string[]>(currentLinkedResources)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [jobsRes, papersRes, resourcesRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/research/papers-simple?limit=100'),
        fetch('/api/job-resources')
      ])

      const [jobsData, papersData, resourcesData] = await Promise.all([
        jobsRes.json(),
        papersRes.json(),
        resourcesRes.json()
      ])

      if (jobsData.success && jobsData.jobs) setJobs(jobsData.jobs)
      if (papersData.success && papersData.data) setPapers(papersData.data)
      if (resourcesData.success && resourcesData.data) setResources(resourcesData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    onUpdate(selectedJobs, selectedPapers, selectedResources)
  }

  const toggleJob = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  const togglePaper = (paperId: string) => {
    setSelectedPapers(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId)
        : [...prev, paperId]
    )
  }

  const toggleResource = (resourceId: string) => {
    setSelectedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    )
  }

  const filteredJobs = (jobs || []).filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredPapers = (papers || []).filter(paper => 
    paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paper.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredResources = (resources || []).filter(resource => 
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Link Items to Project</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                activeTab === 'jobs' 
                  ? 'bg-white text-blue-600 font-medium shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Jobs ({selectedJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                activeTab === 'papers' 
                  ? 'bg-white text-blue-600 font-medium shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Papers ({selectedPapers.length})
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                activeTab === 'resources' 
                  ? 'bg-white text-blue-600 font-medium shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Resources ({selectedResources.length})
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto mb-4 border rounded p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTab === 'jobs' && (
                <>
                  {filteredJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No jobs found</p>
                  ) : (
                    filteredJobs.map(job => (
                      <label
                        key={job.id}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(job.id)}
                          onChange={() => toggleJob(job.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{job.title}</div>
                          <div className="text-sm text-gray-500">{job.company}</div>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}

              {activeTab === 'papers' && (
                <>
                  {filteredPapers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No papers found</p>
                  ) : (
                    filteredPapers.map(paper => (
                      <label
                        key={paper.id}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPapers.includes(paper.id)}
                          onChange={() => togglePaper(paper.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{paper.title}</div>
                          <div className="text-sm text-gray-500">{paper.company}</div>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}

              {activeTab === 'resources' && (
                <>
                  {filteredResources.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No resources found</p>
                  ) : (
                    filteredResources.map(resource => (
                      <label
                        key={resource.id}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedResources.includes(resource.id)}
                          onChange={() => toggleResource(resource.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{resource.title}</div>
                          <div className="text-sm text-gray-500">{resource.resource_type}</div>
                        </div>
                      </label>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Links
          </button>
        </div>
      </div>
    </div>
  )
}