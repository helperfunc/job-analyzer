const fs = require('fs')
const path = require('path')

function checkSkillsData() {
  console.log('🔍 Checking skills data in latest file...')
  
  const dataDir = path.join(process.cwd(), 'data')
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
  const latestFile = files.sort().pop()
  
  console.log(`📁 Reading: ${latestFile}`)
  
  const filepath = path.join(dataDir, latestFile)
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
  
  console.log(`\n📊 Total jobs: ${data.jobs.length}`)
  
  // Check skills distribution
  const skillsCount = {}
  let jobsWithSkills = 0
  let jobsWithoutSkills = 0
  
  data.jobs.forEach((job, i) => {
    if (i < 10) {
      console.log(`\nJob ${i+1}: ${job.title}`)
      console.log(`   Skills: ${job.skills ? job.skills.join(', ') : 'None'}`)
    }
    
    if (job.skills && job.skills.length > 0) {
      jobsWithSkills++
      job.skills.forEach(skill => {
        skillsCount[skill] = (skillsCount[skill] || 0) + 1
      })
    } else {
      jobsWithoutSkills++
    }
  })
  
  console.log(`\n📈 Skills Summary:`)
  console.log(`   Jobs with skills: ${jobsWithSkills}`)
  console.log(`   Jobs without skills: ${jobsWithoutSkills}`)
  console.log(`   Unique skills: ${Object.keys(skillsCount).length}`)
  
  console.log(`\n🏆 Top 10 Most Common Skills:`)
  const topSkills = Object.entries(skillsCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
  
  topSkills.forEach(([skill, count], i) => {
    console.log(`   ${i+1}. ${skill}: ${count} jobs`)
  })
  
  // Check specific problematic jobs
  console.log(`\n🔍 Checking specific jobs:`)
  const testJobs = [
    'Audio Software Engineer',
    'Camera Software Engineer', 
    'Account Director'
  ]
  
  testJobs.forEach(searchTitle => {
    const job = data.jobs.find(j => j.title.toLowerCase().includes(searchTitle.toLowerCase()))
    if (job) {
      console.log(`\n${searchTitle}:`)
      console.log(`   Title: ${job.title}`)
      console.log(`   Skills: ${job.skills ? job.skills.join(', ') : 'None'}`)
      console.log(`   Department: ${job.department}`)
    } else {
      console.log(`\n${searchTitle}: Not found`)
    }
  })
}

checkSkillsData()