import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Job Analyzer. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Built with ❤️ by Huixu | Currently seeking opportunities in the US
            </p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-gray-600 text-sm">
              Contact: <a href="mailto:huixucom@gmail.com" className="text-blue-600 hover:text-blue-800 underline">
                huixucom@gmail.com
              </a>
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Open to Full-Stack / Backend / Frontend roles
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}