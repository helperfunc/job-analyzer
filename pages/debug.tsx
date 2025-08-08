import { useState } from 'react'

export default function Debug() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const debug = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/debug-job-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : '请求失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">调试：找出正确的职位URL格式</h1>
        
        <button
          onClick={debug}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 mb-6"
        >
          {loading ? '调试中...' : '开始调试'}
        </button>

        {result && (
          <div className="space-y-4">
            {result.jobTitle && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h2 className="font-bold mb-2">找到的职位</h2>
                <p>标题: {result.jobTitle}</p>
                <p>原始链接: {result.originalHref}</p>
              </div>
            )}

            {result.testedUrls && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="font-bold mb-2">测试结果</h2>
                {result.testedUrls.map((test: any, i: number) => (
                  <div key={i} className={`mb-3 p-3 rounded ${test.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className="font-mono text-sm">{test.url}</p>
                    <p className="text-sm">
                      状态: {test.status || test.error} | 
                      {test.salaryFound ? ` ✅ 找到薪资: ${test.salaryInfo}` : ' ❌ 未找到薪资'}
                    </p>
                    {test.finalUrl && test.finalUrl !== test.url && (
                      <p className="text-xs text-gray-600">重定向到: {test.finalUrl}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.recommendation && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h2 className="font-bold mb-2">建议</h2>
                <p>{result.recommendation}</p>
                {result.successfulPattern && (
                  <p className="mt-2 font-mono text-sm bg-white p-2 rounded">
                    正确格式: {result.successfulPattern}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}