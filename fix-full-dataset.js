const fs = require('fs')
const path = require('path')

function fixFullDataset() {
  console.log('🔧 Fixing skills in the full dataset...')
  
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-2025-08-08T22') && f.endsWith('.json'))
    
    if (files.length === 0) {
      console.log('❌ No recent data files found')
      return
    }
    
    // Find the largest recent file (likely the full dataset)
    const fileStats = files.map(f => ({
      name: f,
      path: path.join(dataDir, f),
      size: fs.statSync(path.join(dataDir, f)).size
    })).sort((a, b) => b.size - a.size)
    
    const latestFile = fileStats[0].name
    console.log(`📁 Using largest recent file: ${latestFile} (${Math.round(fileStats[0].size / 1024)}KB)`)
    
    const filepath = fileStats[0].path
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    console.log(`📊 Original: ${data.jobs.length} jobs`)
    
    // Conservative skill inference based ONLY on job titles
    function inferSkillsFromTitle(title) {
      const skills = []
      const lowerTitle = title.toLowerCase()
      
      // Frontend roles (very specific)
      if (lowerTitle.includes('frontend') || lowerTitle.includes('front-end') || lowerTitle.includes('ui engineer')) {
        skills.push('React', 'JavaScript', 'HTML/CSS')
        return skills // Return early for frontend roles
      }
      
      // Backend roles
      if (lowerTitle.includes('backend') || lowerTitle.includes('back-end')) {
        skills.push('Python', 'Go', 'SQL')
        return skills
      }
      
      // Full stack
      if (lowerTitle.includes('full stack') || lowerTitle.includes('fullstack')) {
        skills.push('JavaScript', 'React', 'Python', 'SQL')
        return skills
      }
      
      // ML/AI specific roles
      if (lowerTitle.includes('machine learning') || lowerTitle.includes(' ml ')) {
        skills.push('Python', 'PyTorch', 'Machine Learning')
        return skills
      }
      
      // Research roles
      if (lowerTitle.includes('research') && (lowerTitle.includes('engineer') || lowerTitle.includes('scientist'))) {
        skills.push('Python', 'PyTorch', 'Machine Learning')
        return skills
      }
      
      // Data roles
      if (lowerTitle.includes('data') && (lowerTitle.includes('scientist') || lowerTitle.includes('engineer'))) {
        skills.push('Python', 'SQL', 'Machine Learning')
        return skills
      }
      
      // Infrastructure roles
      if (lowerTitle.includes('infrastructure') || lowerTitle.includes('devops') || lowerTitle.includes('sre')) {
        skills.push('Kubernetes', 'Docker', 'Google Cloud', 'Linux/Unix')
        return skills
      }
      
      // Security roles
      if (lowerTitle.includes('security')) {
        skills.push('Python', 'Linux/Unix')
        return skills
      }
      
      // GPU/CUDA/Inference roles
      if (lowerTitle.includes('gpu') || lowerTitle.includes('cuda') || lowerTitle.includes('kernels') || lowerTitle.includes('inference')) {
        skills.push('Python', 'C++', 'CUDA')
        if (lowerTitle.includes('inference') || lowerTitle.includes('ml') || lowerTitle.includes('ai')) {
          skills.push('PyTorch', 'Machine Learning')
        }
        return skills
      }
      
      // Mobile roles
      if (lowerTitle.includes('ios')) {
        skills.push('Swift')
        return skills
      }
      if (lowerTitle.includes('android')) {
        skills.push('Java')
        return skills
      }
      
      // Data center roles
      if (lowerTitle.includes('data center') || lowerTitle.includes('datacenter') || lowerTitle.includes('stargate')) {
        skills.push('MEP Systems', 'Data Center Design', 'Power Systems', 'Project Management')
        return skills
      }
      
      // Manufacturing/Hardware roles
      if (lowerTitle.includes('manufacturing') || lowerTitle.includes('hardware') || lowerTitle.includes('mechanical')) {
        skills.push('Project Management')
        if (lowerTitle.includes('design')) skills.push('CAD/Design Software')
        return skills
      }
      
      // Sales/Business roles
      if (lowerTitle.includes('sales') || lowerTitle.includes('account') || lowerTitle.includes('business')) {
        skills.push('Sales', 'Customer Success')
        return skills
      }
      
      // Generic software engineer roles - minimal skills
      if (lowerTitle.includes('software engineer') || lowerTitle.includes('engineer')) {
        skills.push('Python') // Most OpenAI engineers likely use Python
        return skills
      }
      
      // Manager roles - no technical skills
      if (lowerTitle.includes('manager') || lowerTitle.includes('director') || lowerTitle.includes('lead')) {
        skills.push('Leadership', 'Project Management')
        return skills
      }
      
      return skills // Empty for other roles
    }
    
    // Fix each job's skills
    let fixedCount = 0
    let reactJobs = []
    
    data.jobs.forEach(job => {
      const originalSkills = job.skills || []
      const newSkills = inferSkillsFromTitle(job.title)
      
      // Track jobs that previously had React incorrectly
      if (originalSkills.includes('React')) {
        reactJobs.push({
          title: job.title,
          oldHadReact: true,
          newHasReact: newSkills.includes('React'),
          oldSkills: originalSkills,
          newSkills: newSkills
        })
      }
      
      if (JSON.stringify(originalSkills.sort()) !== JSON.stringify(newSkills.sort())) {
        job.skills = newSkills
        fixedCount++
      }
    })
    
    // Show React fixes
    console.log(`\n🎯 React skill fixes:`)
    const reactFixed = reactJobs.filter(j => j.oldHadReact && !j.newHasReact)
    const reactKept = reactJobs.filter(j => j.oldHadReact && j.newHasReact)
    
    console.log(`   ✅ Removed React from ${reactFixed.length} jobs:`)
    reactFixed.slice(0, 5).forEach(job => {
      console.log(`      - ${job.title}`)
    })
    
    console.log(`   ⚠️  Kept React for ${reactKept.length} jobs:`)
    reactKept.forEach(job => {
      console.log(`      - ${job.title} (legitimate frontend role)`)
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
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }))
    
    // Update summary
    if (data.summary) {
      data.summary.most_common_skills = mostCommonSkills
    }
    
    // Save fixed data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const newFilename = `openai-jobs-FIXED-${timestamp}.json`
    const newFilepath = path.join(dataDir, newFilename)
    
    fs.writeFileSync(newFilepath, JSON.stringify(data, null, 2))
    
    console.log(`\n✅ Fixed ${fixedCount} out of ${data.jobs.length} jobs`)
    console.log(`💾 Saved to: ${newFilename}`)
    console.log(`\n📈 New skill statistics (top 10):`)
    mostCommonSkills.slice(0, 10).forEach((skill, i) => {
      const percentage = ((skill.count / data.jobs.length) * 100).toFixed(1)
      console.log(`${i+1}. ${skill.skill}: ${skill.count} jobs (${percentage}%)`)
    })
    
    // Test the specific problematic jobs mentioned by user
    console.log(`\n🔍 Checking the specific jobs mentioned:`)
    const testJobs = [
      'Manufacturing Design Engineering',
      'Software Engineer, Inference',
      'Principal Engineer, GPU Platform'
    ]
    
    testJobs.forEach(searchTerm => {
      const jobs = data.jobs.filter(j => j.title.includes(searchTerm))
      jobs.forEach(job => {
        const hasReact = job.skills?.includes('React')
        console.log(`   ${hasReact ? '❌' : '✅'} ${job.title}: [${job.skills?.join(', ') || 'None'}]`)
      })
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixFullDataset()