const fs = require('fs')
const path = require('path')

function analyzeSalaryPatterns() {
  console.log('📊 分析OpenAI职位薪资模式...')
  
  // Read the latest data file
  const dataDir = path.join(process.cwd(), 'data')
  
  if (!fs.existsSync(dataDir)) {
    console.log('❌ 没有找到data目录')
    return
  }
  
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
  if (files.length === 0) {
    console.log('❌ 没有找到数据文件')
    return
  }
  
  // Get the latest file
  const latestFile = files.sort().pop()
  const filepath = path.join(dataDir, latestFile)
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
  
  console.log(`📁 分析文件: ${latestFile}`)
  console.log(`📊 总职位数: ${data.jobs.length}`)
  console.log(`📊 有薪资职位: ${data.jobs.filter(j => j.salary_min).length}`)
  
  // Categorize jobs
  const categories = {
    'Engineering': [],
    'Sales': [],
    'Management': [],
    'Research': [],
    'Product': [],
    'Data': [],
    'International': [],
    'Other': []
  }
  
  data.jobs.forEach(job => {
    const title = job.title.toLowerCase()
    const location = job.location || 'Unknown'
    
    if (title.includes('engineer') || title.includes('software')) {
      categories.Engineering.push(job)
    } else if (title.includes('account director') || title.includes('sales')) {
      categories.Sales.push(job)
    } else if (title.includes('manager') || title.includes('director')) {
      categories.Management.push(job)
    } else if (title.includes('research') || title.includes('scientist')) {
      categories.Research.push(job)
    } else if (title.includes('product')) {
      categories.Product.push(job)
    } else if (title.includes('data') || title.includes('analyst')) {
      categories.Data.push(job)
    } else if (!['San Francisco', 'Remote', 'New York City', 'Seattle'].includes(location)) {
      categories.International.push(job)
    } else {
      categories.Other.push(job)
    }
  })
  
  console.log('\n📈 各类别薪资统计:')
  console.log('=' .repeat(60))
  
  Object.entries(categories).forEach(([category, jobs]) => {
    if (jobs.length === 0) return
    
    const withSalary = jobs.filter(j => j.salary_min)
    const salaryRate = (withSalary.length / jobs.length * 100).toFixed(1)
    
    console.log(`\n🏷 ${category}: ${jobs.length} 职位`)
    console.log(`   💰 有薪资: ${withSalary.length} (${salaryRate}%)`)
    
    if (withSalary.length > 0) {
      const avgMin = Math.round(withSalary.reduce((sum, j) => sum + j.salary_min, 0) / withSalary.length)
      const avgMax = Math.round(withSalary.reduce((sum, j) => sum + j.salary_max, 0) / withSalary.length)
      const maxSalary = Math.max(...withSalary.map(j => j.salary_max))
      const minSalary = Math.min(...withSalary.map(j => j.salary_min))
      
      console.log(`   💵 平均薪资: $${avgMin}K - $${avgMax}K`)
      console.log(`   🎯 薪资范围: $${minSalary}K - $${maxSalary}K`)
      
      // Show top 3 highest paying in this category
      const topJobs = withSalary.sort((a, b) => b.salary_max - a.salary_max).slice(0, 3)
      console.log(`   🏆 最高薪资职位:`)
      topJobs.forEach((job, i) => {
        console.log(`      ${i+1}. ${job.title}: $${job.salary_min}K-$${job.salary_max}K`)
      })
    }
    
    // Show reasons for no salary
    const noSalary = jobs.filter(j => !j.salary_min)
    if (noSalary.length > 0) {
      const reasons = {}
      noSalary.forEach(job => {
        const reason = job.description || 'Unknown'
        reasons[reason] = (reasons[reason] || 0) + 1
      })
      
      console.log(`   ❓ 无薪资原因:`)
      Object.entries(reasons).forEach(([reason, count]) => {
        console.log(`      • ${reason}: ${count} 职位`)
      })
    }
  })
  
  // Location analysis
  console.log('\n🌍 地区薪资分析:')
  console.log('=' .repeat(60))
  
  const locationStats = {}
  data.jobs.forEach(job => {
    const loc = job.location || 'Unknown'
    if (!locationStats[loc]) {
      locationStats[loc] = { total: 0, withSalary: 0, salaries: [] }
    }
    locationStats[loc].total++
    if (job.salary_min) {
      locationStats[loc].withSalary++
      locationStats[loc].salaries.push({ min: job.salary_min, max: job.salary_max })
    }
  })
  
  Object.entries(locationStats)
    .sort(([,a], [,b]) => b.total - a.total)
    .forEach(([location, stats]) => {
      const salaryRate = (stats.withSalary / stats.total * 100).toFixed(1)
      console.log(`\n📍 ${location}: ${stats.total} 职位, ${stats.withSalary} 有薪资 (${salaryRate}%)`)
      
      if (stats.salaries.length > 0) {
        const avgMax = Math.round(stats.salaries.reduce((sum, s) => sum + s.max, 0) / stats.salaries.length)
        console.log(`   💰 平均最高薪资: $${avgMax}K`)
      }
    })
  
  console.log('\n✅ 分析完成!')
  return {
    total: data.jobs.length,
    withSalary: data.jobs.filter(j => j.salary_min).length,
    categories,
    locationStats
  }
}

analyzeSalaryPatterns()