import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 测试具体的职位URL - Principal Engineer GPU Platform
    const testUrls = [
      'https://openai.com/careers/principal-engineer-gpu-platform',
      'https://openai.com/careers/principal-engineer-gpu-platform/',
      'https://jobs.openai.com/principal-engineer-gpu-platform',
      'https://openai.com/jobs/principal-engineer-gpu-platform',
      'https://openai.com/careers/job/principal-engineer-gpu-platform',
      'https://openai.com/careers/search/principal-engineer-gpu-platform'
    ]
    
    const results: any[] = []
    
    console.log('测试已知的高薪职位URL...')
    
    for (const url of testUrls) {
      console.log(`\n测试: ${url}`)
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
          },
          redirect: 'follow'
        })
        
        const status = response.status
        const finalUrl = response.url
        let salaryFound = false
        let salaryInfo = ''
        let pageTitle = ''
        
        if (response.ok) {
          const html = await response.text()
          
          // 提取页面标题
          const titleMatch = html.match(/<title>(.*?)<\/title>/i)
          if (titleMatch) {
            pageTitle = titleMatch[1]
          }
          
          // 查找各种薪资格式
          const salaryPatterns = [
            /\$[\d,]+K?\s*[–\-]\s*\$[\d,]+K?/gi,  // $405K – $590K
            /\$[\d,]+\s*[–\-]\s*\$[\d,]+/gi,      // $405,000 - $590,000
            /USD\s*[\d,]+\s*[–\-]\s*[\d,]+/gi,    // USD 405000 - 590000
            /[\d,]+k\s*[–\-]\s*[\d,]+k/gi         // 405k - 590k
          ]
          
          for (const pattern of salaryPatterns) {
            const matches = html.match(pattern)
            if (matches) {
              salaryFound = true
              salaryInfo = matches[0]
              console.log(`✅ 找到薪资: ${salaryInfo}`)
              break
            }
          }
          
          // 如果没找到，查看是否有"405"和"590"这样的数字
          if (!salaryFound) {
            if (html.includes('405') && html.includes('590')) {
              console.log('⚠️ 页面包含405和590，但不是标准薪资格式')
              salaryInfo = '可能是 $405K-$590K (非标准格式)'
            }
          }
        }
        
        results.push({
          url,
          status,
          finalUrl: finalUrl !== url ? finalUrl : null,
          pageTitle,
          salaryFound,
          salaryInfo,
          success: response.ok
        })
        
      } catch (error) {
        results.push({
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }
    
    // 手动构建一个测试请求，看看能否访问
    console.log('\n尝试模拟浏览器请求...')
    try {
      const browserResponse = await fetch('https://openai.com/careers/principal-engineer-gpu-platform', {
        method: 'GET',
        headers: {
          'Host': 'openai.com',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      })
      
      console.log(`浏览器模拟响应: ${browserResponse.status}`)
      
      results.push({
        url: 'Browser simulation',
        status: browserResponse.status,
        success: browserResponse.ok,
        note: '模拟完整浏览器请求'
      })
    } catch (error) {
      console.error('浏览器模拟失败:', error)
    }
    
    return res.status(200).json({
      message: '测试Principal Engineer GPU Platform职位URL',
      expectedSalary: '$405K – $590K',
      results,
      analysis: {
        anySuccess: results.some(r => r.success),
        anySalaryFound: results.some(r => r.salaryFound),
        recommendation: results.some(r => r.salaryFound) ? 
          '找到了正确的URL格式！' : 
          '所有URL都无法获取薪资信息，可能需要其他方法（如浏览器自动化）'
      }
    })

  } catch (error) {
    res.status(500).json({ 
      error: '测试失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}