const fs = require('fs')
const path = require('path')

function checkAudioJob() {
  console.log('🔍 Checking for Audio Software Engineer in latest data...')
  
  const dataDir = path.join(process.cwd(), 'data')
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
  const latestFile = files.sort().pop()
  
  console.log(`📁 Reading: ${latestFile}`)
  
  const filepath = path.join(dataDir, latestFile)
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
  
  // Find Audio Software Engineer
  const audioJobs = data.jobs.filter(job => 
    job.title.toLowerCase().includes('audio') && 
    job.title.toLowerCase().includes('software')
  )
  
  console.log(`🎵 Found ${audioJobs.length} Audio Software Engineer jobs:`)
  
  audioJobs.forEach((job, i) => {
    console.log(`\n${i+1}. ${job.title}`)
    console.log(`   🔗 URL: ${job.url}`)
    console.log(`   📍 Location: ${job.location}`)
    console.log(`   💰 Salary: ${job.salary || 'Not found'}`)
    console.log(`   💵 Range: ${job.salary_min ? `$${job.salary_min}K - $${job.salary_max}K` : 'No range'}`)
    console.log(`   🛠 Skills: ${job.skills?.join(', ') || 'None'}`)
    console.log(`   📝 Description: ${job.description || 'None'}`)
  })
  
  // Also check other jobs that should now have salary
  console.log('\n🔍 Checking other Consumer Products jobs that should have salary...')
  
  const consumerJobs = data.jobs.filter(job => 
    job.title.toLowerCase().includes('consumer products') ||
    job.department === 'Product'
  ).slice(0, 5)
  
  consumerJobs.forEach((job, i) => {
    console.log(`\n${i+1}. ${job.title}`)
    console.log(`   💰 Salary: ${job.salary || 'Not found'}`)
    console.log(`   💵 Range: ${job.salary_min ? `$${job.salary_min}K - $${job.salary_max}K` : 'No range'}`)
  })
  
  // Show improved stats
  const totalJobs = data.jobs.length
  const withSalary = data.jobs.filter(j => j.salary_min).length
  console.log(`\n📊 Improved Stats:`)
  console.log(`   Total: ${totalJobs}`)
  console.log(`   With Salary: ${withSalary}`)
  console.log(`   Success Rate: ${Math.round(withSalary/totalJobs * 100)}%`)
}

checkAudioJob()