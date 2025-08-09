const fs = require('fs')
const path = require('path')

function testOtherSkillsAccuracy() {
  console.log('🔍 Testing accuracy of other skill detections...')
  
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    
    if (files.length === 0) {
      console.log('❌ No data files found')
      return
    }
    
    const latestFile = files.sort().pop()
    const filepath = path.join(dataDir, latestFile)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    // Get skill statistics
    const skillCounts = {}
    data.jobs.forEach(job => {
      if (job.skills) {
        job.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1
        })
      }
    })
    
    // Sort by count and show top skills
    const sortedSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
    
    console.log('\n📊 Top 20 most common skills:')
    sortedSkills.forEach(([skill, count], i) => {
      const percentage = ((count / data.jobs.length) * 100).toFixed(1)
      console.log(`${i+1}. ${skill}: ${count} jobs (${percentage}%)`)
    })
    
    // Check potentially problematic skills
    const suspiciousSkills = [
      'HTML/CSS', // might match any mention of HTML or CSS
      'Git', // might match "digit" or other words
      'SQL', // might be too broad
      'Leadership', // might match any mention of "leadership"
      'Operations Management', // might be too broad
    ]
    
    console.log('\n⚠️ Checking potentially over-assigned skills:')
    suspiciousSkills.forEach(skill => {
      const count = skillCounts[skill] || 0
      const percentage = ((count / data.jobs.length) * 100).toFixed(1)
      
      if (count > 50) { // If more than 50 jobs have this skill, it might be over-assigned
        console.log(`🚨 ${skill}: ${count} jobs (${percentage}%) - POTENTIALLY OVER-ASSIGNED`)
        
        // Show some jobs with this skill
        const jobsWithSkill = data.jobs.filter(job => job.skills && job.skills.includes(skill))
        console.log('   Sample jobs:')
        jobsWithSkill.slice(0, 3).forEach(job => {
          console.log(`     - ${job.title}`)
        })
      } else {
        console.log(`✅ ${skill}: ${count} jobs (${percentage}%) - looks reasonable`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testOtherSkillsAccuracy()