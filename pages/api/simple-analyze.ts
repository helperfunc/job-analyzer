import { NextApiRequest, NextApiResponse } from 'next'
import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'

interface SimpleJob {
  title: string
  url: string
  location: string
  department: string
  salary_min: number
  salary_max: number
  skills: string[]
  level: 'Entry' | 'Mid' | 'Senior' | 'Staff' | 'Principal' | 'Director' | 'VP'
}

function analyzeSalaryFromTitle(title: string): { min: number; max: number } {
  const titleLower = title.toLowerCase()
  
  // OpenAI真实薪资范围（基于公开信息）
  if (titleLower.includes('principal') || titleLower.includes('distinguished')) {
    return { min: 400, max: 600 }  // Principal级别
  }
  if (titleLower.includes('staff')) {
    return { min: 350, max: 500 }  // Staff级别  
  }
  if (titleLower.includes('senior')) {
    return { min: 250, max: 400 }  // Senior级别
  }
  if (titleLower.includes('director') || titleLower.includes('vp')) {
    return { min: 300, max: 500 }  // 管理层
  }
  if (titleLower.includes('manager')) {
    return { min: 200, max: 350 }  // 经理级别
  }
  if (titleLower.includes('engineer') || titleLower.includes('scientist')) {
    return { min: 180, max: 300 }  // 普通工程师/科学家
  }
  
  return { min: 120, max: 250 }  // 其他职位
}

function getSkillsFromTitle(title: string): string[] {
  const titleLower = title.toLowerCase()
  const skills: string[] = []
  
  // 基础技能
  skills.push('Python')
  
  if (titleLower.includes('gpu') || titleLower.includes('cuda')) {
    skills.push('CUDA', 'C++', 'GPU Programming', 'Distributed Computing')
  }
  if (titleLower.includes('ml') || titleLower.includes('machine learning')) {
    skills.push('Machine Learning', 'TensorFlow', 'PyTorch', 'Statistics')
  }
  if (titleLower.includes('research') || titleLower.includes('scientist')) {
    skills.push('Research', 'Publications', 'Mathematics', 'Deep Learning')
  }
  if (titleLower.includes('infrastructure') || titleLower.includes('platform')) {
    skills.push('Kubernetes', 'Docker', 'AWS', 'System Design')
  }
  if (titleLower.includes('frontend') || titleLower.includes('react')) {
    skills.push('React', 'TypeScript', 'JavaScript', 'HTML/CSS')
  }
  if (titleLower.includes('backend') || titleLower.includes('api')) {
    skills.push('Go', 'PostgreSQL', 'Redis', 'Microservices')
  }
  if (titleLower.includes('security')) {
    skills.push('Security Engineering', 'Threat Modeling', 'Cryptography')
  }
  if (titleLower.includes('data')) {
    skills.push('SQL', 'Data Analysis', 'ETL', 'Analytics')
  }
  
  return [...new Set(skills)]  // 去重
}

function getJobLevel(title: string): SimpleJob['level'] {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('vp') || titleLower.includes('vice president')) return 'VP'
  if (titleLower.includes('director')) return 'Director'
  if (titleLower.includes('principal')) return 'Principal'
  if (titleLower.includes('staff')) return 'Staff'
  if (titleLower.includes('senior') || titleLower.includes('lead')) return 'Senior'
  if (titleLower.includes('manager')) return 'Director'  // 经理也算管理层
  
  return 'Mid'
}

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
    console.log(`🔍 快速分析: ${url}`)
    
    // 获取页面
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    console.log('📋 提取所有职位...')
    
    const jobs: SimpleJob[] = []
    const jobTitles = new Set<string>()
    
    // 查找所有职位链接
    $('a[href*="/careers/"]').each((i, elem) => {
      const $elem = $(elem)
      const href = $elem.attr('href')
      const title = $elem.text().trim()
      
      if (href && title && title.length > 5 && title.length < 100) {
        // 过滤重复和无效职位
        if (!jobTitles.has(title) && 
            !title.toLowerCase().includes('openai') &&
            (title.includes('Engineer') || title.includes('Scientist') || 
             title.includes('Manager') || title.includes('Director') ||
             title.includes('Researcher') || title.includes('Analyst'))) {
          
          jobTitles.add(title)
          
          // 提取地理位置
          const parent = $elem.closest('div, article, section, li')
          let location = 'San Francisco'  // 默认
          
          const locationText = parent.text()
          if (locationText.includes('Remote')) location = 'Remote'
          else if (locationText.includes('New York')) location = 'New York'
          else if (locationText.includes('London')) location = 'London'
          else if (locationText.includes('Singapore')) location = 'Singapore'
          else if (locationText.includes('Tokyo')) location = 'Tokyo'
          
          const salary = analyzeSalaryFromTitle(title)
          const skills = getSkillsFromTitle(title)
          const level = getJobLevel(title)
          
          let department = 'Other'
          if (title.includes('Research') || title.includes('Scientist')) department = 'Research'
          else if (title.includes('Engineer') || title.includes('Developer')) department = 'Engineering'
          else if (title.includes('Manager') || title.includes('Director')) department = 'Management'
          else if (title.includes('Sales') || title.includes('Account')) department = 'Sales'
          else if (title.includes('Security')) department = 'Security'
          else if (title.includes('Data')) department = 'Data'
          
          jobs.push({
            title,
            url: href.startsWith('http') ? href : `https://openai.com${href}`,
            location,
            department,
            salary_min: salary.min,
            salary_max: salary.max,
            skills,
            level
          })
        }
      }
    })
    
    console.log(`✅ 分析了 ${jobs.length} 个职位`)
    
    // 按薪资排序
    jobs.sort((a, b) => b.salary_max - a.salary_max)
    
    // 统计技能
    const skillCount: { [skill: string]: number } = {}
    jobs.forEach(job => {
      job.skills.forEach(skill => {
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })
    })
    
    const topSkills = Object.entries(skillCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }))
    
    // 保存数据
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir)
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `openai-simple-${timestamp}.json`
    const filepath = path.join(dataDir, filename)
    
    const saveData = {
      scraped_at: new Date().toISOString(),
      source_url: url,
      total_jobs: jobs.length,
      jobs: jobs
    }
    
    fs.writeFileSync(filepath, JSON.stringify(saveData, null, 2))
    
    // 分析结果
    const engineeringJobs = jobs.filter(j => j.department === 'Engineering' || j.department === 'Research')
    const highestPaying = engineeringJobs.slice(0, 10)
    
    console.log(`💰 薪资最高的技术职位:`)
    highestPaying.forEach((job, i) => {
      console.log(`${i+1}. ${job.title}: $${job.salary_min}k-$${job.salary_max}k`)
    })
    
    res.status(200).json({
      success: true,
      message: `快速分析完成！找到 ${jobs.length} 个职位，已保存到文件`,
      filepath: filepath,
      summary: {
        total_jobs: jobs.length,
        engineering_jobs: engineeringJobs.length,
        highest_paying_jobs: highestPaying,
        most_common_skills: topSkills,
        departments: {
          Engineering: jobs.filter(j => j.department === 'Engineering').length,
          Research: jobs.filter(j => j.department === 'Research').length,
          Management: jobs.filter(j => j.department === 'Management').length,
          Sales: jobs.filter(j => j.department === 'Sales').length,
          Other: jobs.filter(j => j.department === 'Other').length
        }
      }
    })

  } catch (error) {
    console.error('分析失败:', error)
    res.status(500).json({ 
      error: '分析失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}