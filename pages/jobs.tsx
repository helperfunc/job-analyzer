import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ResourcesTab from '../components/ResourcesTab'
import UserInteractionButtons from '../components/UserInteractionButtons'

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
  description_url?: string
  created_at: string
  isBookmarked?: boolean
  userVote?: number | null
}

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
  linkedJobs?: Job[] // Jobs linked to this paper
}

interface InterviewResource {
  id: string
  job_id: string
  title: string
  url?: string
  resource_type: 'preparation' | 'question' | 'experience' | 'note' | 'other'
  content: string
  tags: string[]
  created_at: string
}

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({
    search: '',
    company: 'all',
    department: 'all',
    salaryRange: 'all'
  })
  const [sortBy, setSortBy] = useState<'default' | 'salary-high' | 'salary-low' | 'date'>('salary-high')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showPaperModal, setShowPaperModal] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [availableResources, setAvailableResources] = useState<any[]>([])
  const [selectedResourceId, setSelectedResourceId] = useState<string>('')
  const [resourceSearchTerm, setResourceSearchTerm] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const [jobResources, setJobResources] = useState<Record<string, any[]>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [jobsPerPage] = useState(12)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [activeTab, setActiveTab] = useState<'jobs' | 'resources'>('jobs')
  const [userId] = useState('default')
  const [paperSearchFilter, setPaperSearchFilter] = useState({
    search: '',
    company: 'all'
  })
  const [linkedPapers, setLinkedPapers] = useState<Paper[]>([])
  const [modalTab, setModalTab] = useState<'link' | 'linked'>('link')
  const [showCreateJobModal, setShowCreateJobModal] = useState(false)
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: '',
    department: '',
    salary: '',
    salary_min: 0,
    salary_max: 0,
    skills: [] as string[],
    description: '',
    url: ''
  })
  const [scrapingJob, setScrapingJob] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false)
  const [duplicateStats, setDuplicateStats] = useState<any>(null)
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  // Generate a UUID v4-like ID
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Show toast notification
  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  useEffect(() => {
    console.log('Jobs page loading...')
    fetchJobs()
    fetchPapers()
  }, [])

  useEffect(() => {
    if (jobs.length > 0) {
      fetchJobResources()
    }
  }, [jobs.length])

  useEffect(() => {
    if (showResourceModal && selectedJob) {
      fetchAvailableResources()
    }
  }, [showResourceModal, selectedJob?.id])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      // First try to fetch from database
      const dbResponse = await fetch('/api/jobs')
      const dbData = await dbResponse.json()
      
      if (dbData.success && dbData.jobs && dbData.jobs.length > 0) {
        setJobs(dbData.jobs)
        setLoading(false)
        return
      }
      
      // Fallback to summary data and import
      console.log('Fallback: Generating jobs from summary data...')
      const companies = ['openai', 'anthropic']
      const allJobs: Job[] = []
      
      for (const company of companies) {
        try {
          const response = await fetch(`/api/get-summary?company=${company}`)
          const data = await response.json()
          if (data.summary && data.summary.highest_paying_jobs) {
            data.summary.highest_paying_jobs.forEach((job: any, index: number) => {
              allJobs.push({
                ...job,
                id: generateUUID(),
                company: company.charAt(0).toUpperCase() + company.slice(1),
                description_url: job.url || `https://${company}.com/careers`,
                created_at: new Date().toISOString()
              })
            })
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'test') {
            console.error(`Failed to fetch ${company} jobs:`, err)
          }
        }
      }
      
      // Try to import these jobs to database
      if (allJobs.length > 0) {
        try {
          await fetch('/api/jobs/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobs: allJobs })
          })
        } catch (importErr) {
          console.log('Failed to import jobs (non-critical):', importErr)
        }
      }
      
      setJobs(allJobs)
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to fetch jobs:', err)
      }
      setError('Failed to fetch jobs')
    } finally {
      setLoading(false)
    }
  }

  const fetchPapers = async () => {
    try {
      console.log('Fetching papers...')
      const response = await fetch('/api/research/papers?limit=100')
      const data = await response.json()
      if (data.success) {
        // Just set papers without fetching linked jobs to avoid performance issues
        // Linked jobs will be fetched on demand when needed
        setPapers(data.data || [])
        console.log(`Loaded ${data.data?.length || 0} papers`)
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to fetch papers:', err)
      }
    }
  }

  const fetchLinkedPapers = async (jobId: string) => {
    try {
      const response = await fetch(`/api/research/papers/${jobId}`)
      const data = await response.json()
      if (data.success) {
        setLinkedPapers(data.data.map((relation: any) => relation.paper))
      } else {
        setLinkedPapers([])
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to fetch linked papers:', err)
      }
      setLinkedPapers([])
    }
  }

  const unlinkPaperFromJob = async (jobId: string, paperId: string) => {
    try {
      const response = await fetch('/api/research/unrelate-paper', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update both linked papers list and papers state
        setLinkedPapers(prev => prev.filter(paper => paper.id !== paperId))
        setPapers(prevPapers => 
          prevPapers.map(paper => {
            if (paper.id === paperId) {
              return {
                ...paper,
                linkedJobs: (paper.linkedJobs || []).filter(job => job.id !== jobId)
              }
            }
            return paper
          })
        )
        
        const paper = linkedPapers.find(p => p.id === paperId)
        if (paper) {
          showToastMessage(`🗑️ Paper "${paper.title}" unlinked from job`)
        }
      } else {
        console.error('Failed to unlink paper:', data.error)
        showToastMessage('❌ Failed to unlink paper')
      }
    } catch (err) {
      console.error('Failed to unlink paper from job:', err)
      showToastMessage('❌ Network error occurred')
    }
  }

  const linkJobToPaper = async (jobId: string, paperId: string) => {
    try {
      const response = await fetch('/api/research/relate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          job_id: jobId,
          relevance_score: 0.8,
          relevance_reason: 'Manually linked from Jobs page'
        })
      })
      const data = await response.json()
      
      if (data.success) {
        // Update the local state instead of closing modal
        const linkedJob = jobs.find(j => j.id === jobId)
        const linkedPaper = papers.find(p => p.id === paperId)
        
        if (linkedJob && linkedPaper) {
          // Update papers state to include this job as linked
          setPapers(prevPapers => 
            prevPapers.map(paper => {
              if (paper.id === paperId) {
                return {
                  ...paper,
                  linkedJobs: [...(paper.linkedJobs || []), linkedJob]
                }
              }
              return paper
            })
          )
          // Update linked papers list if currently viewing linked tab
          setLinkedPapers(prev => [...prev, linkedPaper])
          showToastMessage(`✅ ${linkedJob.title} linked to ${linkedPaper.title}`)
        }
      } else {
        console.error(`Failed to link: ${data.error || 'Unknown error'}`)
        showToastMessage(`❌ Failed to link job to paper`)
      }
    } catch (err) {
      console.error('Failed to link job to paper:', err)
      showToastMessage(`❌ Network error occurred`)
    }
  }

  const scrapeJobContent = async () => {
    if (!newJob.url.trim()) {
      showToastMessage('❌ Please provide a URL to scrape content from')
      return
    }

    setScrapingJob(true)
    try {
      const response = await fetch('/api/jobs/scrape-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newJob.url })
      })

      const data = await response.json()

      if (data.success) {
        // Update the form with scraped data, keeping existing values if scraping didn't find anything
        setNewJob(prev => ({
          ...prev,
          title: data.data.title || prev.title,
          company: data.data.company || prev.company,
          location: data.data.location || prev.location,
          salary: data.data.salary || prev.salary,
          description: data.data.description || prev.description,
          skills: data.data.skills.length > 0 ? data.data.skills : prev.skills
        }))
        showToastMessage('✅ Job content scraped successfully!')
      } else {
        showToastMessage('❌ Failed to scrape job content')
      }
    } catch (error) {
      console.error('Error scraping job content:', error)
      showToastMessage('❌ Network error while scraping')
    } finally {
      setScrapingJob(false)
    }
  }

  const checkForDuplicates = async () => {
    setCheckingDuplicates(true)
    try {
      const response = await fetch('/api/jobs/check-duplicates')
      const data = await response.json()
      
      if (data.success) {
        setDuplicateStats(data)
        setShowDuplicateDetails(true)
        const totalDuplicates = data.summary.totalDuplicates
        if (totalDuplicates > 0) {
          showToastMessage(`🔍 Found ${totalDuplicates} duplicate jobs across companies`)
        } else {
          showToastMessage('✅ No duplicate jobs found!')
        }
      } else {
        showToastMessage('❌ Failed to check for duplicates')
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
      showToastMessage('❌ Network error while checking duplicates')
    } finally {
      setCheckingDuplicates(false)
    }
  }

  const cleanDuplicates = async () => {
    if (!duplicateStats || duplicateStats.summary.totalDuplicates === 0) {
      showToastMessage('❌ No duplicates found to clean')
      return
    }

    setCleaningDuplicates(true)
    try {
      const response = await fetch('/api/jobs/clean-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (data.success) {
        showToastMessage(`✅ Cleaned ${data.stats.duplicatesRemoved} duplicate jobs!`)
        // Refresh the jobs list
        fetchJobs()
        // Clear duplicate stats
        setDuplicateStats(null)
        setShowDuplicateDetails(false)
      } else {
        showToastMessage('❌ Failed to clean duplicates')
      }
    } catch (error) {
      console.error('Error cleaning duplicates:', error)
      showToastMessage('❌ Network error while cleaning duplicates')
    } finally {
      setCleaningDuplicates(false)
    }
  }

  const clearAllJobs = async () => {
    const confirmed = confirm('⚠️ Are you sure you want to delete all job data?\n\nThis will permanently delete all job records from the database. This action cannot be undone!')
    
    if (!confirmed) return

    setClearingAll(true)
    try {
      const response = await fetch('/api/jobs/clear-all', {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setJobs([])
        setDuplicateStats(null)
        setShowDuplicateDetails(false)
        showToastMessage(`✅ ${data.message}`)
      } else {
        showToastMessage('❌ Failed to clear all jobs')
      }
    } catch (error) {
      console.error('Error clearing all jobs:', error)
      showToastMessage('❌ Network error while clearing jobs')
    } finally {
      setClearingAll(false)
    }
  }

  const createJob = async () => {
    if (!newJob.title.trim() || !newJob.company.trim()) {
      showToastMessage('❌ Title and company are required')
      return
    }

    try {
      const jobData = {
        ...newJob,
        id: generateUUID(),
        skills: newJob.skills.filter(skill => skill.trim()),
        created_at: new Date().toISOString()
      }

      const response = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: [jobData] })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh the jobs list instead of adding locally
        fetchJobs()
        showToastMessage(`✅ Job "${jobData.title}" created successfully!`)
        setShowCreateJobModal(false)
        setNewJob({
          title: '',
          company: '',
          location: '',
          department: '',
          salary: '',
          salary_min: 0,
          salary_max: 0,
          skills: [],
          description: '',
          url: ''
        })
      } else {
        console.error('Failed to create job:', data.error)
        showToastMessage(`❌ Failed to create job`)
      }
    } catch (err) {
      console.error('Failed to create job:', err)
      showToastMessage(`❌ Network error occurred`)
    }
  }

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete the job "${jobTitle}"? This action cannot be undone and will remove all associated resources and papers.`)) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        // Remove the job from the local state
        setJobs(prev => prev.filter(job => job.id !== jobId))
        showToastMessage(`🗑️ Job "${jobTitle}" deleted successfully`)
      } else {
        console.error('Failed to delete job:', data.error)
        showToastMessage('❌ Failed to delete job')
      }
    } catch (err) {
      console.error('Failed to delete job:', err)
      showToastMessage('❌ Network error occurred')
    }
  }

  const fetchJobResources = async () => {
    try {
      // Fetch all job-resource relations at once instead of per job
      const [jobRelationsRes, interviewRelationsRes] = await Promise.all([
        fetch('/api/job-resource-relations'),
        fetch('/api/interview-resource-relations')  
      ])

      const [jobRelationsData, interviewRelationsData] = await Promise.all([
        jobRelationsRes.json(),
        interviewRelationsRes.json()
      ])

      // Group resources by job_id
      const resourcesByJob: Record<string, any[]> = {}
      
      // Process job resource relations
      if (jobRelationsData.success && jobRelationsData.data) {
        jobRelationsData.data.forEach((relation: any) => {
          if (!resourcesByJob[relation.job_id]) {
            resourcesByJob[relation.job_id] = []
          }
          resourcesByJob[relation.job_id].push({
            ...relation.job_resources,
            source: 'job_resources',
            relation_id: relation.id
          })
        })
      }

      // Process interview resource relations  
      if (interviewRelationsData.success && interviewRelationsData.data) {
        interviewRelationsData.data.forEach((relation: any) => {
          if (!resourcesByJob[relation.job_id]) {
            resourcesByJob[relation.job_id] = []
          }
          resourcesByJob[relation.job_id].push({
            ...relation.interview_resources,
            source: 'interview_resources', 
            relation_id: relation.id
          })
        })
      }

      setJobResources(resourcesByJob)
    } catch (error) {
      console.error('Error fetching job resources:', error)
    }
  }

  const fetchAvailableResources = async () => {
    try {
      const [jobResourcesRes, interviewResourcesRes] = await Promise.all([
        fetch('/api/job-resources'),
        fetch('/api/interview-resources')
      ])

      const [jobResourcesData, interviewResourcesData] = await Promise.all([
        jobResourcesRes.json(),
        interviewResourcesRes.json()
      ])

      // Get all resources without job_id filtering (since we now use relations)
      const allResources = [
        ...(jobResourcesData.success && jobResourcesData.data ? jobResourcesData.data.map((r: any) => ({ ...r, source: 'job_resources' })) : []),
        ...(interviewResourcesData.success && interviewResourcesData.data ? interviewResourcesData.data.map((r: any) => ({ ...r, source: 'interview_resources' })) : [])
      ]

      // Get already linked resources for this job
      let linkedResourceIds: string[] = []
      if (selectedJob) {
        try {
          const linkedResponse = await fetch(`/api/resource-job-relations?job_id=${selectedJob.id}`)
          const linkedData = await linkedResponse.json()
          if (linkedData.success && linkedData.data) {
            linkedResourceIds = linkedData.data.map((r: any) => r.id)
          }
        } catch (error) {
          console.error('Error fetching linked resources:', error)
        }
      }

      // Filter out resources that are already linked to this job
      const unlinkedResources = allResources.filter(r => !linkedResourceIds.includes(r.id))
      
      console.log('All resources:', allResources.length, 'Already linked:', linkedResourceIds.length, 'Available:', unlinkedResources.length)
      setAvailableResources(unlinkedResources)
    } catch (error) {
      console.error('Error fetching resources:', error)
      setAvailableResources([])
    }
  }

  const linkResourceToJob = async () => {
    if (!selectedJob || !selectedResourceId) return
    
    const selectedResource = availableResources.find(r => r.id === selectedResourceId)
    if (!selectedResource) return

    try {
      // Create a relation using the new API
      const response = await fetch('/api/resource-job-relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: selectedJob.id,
          resource_id: selectedResourceId,
          resource_type: selectedResource.source
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Resource linked successfully:', data)
        
        // Update local state immediately
        const resourceWithSource = { ...selectedResource, source: selectedResource.source }
        setJobResources(prev => {
          const newState = {
            ...prev,
            [selectedJob.id]: [...(prev[selectedJob.id] || []), resourceWithSource]
          }
          console.log('Updated jobResources state:', newState)
          return newState
        })
        
        showToastMessage(`✅ Resource "${selectedResource.title}" linked to job successfully`)
        setShowResourceModal(false)
        setSelectedResourceId('')
        setResourceSearchTerm('')
        setResourceTypeFilter('')
        
        // Refresh data immediately without delay
        fetchJobResources()
      } else if (response.status === 409) {
        showToastMessage('⚠️ Resource is already linked to this job')
        setShowResourceModal(false)
        setSelectedResourceId('')
        setResourceSearchTerm('')
        setResourceTypeFilter('')
      } else {
        throw new Error(data.error || 'Failed to create resource relation')
      }
    } catch (err) {
      console.error('Failed to link resource:', err)
      showToastMessage(`❌ Failed to link resource: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Filter jobs based on current filter settings
  const filteredJobs = jobs.filter(job => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      const matchesSearch = 
        job.title.toLowerCase().includes(searchLower) ||
        job.company.toLowerCase().includes(searchLower) ||
        (job.location && job.location.toLowerCase().includes(searchLower)) ||
        (job.department && job.department.toLowerCase().includes(searchLower)) ||
        (job.skills && job.skills.some(skill => skill.toLowerCase().includes(searchLower)))
      if (!matchesSearch) return false
    }
    
    if (filter.company !== 'all' && job.company !== filter.company) {
      return false
    }
    
    if (filter.department !== 'all' && job.department !== filter.department) {
      return false
    }
    
    if (filter.salaryRange !== 'all') {
      const salary = job.salary_max || job.salary_min || 0
      if (filter.salaryRange === '0-200' && salary > 200000) return false
      if (filter.salaryRange === '200-300' && (salary <= 200000 || salary > 300000)) return false
      if (filter.salaryRange === '300-400' && (salary <= 300000 || salary > 400000)) return false
      if (filter.salaryRange === '400+' && salary <= 400000) return false
    }
    
    return true
  })

  // Sort jobs based on selected sorting option
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case 'salary-high':
        // Helper function to extract max salary from various formats
        const getMaxSalary = (job: Job) => {
          if (job.salary_max) {
            // Check if this looks like a K value that wasn't converted
            if (job.salary_max < 10000) {
              return job.salary_max * 1000
            }
            return job.salary_max
          }
          if (job.salary_min) {
            // Check if this looks like a K value that wasn't converted
            if (job.salary_min < 10000) {
              return job.salary_min * 1000
            }
            return job.salary_min
          }
          if (job.salary) {
            // Parse string salary like "$197,000-$291,000" or "$460K – $685K"
            const matches = job.salary.match(/\$?([\d,]+)([KkMm]?)[\s]*[-–—][\s]*\$?([\d,]+)([KkMm]?)/)
            if (matches) {
              const maxStr = matches[3] || matches[1]
              const maxUnit = matches[4] || matches[2]
              let maxValue = parseInt(maxStr.replace(/,/g, ''))
              if (maxUnit && maxUnit.toLowerCase() === 'k') maxValue *= 1000
              if (maxUnit && maxUnit.toLowerCase() === 'm') maxValue *= 1000000
              return maxValue
            }
            // Try single value like "$150K" or "$150,000"
            const singleMatch = job.salary.match(/\$?([\d,]+)([KkMm]?)/)
            if (singleMatch) {
              const unit = singleMatch[2]
              let value = parseInt(singleMatch[1].replace(/,/g, ''))
              if (unit && unit.toLowerCase() === 'k') value *= 1000
              if (unit && unit.toLowerCase() === 'm') value *= 1000000
              return value
            }
          }
          return 0
        }

        // Jobs without salary go to the end
        const aMaxSalary = getMaxSalary(a)
        const bMaxSalary = getMaxSalary(b)
        const aHasSalary = aMaxSalary > 0
        const bHasSalary = bMaxSalary > 0
        
        if (!aHasSalary && !bHasSalary) {
          // Both have no salary, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        if (!aHasSalary) return 1  // a goes after b
        if (!bHasSalary) return -1 // b goes after a
        
        // Both have salary, sort by max salary descending
        const aMax = aMaxSalary
        const bMax = bMaxSalary
        
        if (aMax === bMax) {
          // Same salary, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        
        return bMax - aMax
        
      case 'salary-low':
        // Helper function to extract min salary from various formats
        const getMinSalary = (job: Job) => {
          if (job.salary_min) {
            // Check if this looks like a K value that wasn't converted
            if (job.salary_min < 10000) {
              return job.salary_min * 1000
            }
            return job.salary_min
          }
          if (job.salary_max) {
            // Check if this looks like a K value that wasn't converted
            if (job.salary_max < 10000) {
              return job.salary_max * 1000
            }
            return job.salary_max
          }
          if (job.salary) {
            // Parse string salary like "$197,000-$291,000" or "$460K – $685K"
            const matches = job.salary.match(/\$?([\d,]+)([KkMm]?)[\s]*[-–—][\s]*\$?([\d,]+)([KkMm]?)/)
            if (matches) {
              const minStr = matches[1]
              const minUnit = matches[2]
              let minValue = parseInt(minStr.replace(/,/g, ''))
              if (minUnit && minUnit.toLowerCase() === 'k') minValue *= 1000
              if (minUnit && minUnit.toLowerCase() === 'm') minValue *= 1000000
              return minValue
            }
            // Try single value like "$150K" or "$150,000"
            const singleMatch = job.salary.match(/\$?([\d,]+)([KkMm]?)/)
            if (singleMatch) {
              const unit = singleMatch[2]
              let value = parseInt(singleMatch[1].replace(/,/g, ''))
              if (unit && unit.toLowerCase() === 'k') value *= 1000
              if (unit && unit.toLowerCase() === 'm') value *= 1000000
              return value
            }
          }
          return 0
        }

        // Jobs without salary go to the end
        const aMinSalary = getMinSalary(a)
        const bMinSalary = getMinSalary(b)
        const aHasSalaryLow = aMinSalary > 0
        const bHasSalaryLow = bMinSalary > 0
        
        if (!aHasSalaryLow && !bHasSalaryLow) {
          // Both have no salary, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        if (!aHasSalaryLow) return 1  // a goes after b
        if (!bHasSalaryLow) return -1 // b goes after a
        
        // Both have salary, sort by min salary ascending
        const aMin = aMinSalary
        const bMin = bMinSalary
        
        if (aMin === bMin) {
          // Same salary, sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        
        return aMin - bMin
        
      case 'date':
        // Sort by created_at date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        
      default:
        // Default sorting (maintain original order)
        return 0
    }
  })

  // Get unique values for filters
  const companies = [...new Set(jobs.map(job => job.company))]
  const departments = [...new Set(jobs.map(job => job.department).filter(Boolean))]

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / jobsPerPage)
  const indexOfLastJob = currentPage * jobsPerPage
  const indexOfFirstJob = indexOfLastJob - jobsPerPage
  const currentJobs = sortedJobs.slice(indexOfFirstJob, indexOfLastJob)

  const handleFilterChange = (newFilter: any) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  if (loading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading jobs...</p>
          <p className="text-sm text-gray-500 mt-2">If this takes too long, try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Jobs Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateJobModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              + Create Job
            </button>
            <button
              onClick={checkForDuplicates}
              disabled={checkingDuplicates}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {checkingDuplicates ? '🔍 Checking...' : '🔍 Check Duplicates'}
            </button>
            {duplicateStats && duplicateStats.summary.totalDuplicates > 0 && (
              <button
                onClick={cleanDuplicates}
                disabled={cleaningDuplicates}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cleaningDuplicates ? '🧹 Cleaning...' : `🧹 Clean ${duplicateStats.summary.totalDuplicates} Duplicates`}
              </button>
            )}
            <button
              onClick={clearAllJobs}
              disabled={clearingAll}
              className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 disabled:opacity-50"
              title="Delete all jobs from database"
            >
              {clearingAll ? '🗑️ Clearing...' : '🗑️ Clear All'}
            </button>
            <button
              onClick={() => router.push('/compare-v2')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              🔥 Compare Companies
            </button>
            <button
              onClick={() => router.push('/research')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Research
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Home
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search jobs..."
                value={filter.search}
                onChange={(e) => handleFilterChange({...filter, search: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={filter.company}
                onChange={(e) => handleFilterChange({...filter, company: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filter.department}
                onChange={(e) => handleFilterChange({...filter, department: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
              <select
                value={filter.salaryRange}
                onChange={(e) => handleFilterChange({...filter, salaryRange: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Salaries</option>
                <option value="0-200">$0 - $200K</option>
                <option value="200-300">$200K - $300K</option>
                <option value="300-400">$300K - $400K</option>
                <option value="400+">$400K+</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => handleFilterChange({search: '', company: 'all', department: 'all', salaryRange: 'all'})}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Showing {indexOfFirstJob + 1}-{Math.min(indexOfLastJob, sortedJobs.length)} of {sortedJobs.length} jobs
              {sortedJobs.length !== jobs.length && ` (filtered from ${jobs.length})`}
            </span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Default</option>
                <option value="salary-high">Salary (High to Low)</option>
                <option value="salary-low">Salary (Low to High)</option>
                <option value="date">Date (Newest First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mb-6 border-b bg-white px-6 py-3 rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'jobs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Job Resources
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'jobs' && (
          <>
        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentJobs.map(job => (
            <div key={job.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 
                    className="text-lg font-semibold text-blue-600 hover:underline cursor-pointer line-clamp-2"
                    onClick={() => {
                      console.log('Navigating to job:', job.id, job.title)
                      router.push(`/job/${job.id}?company=${job.company.toLowerCase()}&index=0`)
                    }}
                  >
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                  <p className="text-sm text-gray-500">{job.location || 'Remote'}</p>
                  {job.department && (
                    <p className="text-xs text-gray-500 mt-1">{job.department}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    job.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                    job.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {job.company}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // Prevent navigation when clicking delete
                      deleteJob(job.id, job.title)
                    }}
                    className="text-red-600 hover:text-red-800 p-1 rounded"
                    title="Delete job"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {(job.salary || job.salary_min || job.salary_max) && (
                <div className="mb-3">
                  <p className="text-lg font-semibold text-green-600">
                    {job.salary ? job.salary : 
                     job.salary_min && job.salary_max ? 
                       `$${(job.salary_min / 1000).toFixed(0)}K - $${(job.salary_max / 1000).toFixed(0)}K` :
                     job.salary_min ? 
                       `$${(job.salary_min / 1000).toFixed(0)}K+` :
                     job.salary_max ? 
                       `Up to $${(job.salary_max / 1000).toFixed(0)}K` :
                       'Salary not specified'
                    }
                  </p>
                  <p className="text-xs text-gray-500">Annual (USD)</p>
                </div>
              )}

              {job.skills && job.skills.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{job.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedJob(job)
                    setShowPaperModal(true)
                    setModalTab('link')
                    fetchLinkedPapers(job.id)
                  }}
                  className="flex-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded"
                >
                  Link to Paper
                </button>
                <button
                  onClick={() => {
                    setSelectedJob(job)
                    setShowResourceModal(true)
                  }}
                  className="flex-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded"
                >
                  Add Resource
                </button>
              </div>

              {/* User Interaction Buttons */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <UserInteractionButtons
                  targetType="job"
                  targetId={job.id}
                  itemTitle={job.title}
                  initialUserVote={job.userVote}
                  initialIsBookmarked={job.isBookmarked}
                />
              </div>

              {/* Linked Resources Display */}
              {jobResources[job.id] && jobResources[job.id].length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Linked Resources:</h4>
                  <div className="space-y-1">
                    {jobResources[job.id].slice(0, 2).map((resource, i) => (
                      <div key={resource.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                        <span>
                          {resource.resource_type === 'course' ? '🎓' :
                           resource.resource_type === 'book' ? '📚' :
                           resource.resource_type === 'video' ? '🎥' :
                           resource.resource_type === 'article' ? '📄' :
                           resource.resource_type === 'tool' ? '🛠️' :
                           resource.resource_type === 'preparation' ? '📝' :
                           resource.resource_type === 'question' ? '❓' :
                           resource.resource_type === 'experience' ? '💡' :
                           resource.resource_type === 'note' ? '📋' : '🔖'}
                        </span>
                        <span className="flex-1 truncate text-gray-700">
                          {resource.title}
                        </span>
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            🔗
                          </a>
                        )}
                      </div>
                    ))}
                    {jobResources[job.id].length > 2 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{jobResources[job.id].length - 2} more resources
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => router.push(`/job/${job.id}?company=${job.company.toLowerCase()}&index=0`)}
                className="w-full mt-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded"
              >
                View Details
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Link to Paper Modal */}
        {showPaperModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Papers for "{selectedJob.title}"</h3>
                <button
                  onClick={() => {
                    setShowPaperModal(false)
                    setSelectedJob(null)
                    setPaperSearchFilter({ search: '', company: 'all' })
                    setLinkedPapers([])
                    setModalTab('link')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-4 mb-4 border-b">
                <button
                  onClick={() => setModalTab('link')}
                  className={`pb-2 px-1 font-medium transition-colors ${
                    modalTab === 'link'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Link New Papers
                </button>
                <button
                  onClick={() => setModalTab('linked')}
                  className={`pb-2 px-1 font-medium transition-colors ${
                    modalTab === 'linked'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Linked Papers ({linkedPapers.length})
                </button>
              </div>

              {/* Link New Papers Tab */}
              {modalTab === 'link' && (
                <>
                  {/* Search and Filter Controls */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Papers</label>
                        <input
                          type="text"
                          placeholder="Search by title, authors, or abstract..."
                          value={paperSearchFilter.search}
                          onChange={(e) => setPaperSearchFilter({...paperSearchFilter, search: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <select
                          value={paperSearchFilter.company}
                          onChange={(e) => setPaperSearchFilter({...paperSearchFilter, company: e.target.value})}
                          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Companies</option>
                          <option value="OpenAI">OpenAI</option>
                          <option value="Anthropic">Anthropic</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalTab === 'link' && (
                <>
                  {/* Papers List */}
                  <div className="overflow-y-auto max-h-[50vh]">
                    <div className="grid gap-3">
                      {papers.filter(paper => {
                        // Filter out papers that are already linked to this job
                        if (paper.linkedJobs?.some((linkedJob: Job) => linkedJob.id === selectedJob.id)) {
                          return false
                        }
                        
                        // Apply search filter
                        if (paperSearchFilter.search) {
                          const searchLower = paperSearchFilter.search.toLowerCase()
                          const matchesSearch = 
                            paper.title.toLowerCase().includes(searchLower) ||
                            paper.abstract?.toLowerCase().includes(searchLower) ||
                            paper.authors.some(author => author.toLowerCase().includes(searchLower))
                          if (!matchesSearch) return false
                        }
                        
                        // Apply company filter
                        if (paperSearchFilter.company !== 'all' && paper.company !== paperSearchFilter.company) {
                          return false
                        }
                        
                        return true
                      }).map(paper => (
                        <div
                          key={paper.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{paper.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {paper.authors.slice(0, 3).join(', ')}
                                {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {paper.company} • {paper.publication_date ? new Date(paper.publication_date).getFullYear() : 'N/A'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              paper.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                              paper.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {paper.company}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {paper.abstract}
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              {paper.linkedJobs && paper.linkedJobs.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Already linked to:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {paper.linkedJobs.slice(0, 2).map((linkedJob: Job) => (
                                      <span key={linkedJob.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        {linkedJob.title}
                                      </span>
                                    ))}
                                    {paper.linkedJobs.length > 2 && (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        +{paper.linkedJobs.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => linkJobToPaper(selectedJob.id, paper.id)}
                              className="ml-4 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded flex-shrink-0"
                            >
                              Link Job
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Linked Papers Tab */}
              {modalTab === 'linked' && (
                <div className="overflow-y-auto max-h-[50vh]">
                  {linkedPapers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No papers linked to this job yet</p>
                      <button
                        onClick={() => setModalTab('link')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Link Papers
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {linkedPapers.map(paper => (
                        <div key={paper.id} className="border rounded-lg p-4 bg-blue-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{paper.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {paper.authors.slice(0, 3).join(', ')}
                                {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {paper.company} • {paper.publication_date ? new Date(paper.publication_date).getFullYear() : 'N/A'}
                              </p>
                            </div>
                            <div className="flex gap-2 items-center">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                paper.company === 'OpenAI' ? 'bg-blue-100 text-blue-700' :
                                paper.company === 'Anthropic' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {paper.company}
                              </span>
                              <button
                                onClick={() => unlinkPaperFromJob(selectedJob.id, paper.id)}
                                className="text-red-600 hover:text-red-800 px-2 py-1 text-xs rounded"
                                title="Unlink paper"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {paper.abstract}
                          </div>

                          <div className="flex gap-4">
                            {paper.url && (
                              <a href={paper.url} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:underline text-sm">
                                View Paper →
                              </a>
                            )}
                            {paper.arxiv_id && (
                              <a href={`https://arxiv.org/abs/${paper.arxiv_id}`} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:underline text-sm">
                                arXiv →
                              </a>
                            )}
                            {paper.github_url && (
                              <a href={paper.github_url} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:underline text-sm">
                                GitHub →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {modalTab === 'link' ? (
                    `${papers.filter(paper => {
                      // Filter out papers that are already linked to this job
                      if (paper.linkedJobs?.some((linkedJob: Job) => linkedJob.id === selectedJob.id)) {
                        return false
                      }
                      
                      if (paperSearchFilter.search) {
                        const searchLower = paperSearchFilter.search.toLowerCase()
                        const matchesSearch = 
                          paper.title.toLowerCase().includes(searchLower) ||
                          paper.abstract?.toLowerCase().includes(searchLower) ||
                          paper.authors.some(author => author.toLowerCase().includes(searchLower))
                        if (!matchesSearch) return false
                      }
                      
                      if (paperSearchFilter.company !== 'all' && paper.company !== paperSearchFilter.company) {
                        return false
                      }
                      
                      return true
                    }).length} available papers to link`
                  ) : (
                    `${linkedPapers.length} papers linked to this job`
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowPaperModal(false)
                    setSelectedJob(null)
                    setPaperSearchFilter({ search: '', company: 'all' })
                    setLinkedPapers([])
                    setModalTab('link')
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Interview Resource Modal */}
        {showResourceModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Link Resource to "{selectedJob.title}"</h3>
                <button
                  onClick={() => {
                    setShowResourceModal(false)
                    setSelectedJob(null)
                    setSelectedResourceId('')
                    setResourceSearchTerm('')
                    setResourceTypeFilter('')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={resourceSearchTerm}
                    onChange={(e) => setResourceSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={resourceTypeFilter}
                    onChange={(e) => setResourceTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="course">Course</option>
                    <option value="book">Book</option>
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="tool">Tool</option>
                    <option value="preparation">Preparation</option>
                    <option value="question">Question</option>
                    <option value="experience">Experience</option>
                    <option value="note">Note</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Resources List */}
                <div className="max-h-96 overflow-y-auto border rounded-lg p-2">
                  {availableResources.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-2">No resources available to link</p>
                      <button
                        onClick={() => window.open('/resources', '_blank')}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Create resources in Resource Center →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableResources
                        .filter(resource => {
                          const matchesSearch = !resourceSearchTerm || 
                            resource.title.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
                            (resource.content || resource.description || '').toLowerCase().includes(resourceSearchTerm.toLowerCase())
                          const matchesType = !resourceTypeFilter || resource.resource_type === resourceTypeFilter
                          return matchesSearch && matchesType
                        })
                        .map((resource) => (
                          <label
                            key={resource.id}
                            className={`block p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                              selectedResourceId === resource.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="resource"
                              value={resource.id}
                              checked={selectedResourceId === resource.id}
                              onChange={(e) => setSelectedResourceId(e.target.value)}
                              className="sr-only"
                            />
                            <div className="flex items-start gap-2">
                              <span className="text-lg mt-0.5">
                                {resource.resource_type === 'course' ? '🎓' :
                                 resource.resource_type === 'book' ? '📚' :
                                 resource.resource_type === 'video' ? '🎥' :
                                 resource.resource_type === 'article' ? '📄' :
                                 resource.resource_type === 'tool' ? '🛠️' :
                                 resource.resource_type === 'preparation' ? '📝' :
                                 resource.resource_type === 'question' ? '❓' :
                                 resource.resource_type === 'experience' ? '💡' :
                                 resource.resource_type === 'note' ? '📋' : '🔖'}
                              </span>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{resource.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {resource.content || resource.description || 'No description available'}
                                </p>
                                {resource.url && (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    🔗 View resource
                                  </a>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={linkResourceToJob}
                    disabled={!selectedResourceId}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Link Selected Resource
                  </button>
                  <button
                    onClick={() => {
                      setShowResourceModal(false)
                      setSelectedJob(null)
                      setSelectedResourceId('')
                      setResourceSearchTerm('')
                      setResourceTypeFilter('')
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Job Modal */}
        {showCreateJobModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New Job</h3>
                <button
                  onClick={() => {
                    setShowCreateJobModal(false)
                    setNewJob({
                      title: '',
                      company: '',
                      location: '',
                      department: '',
                      salary: '',
                      salary_min: 0,
                      salary_max: 0,
                      skills: [],
                      description: '',
                      url: ''
                    })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* URL Input with Auto-Fill - Optional */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job URL (Optional - We can auto-fill details for you!)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newJob.url}
                      onChange={(e) => setNewJob({...newJob, url: e.target.value})}
                      placeholder="https://careers.company.com/job-posting"
                      className="flex-1 px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={scrapeJobContent}
                      disabled={!newJob.url.trim() || scrapingJob}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {scrapingJob ? '🔄 Fetching...' : '🔍 Auto-Fill'}
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 <strong>Tip:</strong> Paste a job posting URL and click "Auto-Fill" to automatically populate all fields below!
                  </p>
                </div>

                {/* Job Details Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={newJob.title}
                      onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                      placeholder="e.g. Software Engineer"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                    <input
                      type="text"
                      value={newJob.company}
                      onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                      placeholder="e.g. OpenAI, Anthropic, Meta"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={newJob.location}
                      onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                      placeholder="e.g. San Francisco, Remote"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={newJob.department}
                      onChange={(e) => setNewJob({...newJob, department: e.target.value})}
                      placeholder="e.g. Engineering, Research"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={newJob.salary}
                      onChange={(e) => setNewJob({...newJob, salary: e.target.value})}
                      placeholder="e.g. $150K - $250K"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={newJob.salary_min || ''}
                      onChange={(e) => setNewJob({...newJob, salary_min: parseInt(e.target.value) || 0})}
                      placeholder="Min ($)"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={newJob.salary_max || ''}
                      onChange={(e) => setNewJob({...newJob, salary_max: parseInt(e.target.value) || 0})}
                      placeholder="Max ($)"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={newJob.skills.join(', ')}
                    onChange={(e) => setNewJob({...newJob, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                    placeholder="e.g. Python, Machine Learning, React"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                  <textarea
                    value={newJob.description}
                    onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                    placeholder="Job description and requirements..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>


                <div className="flex gap-3 pt-4">
                  <button
                    onClick={createJob}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    disabled={!newJob.title.trim() || !newJob.company.trim()}
                  >
                    Create Job
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateJobModal(false)
                      setNewJob({
                        title: '',
                        company: '',
                        location: '',
                        department: '',
                        salary: '',
                        salary_min: 0,
                        salary_max: 0,
                        skills: [],
                        description: '',
                        url: ''
                      })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Details Modal */}
        {showDuplicateDetails && duplicateStats && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Duplicate Job Analysis</h3>
                <button
                  onClick={() => setShowDuplicateDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-yellow-800">Summary</h4>
                    <div className="text-sm text-yellow-700">
                      Total Jobs: {duplicateStats.totalJobs} | 
                      Total Duplicates: {duplicateStats.summary.totalDuplicates} |
                      Companies with Duplicates: {duplicateStats.summary.companiesWithDuplicates}
                    </div>
                  </div>
                  {duplicateStats.summary.totalDuplicates > 0 && (
                    <p className="text-yellow-700 text-sm">
                      Found duplicate jobs that can be cleaned to improve data accuracy.
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto max-h-[50vh]">
                <div className="space-y-4">
                  {duplicateStats.companies.map((company: any, index: number) => (
                    <div key={company.company} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-lg">{company.company}</h4>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Total: {company.totalJobs}</span>
                          <span>Unique: {company.uniqueJobs}</span>
                          <span className={`${company.duplicateCount > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                            Duplicates: {company.duplicateCount}
                          </span>
                        </div>
                      </div>
                      
                      {company.duplicates.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-700 mb-2">Duplicate Jobs:</p>
                          <div className="space-y-1">
                            {company.duplicates.map((duplicate: any, dupIndex: number) => (
                              <div key={dupIndex} className="text-sm bg-red-50 px-3 py-2 rounded border border-red-200">
                                <span className="font-medium">{duplicate.title}</span>
                                <span className="text-red-600 ml-2">({duplicate.count} copies)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {company.duplicateCount === 0 && (
                        <p className="text-sm text-green-600">✅ No duplicates found for this company</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {duplicateStats.summary.totalDuplicates > 0 
                    ? `Ready to clean ${duplicateStats.summary.totalDuplicates} duplicate jobs`
                    : 'No duplicates to clean'}
                </div>
                <div className="flex gap-3">
                  {duplicateStats.summary.totalDuplicates > 0 && (
                    <button
                      onClick={cleanDuplicates}
                      disabled={cleaningDuplicates}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {cleaningDuplicates ? '🧹 Cleaning...' : `🧹 Clean ${duplicateStats.summary.totalDuplicates} Duplicates`}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDuplicateDetails(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <ResourcesTab 
            userId={userId}
          />
        )}

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  )
}