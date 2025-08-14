export default function SimpleResourcesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Resources Management</h1>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <p className="text-gray-600 mb-4">
            This is a simplified version of the resources page. The full version is being built.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Features Coming Soon:</h2>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Create and manage learning resources</li>
              <li>Link resources to specific jobs</li>
              <li>Search and filter resources by type</li>
              <li>Resource categories: courses, books, videos, articles, tools, etc.</li>
            </ul>
          </div>
          
          <div className="flex gap-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              + Create Resource
            </button>
            <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
              View All Jobs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}