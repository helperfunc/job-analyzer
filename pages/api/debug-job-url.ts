import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. 先获取招聘主页
    console.log('1️⃣ 获取招聘主页...')
    const mainResponse = await fetch('https://openai.com/careers/search/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    const html = await mainResponse.text()
    const $ = cheerio.load(html)
    
    // 2. 找到第一个工程师职位
    console.log('2️⃣ 查找职位链接...')
    let firstJobUrl = ''
    let firstJobTitle = ''
    
    $('a').each((i, elem) => {
      const href = $(elem).attr('href') || ''
      const text = $(elem).text().trim()
      
      if (text.toLowerCase().includes('engineer') && href.includes('/careers/') && !firstJobUrl) {
        firstJobUrl = href
        firstJobTitle = text
        console.log(`找到职位: ${text}`)
        console.log(`原始href: ${href}`)
      }
    })
    
    if (!firstJobUrl) {
      return res.status(200).json({ 
        error: '未找到工程师职位',
        suggestion: '页面可能结构已变化' 
      })
    }
    
    // 3. 构建完整URL的不同方式
    const urlVariations = [
      firstJobUrl, // 原始
      firstJobUrl.startsWith('http') ? firstJobUrl : `https://openai.com${firstJobUrl}`,
      `https://openai.com${firstJobUrl.replace(/^\//, '')}`,
      `https://openai.com/careers/${firstJobUrl.split('/').pop()}`,
      `https://openai.com/careers/search/${firstJobUrl.split('/').pop()}`
    ]
    
    console.log('3️⃣ 尝试不同的URL格式...')
    const results: any[] = []
    
    for (const url of [...new Set(urlVariations)]) {
      console.log(`\n尝试: ${url}`)
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          redirect: 'follow'
        })
        
        const finalUrl = response.url
        const status = response.status
        const contentType = response.headers.get('content-type')
        
        let salaryFound = false
        let salaryInfo = ''
        
        if (response.ok) {
          const jobHtml = await response.text()
          
          // 查找薪资信息
          const salaryPatterns = [
            /\$[\d,]+K?\s*[–-]\s*\$[\d,]+K?/gi,
            /\$[\d,]+\s*[–-]\s*\$[\d,]+/gi,
            /[\d,]+k\s*[–-]\s*[\d,]+k/gi
          ]
          
          for (const pattern of salaryPatterns) {
            const matches = jobHtml.match(pattern)
            if (matches && matches[0]) {
              salaryFound = true
              salaryInfo = matches[0]
              break
            }
          }
        }
        
        results.push({
          url,
          finalUrl,
          status,
          contentType,
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
    
    // 4. 分析结果
    const successfulUrl = results.find(r => r.success && r.salaryFound)
    
    return res.status(200).json({
      jobTitle: firstJobTitle,
      originalHref: firstJobUrl,
      testedUrls: results,
      recommendation: successfulUrl ? 
        `使用这个URL格式: ${successfulUrl.url}` : 
        '所有URL格式都无法获取薪资信息，可能需要其他方法',
      successfulPattern: successfulUrl ? successfulUrl.url : null
    })

  } catch (error) {
    console.error('调试失败:', error)
    res.status(500).json({ 
      error: '调试失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}