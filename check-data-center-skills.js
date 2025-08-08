const fs = require('fs')
const path = require('path')

function checkDataCenterSkills() {
  console.log('🔍 Checking data center engineer skills in latest data...')
  
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    
    if (files.length === 0) {
      console.log('❌ No data files found')
      return
    }
    
    const latestFile = files.sort().pop()
    console.log(`📁 Reading: ${latestFile}`)
    
    const filepath = path.join(dataDir, latestFile)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    console.log(`📊 Total jobs in file: ${data.jobs.length}`)
    
    // Look for data center jobs
    const dataCenterJobs = data.jobs.filter(job => 
      job.title.toLowerCase().includes('data center') || 
      job.title.toLowerCase().includes('stargate')
    )
    
    console.log(`\n🏢 Found ${dataCenterJobs.length} data center related jobs:`)
    
    dataCenterJobs.forEach((job, i) => {
      console.log(`\n${i+1}. ${job.title}`)
      console.log(`   💰 Salary: ${job.salary_min ? `$${job.salary_min}K-$${job.salary_max}K` : 'No salary'}`)
      console.log(`   🛠 Skills (${job.skills?.length || 0}): ${job.skills?.join(', ') || 'None'}`)
      console.log(`   📍 Location: ${job.location}`)
      console.log(`   🔗 URL: ${job.url}`)
    })
    
    // Check skills statistics for infrastructure-related skills
    console.log(`\n📈 Infrastructure Skills Analysis:`)
    const infrastructureSkills = [
      'MEP Systems',
      'Data Center Design', 
      'Power Systems',
      'Cooling Systems',
      'Critical Infrastructure',
      'Vendor Management',
      'Project Management'
    ]
    
    infrastructureSkills.forEach(skill => {
      const jobsWithSkill = data.jobs.filter(job => 
        job.skills && job.skills.includes(skill)
      )
      if (jobsWithSkill.length > 0) {
        console.log(`   ${skill}: ${jobsWithSkill.length} jobs`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkDataCenterSkills()