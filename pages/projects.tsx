import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import LinkItemsModal from '../components/LinkItemsModal'

interface Project {
  id: string
  title: string
  description: string
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  priority: 'low' | 'medium' | 'high'
  category: 'job_search' | 'skill_development' | 'research' | 'networking' | 'other'
  target_date?: string
  progress: number
  tags: string[]
  linked_jobs: string[]
  linked_papers: string[]
  linked_resources: string[]
  notes: string
  is_public: boolean
  created_at: string
  updated_at: string
  user_id: string
  username: string
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

export default function ProjectsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showLinkModal, setShowLinkModal] = useState<Project | null>(null)
  
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: ''
  })
  
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    status: 'planning' as Project['status'],
    priority: 'medium' as Project['priority'],
    category: 'job_search' as Project['category'],
    target_date: '',
    tags: [] as string[],
    notes: '',
    is_public: false
  })

  const [currentTagInput, setCurrentTagInput] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchProjects()
    fetchLinkedData()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      if (data.success) {
        setProjects(data.data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      showToast('❌ Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchLinkedData = async () => {
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

      if (jobsData.success) setJobs(jobsData.data.slice(0, 50))
      if (papersData.success) setPapers(papersData.data.slice(0, 50))
      if (resourcesData.success) setResources(resourcesData.data.slice(0, 50))
    } catch (error) {
      console.error('Error fetching linked data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.title.trim()) return

    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects'
      const method = editingProject ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          progress: editingProject?.progress || 0
        })
      })

      const data = await response.json()
      if (data.success) {
        showToast(`✅ Project ${editingProject ? 'updated' : 'created'} successfully`)
        fetchProjects()
        resetForm()
      } else {
        showToast('❌ Failed to save project')
      }
    } catch (error) {
      console.error('Error saving project:', error)
      showToast('❌ Failed to save project')
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('✅ Project deleted successfully')
        fetchProjects()
        setSelectedProject(null)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      showToast('❌ Failed to delete project')
    }
  }

  const updateProgress = async (project: Project, newProgress: number) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...project,
          progress: newProgress,
          status: newProgress === 100 ? 'completed' : project.status
        })
      })

      if (response.ok) {
        fetchProjects()
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const resetForm = () => {
    setShowCreateModal(false)
    setEditingProject(null)
    setNewProject({
      title: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      category: 'job_search',
      target_date: '',
      tags: [],
      notes: '',
      is_public: false
    })
  }

  const addTag = () => {
    if (currentTagInput.trim() && !newProject.tags.includes(currentTagInput.trim())) {
      setNewProject({
        ...newProject,
        tags: [...newProject.tags, currentTagInput.trim()]
      })
      setCurrentTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setNewProject({
      ...newProject,
      tags: newProject.tags.filter(tag => tag !== tagToRemove)
    })
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  const handleUpdateLinks = async (
    linkedJobs: string[], 
    linkedPapers: string[], 
    linkedResources: string[]
  ) => {
    if (!showLinkModal) return

    try {
      const response = await fetch(`/api/projects/${showLinkModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...showLinkModal,
          linked_jobs: linkedJobs,
          linked_papers: linkedPapers,
          linked_resources: linkedResources
        })
      })

      if (response.ok) {
        showToast('✅ Project links updated successfully')
        fetchProjects()
        setShowLinkModal(null)
      } else {
        showToast('❌ Failed to update project links')
      }
    } catch (error) {
      console.error('Error updating project links:', error)
      showToast('❌ Failed to update project links')
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesStatus = filters.status === 'all' || project.status === filters.status
    const matchesPriority = filters.priority === 'all' || project.priority === filters.priority
    const matchesCategory = filters.category === 'all' || project.category === filters.category
    const matchesSearch = !filters.search || 
      project.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      project.description.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch
  })

  const statusColors = {
    planning: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    on_hold: 'bg-yellow-100 text-yellow-800'
  }

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }

  const categoryIcons = {
    job_search: '💼',
    skill_development: '🎯',
    research: '📚',
    networking: '🤝',
    other: '📂'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 bg-white border rounded-lg shadow-lg px-4 py-2 z-50">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
              <p className="text-gray-600 mt-2">
                Track your career projects, connect them with jobs, research, and resources
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              ➕ New Project
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search projects..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Categories</option>
              <option value="job_search">Job Search</option>
              <option value="skill_development">Skill Development</option>
              <option value="research">Research</option>
              <option value="networking">Networking</option>
              <option value="other">Other</option>
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              {filteredProjects.length} of {projects.length} projects
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No projects found</h3>
                <p className="text-gray-500 mb-4">
                  {filters.search || filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start your first project to organize your career goals'}
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  ➕ Create Your First Project
                </button>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{categoryIcons[project.category]}</span>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{project.title}</h3>
                    </div>
                    <div className="flex gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[project.status]}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[project.priority]}`}>
                        {project.priority}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{project.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Connections */}
                  <div className="flex gap-4 text-xs text-gray-500">
                    {project.linked_jobs.length > 0 && (
                      <span>💼 {project.linked_jobs.length} jobs</span>
                    )}
                    {project.linked_papers.length > 0 && (
                      <span>📚 {project.linked_papers.length} papers</span>
                    )}
                    {project.linked_resources.length > 0 && (
                      <span>📝 {project.linked_resources.length} resources</span>
                    )}
                  </div>

                  {project.target_date && (
                    <div className="text-xs text-gray-500 mt-2">
                      Target: {new Date(project.target_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Create/Edit Project Modal */}
        {(showCreateModal || editingProject) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingProject ? 'Edit Project' : 'Create New Project'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                    placeholder="e.g., Learn React for Frontend Development"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    placeholder="Describe your project goals and objectives..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={newProject.status}
                      onChange={(e) => setNewProject({...newProject, status: e.target.value as Project['status']})}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="planning">Planning</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({...newProject, priority: e.target.value as Project['priority']})}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newProject.category}
                      onChange={(e) => setNewProject({...newProject, category: e.target.value as Project['category']})}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="job_search">Job Search</option>
                      <option value="skill_development">Skill Development</option>
                      <option value="research">Research</option>
                      <option value="networking">Networking</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newProject.target_date}
                    onChange={(e) => setNewProject({...newProject, target_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentTagInput}
                      onChange={(e) => setCurrentTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag..."
                      className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {newProject.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newProject.notes}
                    onChange={(e) => setNewProject({...newProject, notes: e.target.value})}
                    placeholder="Any additional notes or thoughts..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={newProject.is_public}
                    onChange={(e) => setNewProject({...newProject, is_public: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_public" className="text-sm text-gray-700">
                    Make this project public (others can see and comment)
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingProject ? 'Update' : 'Create'} Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Project Detail Modal */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedProject.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowLinkModal(selectedProject)
                      setSelectedProject(null)
                    }}
                    className="text-green-600 hover:text-green-800"
                  >
                    🔗 Link Items
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(selectedProject)
                      setNewProject({
                        title: selectedProject.title,
                        description: selectedProject.description,
                        status: selectedProject.status,
                        priority: selectedProject.priority,
                        category: selectedProject.category,
                        target_date: selectedProject.target_date || '',
                        tags: selectedProject.tags,
                        notes: selectedProject.notes,
                        is_public: selectedProject.is_public
                      })
                      setSelectedProject(null)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedProject.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️ Delete
                  </button>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Project Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[selectedProject.status]}`}>
                      {selectedProject.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${priorityColors[selectedProject.priority]}`}>
                      {selectedProject.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <span className="text-sm text-gray-900">
                      {categoryIcons[selectedProject.category]} {selectedProject.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Progress: {selectedProject.progress}%</label>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${selectedProject.progress}%` }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedProject.progress}
                    onChange={(e) => updateProgress(selectedProject, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-700">{selectedProject.description}</p>
                  </div>
                )}

                {/* Tags */}
                {selectedProject.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Connected Items</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">💼 Linked Jobs ({selectedProject.linked_jobs.length})</h5>
                      {selectedProject.linked_jobs.length === 0 ? (
                        <p className="text-sm text-gray-500">No jobs connected</p>
                      ) : (
                        <div className="space-y-1">
                          {selectedProject.linked_jobs.slice(0, 3).map(jobId => {
                            const job = jobs.find(j => j.id === jobId)
                            return job ? (
                              <div key={jobId} className="text-sm bg-gray-50 p-2 rounded">
                                {job.title} - {job.company}
                              </div>
                            ) : null
                          })}
                          {selectedProject.linked_jobs.length > 3 && (
                            <p className="text-xs text-gray-500">+{selectedProject.linked_jobs.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">📚 Linked Papers ({selectedProject.linked_papers.length})</h5>
                      {selectedProject.linked_papers.length === 0 ? (
                        <p className="text-sm text-gray-500">No papers connected</p>
                      ) : (
                        <div className="space-y-1">
                          {selectedProject.linked_papers.slice(0, 3).map(paperId => {
                            const paper = papers.find(p => p.id === paperId)
                            return paper ? (
                              <div key={paperId} className="text-sm bg-gray-50 p-2 rounded">
                                {paper.title.substring(0, 50)}...
                              </div>
                            ) : null
                          })}
                          {selectedProject.linked_papers.length > 3 && (
                            <p className="text-xs text-gray-500">+{selectedProject.linked_papers.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">📝 Linked Resources ({selectedProject.linked_resources.length})</h5>
                      {selectedProject.linked_resources.length === 0 ? (
                        <p className="text-sm text-gray-500">No resources connected</p>
                      ) : (
                        <div className="space-y-1">
                          {selectedProject.linked_resources.slice(0, 3).map(resourceId => {
                            const resource = resources.find(r => r.id === resourceId)
                            return resource ? (
                              <div key={resourceId} className="text-sm bg-gray-50 p-2 rounded">
                                {resource.title}
                              </div>
                            ) : null
                          })}
                          {selectedProject.linked_resources.length > 3 && (
                            <p className="text-xs text-gray-500">+{selectedProject.linked_resources.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedProject.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedProject.notes}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500 border-t pt-4">
                  <p>Created: {new Date(selectedProject.created_at).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedProject.updated_at).toLocaleString()}</p>
                  {selectedProject.target_date && (
                    <p>Target Date: {new Date(selectedProject.target_date).toLocaleDateString()}</p>
                  )}
                  <p>Visibility: {selectedProject.is_public ? 'Public' : 'Private'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Items Modal */}
        {showLinkModal && (
          <LinkItemsModal
            projectId={showLinkModal.id}
            currentLinkedJobs={showLinkModal.linked_jobs}
            currentLinkedPapers={showLinkModal.linked_papers}
            currentLinkedResources={showLinkModal.linked_resources}
            onUpdate={handleUpdateLinks}
            onClose={() => setShowLinkModal(null)}
          />
        )}
      </div>
    </div>
  )
}