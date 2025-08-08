import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    console.log(`🔍 尝试访问: ${url}`)
    
    // 尝试获取页面
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    console.log(`📄 响应状态: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      return res.status(200).json({
        success: false,
        error: `无法访问页面: HTTP ${response.status}`,
        message: "OpenAI网站可能有反爬虫保护，或者需要JavaScript才能加载职位信息",
        html_preview: null,
        suggestions: [
          "手动访问 https://openai.com/careers/search/",
          "查看页面源代码，看看职位是如何加载的",
          "可能需要使用浏览器自动化工具 (如Puppeteer)",
          "或者直接分析已知的高薪职位"
        ]
      })
    }

    const html = await response.text()
    
    console.log(`📝 获取到HTML长度: ${html.length}`)
    console.log(`🔍 HTML预览 (前500字符):`)
    console.log(html.substring(0, 500))
    
    // 检查是否包含职位相关内容
    const containsJobs = html.toLowerCase().includes('engineer') || 
                        html.toLowerCase().includes('scientist') || 
                        html.toLowerCase().includes('researcher')
    
    const isJavaScriptRequired = html.includes('javascript') && html.length < 5000
    
    return res.status(200).json({
      success: true,
      html_length: html.length,
      html_preview: html.substring(0, 1000),
      contains_job_keywords: containsJobs,
      javascript_required: isJavaScriptRequired,
      analysis: {
        message: containsJobs ? 
          "页面包含职位关键词，可能可以解析" : 
          "页面不包含明显的职位信息，可能需要JavaScript加载",
        next_steps: isJavaScriptRequired ? 
          ["需要浏览器自动化工具来执行JavaScript", "或者寻找API端点"] :
          ["可以尝试解析HTML内容", "使用cheerio提取职位信息"]
      }
    })

  } catch (error) {
    console.error('请求失败:', error)
    return res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      message: "网络请求失败，可能是网络问题或者网站阻止了请求",
      suggestions: [
        "检查网络连接",
        "可能需要使用代理",
        "或者网站有IP限制"
      ]
    })
  }
}