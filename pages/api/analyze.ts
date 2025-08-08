import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    // 检查缓存
    if (supabase) {
      const { data: cached } = await supabase
        .from('analysis_cache')
        .select('parsed_data')
        .eq('url', url)
        .single()
      
      if (cached) {
        return res.status(200).json(cached.parsed_data)
      }
    }

    // 1. 获取页面内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch job page')
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 2. 提取文本内容 (限制长度以节省API费用)
    // 移除script和style标签
    $('script, style').remove()
    
    // 获取主要内容
    let jobText = ''
    
    // 尝试获取结构化数据
    const structuredData = $('script[type="application/ld+json"]').text()
    if (structuredData) {
      jobText += structuredData + '\n\n'
    }
    
    // 特别查找薪资信息
    const salaryPatterns = [
      /\$[\d,]+K?\s*[–-]\s*\$[\d,]+K?/gi,
      /\$[\d,]+\s*[–-]\s*\$[\d,]+/gi,
      /[\d,]+k\s*[–-]\s*[\d,]+k/gi
    ]
    
    let salaryInfo = ''
    for (const pattern of salaryPatterns) {
      const matches = $('body').text().match(pattern)
      if (matches) {
        salaryInfo = matches[0]
        break
      }
    }
    
    // 获取页面主要文本
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 4000)
    
    jobText += bodyText
    
    // 确保薪资信息在文本中
    if (salaryInfo && !jobText.includes(salaryInfo)) {
      jobText = `Salary: ${salaryInfo}\n\n${jobText}`
    }

    // 3. 使用AI解析
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Extract job information from the text. Return valid JSON only with these fields:
- title: job title (string)
- company: company name (string)
- location: job location (string)
- salary_min: minimum salary in thousands USD (number, e.g., 405 for $405K)
- salary_max: maximum salary in thousands USD (number, e.g., 590 for $590K)
- skills: array of technical skills mentioned (focus on programming languages, frameworks, tools)
- description: brief job description (optional, max 200 chars)

IMPORTANT: Look for salary in various formats:
- "$405K – $590K" → salary_min: 405, salary_max: 590
- "$150,000 - $200,000" → salary_min: 150, salary_max: 200
- "150k-200k" → salary_min: 150, salary_max: 200

If no salary mentioned, return null for salary fields, do NOT estimate.`
        },
        {
          role: "user",
          content: `Extract job information from this posting:\n\n${jobText}`
        }
      ],
      temperature: 0,
      max_tokens: 500,
    })

    const responseContent = completion.choices[0].message.content
    if (!responseContent) {
      throw new Error('No response from AI')
    }

    // 解析AI返回的JSON
    let parsed
    try {
      parsed = JSON.parse(responseContent)
    } catch (e) {
      // 如果解析失败，尝试提取JSON部分
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    // 验证必要字段
    if (!parsed.title || !parsed.company) {
      throw new Error('Missing required job information')
    }

    // 确保薪资是数字，但如果AI返回null则保持null
    if (parsed.salary_min !== null && parsed.salary_min !== undefined) {
      parsed.salary_min = Number(parsed.salary_min)
    }
    if (parsed.salary_max !== null && parsed.salary_max !== undefined) {
      parsed.salary_max = Number(parsed.salary_max)
    }
    
    // 只有在完全没有薪资信息时才估算
    if (!parsed.salary_min && !parsed.salary_max) {
      const titleLower = parsed.title?.toLowerCase() || ''
      if (titleLower.includes('principal') || titleLower.includes('staff')) {
        parsed.salary_min = 300
        parsed.salary_max = 500
      } else if (titleLower.includes('senior') || titleLower.includes('lead')) {
        parsed.salary_min = 200
        parsed.salary_max = 350
      } else if (titleLower.includes('manager') || titleLower.includes('director')) {
        parsed.salary_min = 250
        parsed.salary_max = 400
      } else if (titleLower.includes('intern')) {
        parsed.salary_min = 40
        parsed.salary_max = 80
      } else {
        parsed.salary_min = 120
        parsed.salary_max = 200
      }
    }

    // 确保skills是数组
    if (!Array.isArray(parsed.skills)) {
      parsed.skills = []
    }

    // 4. 保存到数据库（如果配置了）
    if (supabase) {
      try {
        // 保存到jobs表
        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            url,
            company: parsed.company,
            title: parsed.title,
            location: parsed.location,
            salary_min: parsed.salary_min,
            salary_max: parsed.salary_max,
            description: parsed.description,
            skills: parsed.skills,
          })
        
        if (jobError) console.error('Error saving job:', jobError)
        
        // 保存到缓存
        const { error: cacheError } = await supabase
          .from('analysis_cache')
          .upsert({
            url,
            parsed_data: parsed,
          })
        
        if (cacheError) console.error('Error saving cache:', cacheError)
      } catch (dbError) {
        // 数据库错误不影响返回结果
        console.error('Database error:', dbError)
      }
    }

    // 5. 返回结果
    res.status(200).json(parsed)
  } catch (error) {
    console.error('Error analyzing job:', error)
    res.status(500).json({ 
      error: 'Failed to analyze job',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}