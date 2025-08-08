const fs = require('fs')
const path = require('path')

function find590kJob() {
  console.log('🔍 寻找590K职位...')
  
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    
    if (files.length === 0) {
      console.log('❌ 没有找到数据文件')
      return
    }
    
    const latestFile = files.sort().pop()
    console.log(`📁 读取文件: ${latestFile}`)
    
    const filepath = path.join(dataDir, latestFile)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    console.log(`📊 总职位数: ${data.jobs.length}`)
    
    // 寻找Principal Engineer GPU Platform职位
    const gpuJobs = data.jobs.filter(job => 
      job.title.toLowerCase().includes('principal') && 
      job.title.toLowerCase().includes('gpu')
    )
    
    console.log(`\n🎯 找到 ${gpuJobs.length} 个GPU相关的Principal Engineer职位:`)
    
    gpuJobs.forEach((job, i) => {
      console.log(`\n${i+1}. ${job.title}`)
      console.log(`   💰 薪资: ${job.salary || 'No salary'}`)
      console.log(`   💵 范围: ${job.salary_min ? `$${job.salary_min}K-$${job.salary_max}K` : 'No range'}`)
      console.log(`   📍 位置: ${job.location}`)
      console.log(`   🔗 URL: ${job.url}`)
      console.log(`   🛠 技能: ${job.skills?.join(', ') || 'None'}`)
    })
    
    // 查找所有薪资超过580K的职位
    const highPayJobs = data.jobs.filter(job => 
      job.salary_max && job.salary_max >= 580
    ).sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0))
    
    console.log(`\n💰 所有薪资≥580K的职位 (${highPayJobs.length}个):`)
    
    highPayJobs.forEach((job, i) => {
      console.log(`${i+1}. ${job.title}: $${job.salary_min}K-$${job.salary_max}K`)
      if (job.salary_max >= 590) {
        console.log(`   🔥 这就是590K+的职位！`)
      }
    })
    
  } catch (error) {
    console.error('❌ 错误:', error.message)
  }
}

find590kJob()