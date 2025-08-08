import { useState } from 'react'

export default function TestScrape() {
  const [url, setUrl] = useState('https://openai.com/careers/search/')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testScrape = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/simple-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ 
        success: false, 
        error: err instanceof Error ? err.message : '请求失败' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">网页访问测试</h1>
        
        <div className="space-y-4 mb-6">
          <input
            type="url"
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          
          <button
            onClick={testScrape}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? '测试中...' : '测试访问'}
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
              <h2 className="font-bold mb-2">
                {result.success ? '✅ 访问成功' : '❌ 访问失败'}
              </h2>
              <p className="text-sm">{result.message || result.error}</p>
            </div>

            {result.success && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold mb-2">📊 页面分析</h3>
                  <ul className="text-sm space-y-1">
                    <li>HTML长度: {result.html_length} 字符</li>
                    <li>包含职位关键词: {result.contains_job_keywords ? '是' : '否'}</li>
                    <li>需要JavaScript: {result.javascript_required ? '是' : '否'}</li>
                  </ul>
                  <p className="mt-2 text-sm font-medium">{result.analysis?.message}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold mb-2">📄 HTML预览 (前1000字符)</h3>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                    {result.html_preview}
                  </pre>
                </div>
              </div>
            )}

            {result.suggestions && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-bold mb-2">💡 建议</h3>
                <ul className="text-sm list-disc list-inside space-y-1">
                  {result.suggestions.map((suggestion: string, i: number) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}