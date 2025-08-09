const fs = require('fs')
const path = require('path')

function fixSkillsConservative() {
  console.log('🔧 Fixing skills with conservative title-based approach...')
  
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
    
    console.log(`📊 Original: ${data.jobs.length} jobs`)
    
    // Conservative skill inference based ONLY on job titles
    function inferSkillsFromTitle(title) {
      const skills = []
      const lowerTitle = title.toLowerCase()
      
      // Frontend roles (very specific)
      if (lowerTitle.includes('frontend') || lowerTitle.includes('front-end') || lowerTitle.includes('ui engineer')) {
        skills.push('React', 'JavaScript', 'HTML/CSS')
      }
      
      // Backend roles
      else if (lowerTitle.includes('backend') || lowerTitle.includes('back-end')) {
        skills.push('Python', 'Go', 'SQL')
      }
      
      // Full stack
      else if (lowerTitle.includes('full stack') || lowerTitle.includes('fullstack')) {
        skills.push('JavaScript', 'React', 'Python', 'SQL')
      }
      
      // ML/AI roles
      else if (lowerTitle.includes('machine learning') || lowerTitle.includes(' ml ') || lowerTitle.includes('ai ')) {
        skills.push('Python', 'PyTorch', 'Machine Learning')
      }
      
      // Research roles
      else if (lowerTitle.includes('research') && lowerTitle.includes('engineer')) {
        skills.push('Python', 'PyTorch', 'Machine Learning')
      }
      
      // Data roles
      else if (lowerTitle.includes('data') && (lowerTitle.includes('scientist') || lowerTitle.includes('engineer'))) {
        skills.push('Python', 'SQL', 'Machine Learning')
      }
      
      // Infrastructure roles
      else if (lowerTitle.includes('infrastructure') || lowerTitle.includes('devops') || lowerTitle.includes('sre')) {
        skills.push('Kubernetes', 'Docker', 'Google Cloud', 'Linux/Unix')
      }
      
      // Security roles
      else if (lowerTitle.includes('security')) {
        skills.push('Python', 'Linux/Unix')
      }
      
      // GPU/CUDA roles
      else if (lowerTitle.includes('gpu') || lowerTitle.includes('cuda') || lowerTitle.includes('kernels')) {
        skills.push('Python', 'C++', 'CUDA', 'PyTorch')
      }
      
      // Mobile roles
      else if (lowerTitle.includes('ios')) {
        skills.push('Swift')
      } else if (lowerTitle.includes('android')) {
        skills.push('Java')
      }
      
      // Data center roles
      else if (lowerTitle.includes('data center') || lowerTitle.includes('datacenter') || lowerTitle.includes('stargate')) {
        skills.push('MEP Systems', 'Data Center Design', 'Power Systems', 'Project Management')
      }
      
      // Manufacturing roles
      else if (lowerTitle.includes('manufacturing')) {
        skills.push('CAD/Design Software', 'Project Management')
      }
      
      // Sales roles
      else if (lowerTitle.includes('sales') || lowerTitle.includes('account')) {
        skills.push('Sales', 'Customer Success')
      }
      
      // For generic software engineer roles, add minimal skills
      else if (lowerTitle.includes('software engineer') || lowerTitle.includes('engineer')) {
        skills.push('Python') // Most OpenAI engineers likely use Python
      }
      
      return skills
    }
    
    // Fix each job's skills
    let fixedCount = 0
    data.jobs.forEach(job => {
      const originalSkills = job.skills || []
      const newSkills = inferSkillsFromTitle(job.title)
      
      if (JSON.stringify(originalSkills) !== JSON.stringify(newSkills)) {
        console.log(`🔧 ${job.title}:`)
        console.log(`   Old: [${originalSkills.join(', ')}]`)
        console.log(`   New: [${newSkills.join(', ')}]`)
        job.skills = newSkills
        fixedCount++
      }
    })
    
    // Regenerate skill statistics
    const skillCounts = {}
    data.jobs.forEach(job => {
      if (job.skills) {
        job.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1
        })
      }
    })
    
    const mostCommonSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }))
    
    // Update summary
    if (data.summary) {
      data.summary.most_common_skills = mostCommonSkills
    }
    
    // Save fixed data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const newFilename = `openai-jobs-fixed-${timestamp}.json`
    const newFilepath = path.join(dataDir, newFilename)
    
    fs.writeFileSync(newFilepath, JSON.stringify(data, null, 2))
    
    console.log(`\n✅ Fixed ${fixedCount} jobs`)
    console.log(`💾 Saved to: ${newFilename}`)
    console.log(`\n📈 New skill statistics:`)
    mostCommonSkills.forEach((skill, i) => {
      const percentage = ((skill.count / data.jobs.length) * 100).toFixed(1)
      console.log(`${i+1}. ${skill.skill}: ${skill.count} jobs (${percentage}%)`)
    })
    
    // Test specific problematic jobs
    console.log(`\n🎯 Checking previously problematic jobs:`)
    const problemJobs = [
      'Manufacturing Design Engineering',
      'Software Engineer, Inference',
      'Principal Engineer, GPU Platform'
    ]
    
    problemJobs.forEach(searchTerm => {
      const job = data.jobs.find(j => j.title.includes(searchTerm))
      if (job) {
        console.log(`   ${job.title}: [${job.skills?.join(', ') || 'None'}]`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixSkillsConservative()