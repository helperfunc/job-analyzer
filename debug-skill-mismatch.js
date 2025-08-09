const fs = require('fs')
const path = require('path')

function debugSkillMismatch() {
  console.log('🔍 Debugging Machine Learning skill mismatch...')
  
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    
    if (files.length === 0) {
      console.log('❌ No data files found')
      return
    }
    
    // Check all recent files
    const recentFiles = files.filter(f => f.includes('2025-08-08')).sort()
    
    console.log(`📁 Found ${recentFiles.length} recent data files:`)
    recentFiles.forEach(f => {
      const filepath = path.join(dataDir, f)
      const size = Math.round(fs.statSync(filepath).size / 1024)
      console.log(`   ${f} (${size}KB)`)
    })
    
    // Check the most recent files
    const latestFiles = recentFiles.slice(-3) // Last 3 files
    
    latestFiles.forEach(filename => {
      console.log(`\n📊 Analyzing ${filename}:`)
      
      const filepath = path.join(dataDir, filename)
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
      
      console.log(`   Total jobs: ${data.jobs.length}`)
      
      // Count Machine Learning skills
      const mlJobs = data.jobs.filter(job => 
        job.skills && job.skills.includes('Machine Learning')
      )
      
      console.log(`   Jobs with Machine Learning skill: ${mlJobs.length}`)
      
      if (mlJobs.length > 0) {
        console.log(`   Sample ML jobs:`)
        mlJobs.slice(0, 5).forEach(job => {
          console.log(`     - ${job.title} (${job.department})`)
        })
      }
      
      // Check summary statistics if available
      if (data.summary && data.summary.most_common_skills) {
        const mlStat = data.summary.most_common_skills.find(s => s.skill === 'Machine Learning')
        if (mlStat) {
          console.log(`   Summary says: ${mlStat.count} ML jobs`)
        } else {
          console.log(`   Summary doesn't include ML in top skills`)
        }
      }
    })
    
    // Now check what the jobs-by-skill API would return
    console.log(`\n🔍 Checking jobs-by-skill logic:`)
    
    // Use the most recent file
    const latestFile = recentFiles[recentFiles.length - 1]
    const latestPath = path.join(dataDir, latestFile)
    const latestData = JSON.parse(fs.readFileSync(latestPath, 'utf8'))
    
    // Simulate the API logic
    const skill = 'Machine Learning'
    const jobsWithSkill = latestData.jobs.filter(job => 
      job.skills && job.skills.includes(skill)
    )
    
    console.log(`   API would return: ${jobsWithSkill.length} jobs for "${skill}"`)
    
    if (jobsWithSkill.length > 0) {
      console.log(`   First few jobs that API would return:`)
      jobsWithSkill.slice(0, 5).forEach(job => {
        console.log(`     - ${job.title}: [${job.skills.join(', ')}]`)
      })
    }
    
    // Check which file the main page is using for statistics
    console.log(`\n🔍 Files being used by different parts:`)
    console.log(`   Latest file: ${latestFile}`)
    console.log(`   Fixed file: ${recentFiles.find(f => f.includes('FIXED')) || 'Not found'}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugSkillMismatch()