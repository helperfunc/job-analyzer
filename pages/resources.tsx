import { useState } from 'react'
import { useRouter } from 'next/router'

export default function ResourcesPage() {
  const router = useRouter()
  const [showMessage, setShowMessage] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Job Resources</h1>
              <p className="text-gray-600">Manage and organize resources that can be linked to specific jobs</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:underline px-4 py-2"
              >
                ← Back
              </button>
              <button
                onClick={() => router.push('/jobs')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Jobs
              </button>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center mb-6">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Resources Management System</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Create, organize, and link learning resources to your job applications. 
            Build your personalized collection of courses, books, videos, articles, and tools.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">📖</div>
              <h3 className="font-semibold text-blue-800">Learning Materials</h3>
              <p className="text-sm text-blue-600">Courses, books, videos, articles</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🔗</div>
              <h3 className="font-semibold text-green-800">Job Linking</h3>
              <p className="text-sm text-green-600">Connect resources to specific jobs</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-purple-800">Interview Prep</h3>
              <p className="text-sm text-purple-600">Questions, experiences, tips</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">
              ✨ The full resources management system is currently being finalized
            </p>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => {
                  setShowMessage(true)
                  setTimeout(() => setShowMessage(false), 3000)
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                🚀 Coming Soon - Create Resource
              </button>
              <button
                onClick={() => router.push('/jobs')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                📋 View All Jobs
              </button>
            </div>

            {showMessage && (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800">
                  🔧 The resources system has been successfully integrated into the job detail pages! 
                  You can already create and manage resources directly from individual job pages.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feature Preview */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Resource Types Available</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { type: 'Course', icon: '🎓', color: 'bg-blue-100 text-blue-700' },
              { type: 'Book', icon: '📚', color: 'bg-purple-100 text-purple-700' },
              { type: 'Video', icon: '🎥', color: 'bg-red-100 text-red-700' },
              { type: 'Article', icon: '📄', color: 'bg-green-100 text-green-700' },
              { type: 'Tool', icon: '🛠️', color: 'bg-yellow-100 text-yellow-700' },
              { type: 'Preparation', icon: '📝', color: 'bg-blue-100 text-blue-700' },
              { type: 'Questions', icon: '❓', color: 'bg-purple-100 text-purple-700' },
              { type: 'Experience', icon: '💡', color: 'bg-green-100 text-green-700' },
              { type: 'Notes', icon: '📋', color: 'bg-gray-100 text-gray-700' },
              { type: 'Other', icon: '🔖', color: 'bg-orange-100 text-orange-700' }
            ].map((item, index) => (
              <div key={index} className={`px-3 py-2 rounded-lg text-sm font-medium ${item.color} flex items-center gap-2`}>
                <span>{item.icon}</span>
                <span>{item.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Status */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">✅ What's Already Working</h3>
          <ul className="list-disc list-inside text-green-700 space-y-1">
            <li>Resource system integrated into job detail pages</li>
            <li>Create resources directly from job pages</li>
            <li>Link existing resources to jobs</li>
            <li>Support for all 10 resource types</li>
            <li>Database schema fully prepared</li>
          </ul>
          <p className="text-green-600 text-sm mt-3">
            🎉 You can start using resources right now by visiting any job detail page!
          </p>
        </div>
      </div>
    </div>
  )
}