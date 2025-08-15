import React from 'react'
import Link from 'next/link'

export default function Guide() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">AI Job Analyzer User Guide</h1>
          <p className="text-gray-600">
            Welcome to AI Job Analyzer! This guide will help you make full use of the system's features to improve your job search efficiency.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Home Page Features */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🏠 <span className="ml-2">Home - Job Analysis</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Quick Start</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Select Company</strong>: Click "OpenAI" or "Anthropic" buttons to quickly analyze positions from the respective companies</li>
                  <li><strong>Custom Scraping</strong>: Enter any company's job page URL, supports most mainstream job sites</li>
                  <li><strong>Job Statistics</strong>: View total number of positions and positions with salary data</li>
                  <li><strong>Salary Analysis</strong>: Browse the highest-paying job listings</li>
                  <li><strong>Skill Statistics</strong>: Understand the most common skill requirements</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-600 mb-2">Data Management</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Auto Import</strong>: Analysis results are automatically saved to the database</li>
                  <li><strong>Clear Data</strong>: Use the "🗑️ Clear All Data" button to empty the database</li>
                  <li><strong>Data Persistence</strong>: All data is stored in the database and won't be lost on refresh</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Jobs Page */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              📋 <span className="ml-2">Jobs - Job Management</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">Job Browsing & Sorting</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Smart Sorting</strong>: Default sorting by salary from high to low, with same salary sorted by creation time</li>
                  <li><strong>Multiple Sorting Options</strong>: Support sorting by salary level, creation time, and other criteria</li>
                  <li><strong>Advanced Filtering</strong>: Filter positions by company, department, salary range</li>
                  <li><strong>Paginated Display</strong>: Support paginated browsing to improve loading speed</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-600 mb-2">Job Details</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Detailed Information</strong>: View job title, company, location, salary, skill requirements</li>
                  <li><strong>Salary Display</strong>: Clear display of salary ranges with formatted presentation</li>
                  <li><strong>Skill Tags</strong>: Click on skill tags to view related positions</li>
                  <li><strong>Original Link</strong>: Direct link to the company's official job posting page</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Research Center */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🔬 <span className="ml-2">Research Center - Research Papers</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">📚 Papers & Research</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Paper Scraping</strong>: One-click access to the latest research papers from OpenAI and Anthropic</li>
                  <li><strong>Smart Filtering</strong>: Search papers by company, year, keywords</li>
                  <li><strong>Job Linking</strong>: Connect papers with related positions for easy research</li>
                  <li><strong>Multiple Link Support</strong>: View original paper, arXiv, GitHub and other links</li>
                  <li><strong>Batch Management</strong>: Support deleting individual papers or clearing all papers</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-600 mb-2">🔗 Job Linking Features</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Bidirectional Linking</strong>: Link from paper pages to positions, and from job pages to papers</li>
                  <li><strong>Relevance Assessment</strong>: System automatically evaluates the relevance between papers and positions</li>
                  <li><strong>Easy Management</strong>: Create or remove associations at any time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Resources System */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              📚 <span className="ml-2">Resources - Resource Management</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-600 mb-2">🎯 Unified Resource System</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Multiple Type Support</strong>: Courses, books, videos, articles, tools, interview preparation and 10 other types</li>
                  <li><strong>Job Association</strong>: Create and link resources directly from job detail pages</li>
                  <li><strong>Flexible Management</strong>: Create independent resources or link them to specific positions</li>
                  <li><strong>Tag System</strong>: Add tags to resources for easy categorization and search</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">💼 Using on Job Pages</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Create Resources</strong>: Click "+ Create Resource" to directly create resources for positions</li>
                  <li><strong>Link Existing Resources</strong>: Use "+ Link Existing" to associate existing resources</li>
                  <li><strong>Resource Display</strong>: View all learning materials linked to the position</li>
                  <li><strong>Quick Access</strong>: One-click access to resource URLs or view detailed descriptions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Comparison Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🔥 <span className="ml-2">Compare - Comparison Analysis</span>
            </h2>
            
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">🏢 Company Comparison</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li><strong>Comprehensive Comparison</strong>: OpenAI vs Anthropic salary, positions, and skill requirements comparison</li>
                  <li><strong>Salary Analysis</strong>: Compare salary levels and distribution between the two companies</li>
                  <li><strong>Skill Requirements</strong>: Analyze common skills and unique skill requirements</li>
                  <li><strong>Position Analysis</strong>: Compare job categories and recruitment focus</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg shadow-sm border border-blue-200">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              💡 <span className="ml-2">Usage Tips & Best Practices</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-2">⚡ Efficiency Improvement</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li>Use quick company buttons to fetch data, avoiding repetitive URL input</li>
                  <li>Utilize salary sorting to quickly find high-paying positions</li>
                  <li>Explore related job opportunities through skill tags</li>
                  <li>Establish paper-job associations for in-depth research</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-purple-600 mb-2">🎯 Job Search Strategy</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  <li>Create dedicated learning resource libraries for target positions</li>
                  <li>Research companies' latest papers to understand technical directions</li>
                  <li>Use comparison features to set job search priorities</li>
                  <li>Regularly clean and update job data to maintain currency</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🚀 <span className="ml-2">Quick Navigation</span>
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/" className="bg-blue-100 hover:bg-blue-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">🏠</div>
                <div className="font-semibold text-blue-800">Home</div>
                <div className="text-xs text-blue-600">Job Analysis</div>
              </Link>
              
              <Link href="/jobs" className="bg-green-100 hover:bg-green-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-green-800">Jobs</div>
                <div className="text-xs text-green-600">Job Browsing</div>
              </Link>
              
              <Link href="/research" className="bg-purple-100 hover:bg-purple-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">🔬</div>
                <div className="font-semibold text-purple-800">Research</div>
                <div className="text-xs text-purple-600">Research Papers</div>
              </Link>
              
              <Link href="/resources" className="bg-orange-100 hover:bg-orange-200 p-4 rounded-lg text-center transition-colors">
                <div className="text-2xl mb-2">📚</div>
                <div className="font-semibold text-orange-800">Resources</div>
                <div className="text-xs text-orange-600">Resource Management</div>
              </Link>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">📋 System Information</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-gray-600 mb-2">Technology Stack</h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>Next.js 14</li>
                  <li>TypeScript</li>
                  <li>Supabase (PostgreSQL)</li>
                  <li>Tailwind CSS</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-600 mb-2">Core Features</h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>Smart Job Scraping</li>
                  <li>Salary Analysis & Sorting</li>
                  <li>Research Paper Association</li>
                  <li>Resource Management System</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-600 mb-2">Data Support</h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>OpenAI Jobs</li>
                  <li>Anthropic Jobs</li>
                  <li>Research Paper Library</li>
                  <li>Learning Resource Library</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}