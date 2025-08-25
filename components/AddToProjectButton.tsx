import { useState, useEffect } from 'react'

interface AddToProjectButtonProps {
  itemId: string
  itemType: 'job' | 'paper' | 'resource'
  itemTitle: string
  className?: string
}

interface Project {
  id: string
  title: string
  status: string
  category: string
}

export default function AddToProjectButton({ 
  itemId, 
  itemType, 
  itemTitle, 
  className = '' 
}: AddToProjectButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  useEffect(() => {
    if (showModal) {
      fetchProjects()
    }
  }, [showModal])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      if (data.success) {
        setProjects(data.data)
        // Find projects that already contain this item
        const linkedProjects = data.data
          .filter((p: Project) => {
            const linkedField = `linked_${itemType}s` as keyof Project
            return (p as any)[linkedField]?.includes(itemId)
          })
          .map((p: Project) => p.id)
        setSelectedProjects(linkedProjects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Update each project
      const updatePromises = projects.map(async (project) => {
        const isCurrentlyLinked = (project as any)[`linked_${itemType}s`]?.includes(itemId) || false
        const shouldBeLinked = selectedProjects.includes(project.id)
        
        if (isCurrentlyLinked !== shouldBeLinked) {
          const currentLinks = (project as any)[`linked_${itemType}s`] || []
          let newLinks
          
          if (shouldBeLinked) {
            newLinks = [...currentLinks, itemId]
          } else {
            newLinks = currentLinks.filter((id: string) => id !== itemId)
          }
          
          const updateData = {
            ...project,
            [`linked_${itemType}s`]: newLinks
          }
          
          return fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
          })
        }
        return Promise.resolve()
      })

      await Promise.all(updatePromises)
      setShowModal(false)
      
      // Show success message
      const linkedCount = selectedProjects.length
      console.log(`✅ ${itemTitle} linked to ${linkedCount} project${linkedCount !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error updating projects:', error)
    }
  }

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 ${className}`}
        title="Add to project"
      >
        📋 Projects
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add to Projects</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600 mb-1">Adding:</div>
              <div className="font-medium">{itemTitle}</div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-500 mb-4">No projects found</p>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      window.location.href = '/projects'
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Create your first project
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map(project => (
                    <label
                      key={project.id}
                      className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project.id)}
                        onChange={() => toggleProject(project.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{project.title}</div>
                        <div className="text-sm text-gray-500">
                          {project.status} • {project.category.replace('_', ' ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {projects.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save ({selectedProjects.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}