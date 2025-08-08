import { useState, useRef } from 'react'

interface ProgressLog {
  type: string
  message?: string
  jobTitle?: string
  salary?: string
  reason?: string
  current?: number
  total?: number
  totalJobs?: number
  withSalary?: number
  error?: string
  status?: number
  timestamp: string
}

export default function ScrapeProgress() {
  const [url, setUrl] = useState('https://openai.com/careers/search/')
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [finalResult, setFinalResult] = useState<any>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const startScraping = async () => {
    if (!url) return

    setIsRunning(true)
    setLogs([])
    setProgress({ current: 0, total: 0 })
    setFinalResult(null)

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      // Start the scraping process
      const eventSource = new EventSource('/api/scrape-progress')
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const timestamp = new Date().toLocaleTimeString()

        const logEntry: ProgressLog = {
          ...data,
          timestamp
        }

        setLogs(prev => [...prev, logEntry])

        if (data.type === 'progress') {
          setProgress({ current: data.current || 0, total: data.total || 0 })
        }

        if (data.type === 'complete') {
          setFinalResult({
            totalJobs: data.totalJobs,
            withSalary: data.withSalary,
            successRate: Math.round((data.withSalary / data.totalJobs) * 100)
          })
          setIsRunning(false)
          eventSource.close()
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error)
        setIsRunning(false)
        eventSource.close()
      }

    } catch (error) {
      console.error('Failed to start scraping:', error)
      setIsRunning(false)
    }
  }

  const stopScraping = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setIsRunning(false)
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case 'salary_found': return 'text-green-600'
      case 'no_salary': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'complete': return 'text-blue-600 font-bold'
      default: return 'text-gray-700'
    }
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'salary_found': return '✅'
      case 'no_salary': return '⚠️'
      case 'error': return '❌'
      case 'progress': return '🔍'
      case 'complete': return '🎉'
      default: return '📋'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          OpenAI 职位分析器 - 实时进度
        </h1>
        <p className="text-gray-600 mb-8">
          实时查看爬取进度和结果
        </p>

        <div className="space-y-4 mb-8">
          <input
            type="url"
            placeholder="输入OpenAI招聘页面URL"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isRunning}
          />

          <div className="flex space-x-4">
            <button
              onClick={startScraping}
              disabled={isRunning || !url}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? '爬取中...' : '开始爬取'}
            </button>

            {isRunning && (
              <button
                onClick={stopScraping}
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                停止爬取
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && progress.total > 0 && (
          <div className="mb-8 bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                进度: {progress.current} / {progress.total}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Final Results */}
        {finalResult && (
          <div className="mb-8 bg-green-50 p-6 rounded-lg border border-green-200">
            <h2 className="text-xl font-bold mb-4 text-gray-900">🎉 爬取完成</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{finalResult.totalJobs}</p>
                <p className="text-sm text-gray-600">总职位数</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{finalResult.withSalary}</p>
                <p className="text-sm text-gray-600">有薪资数据</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{finalResult.successRate}%</p>
                <p className="text-sm text-gray-600">成功率</p>
              </div>
            </div>
          </div>
        )}

        {/* Live Log */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">📋 实时日志</h2>
          </div>
          <div className="h-96 overflow-y-auto p-4 space-y-2 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">等待开始爬取...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`flex items-start space-x-2 ${getLogColor(log.type)}`}>
                  <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-400 mr-2">{log.timestamp}</span>
                    {log.type === 'progress' && (
                      <span>[{log.current}/{log.total}] {log.jobTitle}</span>
                    )}
                    {log.type === 'salary_found' && (
                      <span>Found salary: {log.jobTitle} - {log.salary}</span>
                    )}
                    {log.type === 'no_salary' && (
                      <span>No salary: {log.jobTitle} - {log.reason}</span>
                    )}
                    {log.type === 'error' && (
                      <span>Error: {log.jobTitle} - {log.error || `HTTP ${log.status}`}</span>
                    )}
                    {log.message && (
                      <span>{log.message}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}