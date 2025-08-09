const fs = require('fs')
const path = require('path')

function fixDataSkillsPrecision() {
  console.log('🔧 Fixing overly broad data-related skill inference...')
  
  try {
    const dataDir = path.join(process.cwd(), 'data')
    
    // Use the FIXED data file
    const fixedFiles = fs.readdirSync(dataDir)
      .filter(f => f.includes('FIXED') && f.endsWith('.json'))
      .sort()
    
    if (fixedFiles.length === 0) {
      console.log('❌ No FIXED data files found')
      return
    }
    
    const latestFixed = fixedFiles[fixedFiles.length - 1]
    console.log(`📁 Using: ${latestFixed}`)
    
    const filepath = path.join(dataDir, latestFixed)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    console.log(`📊 Original: ${data.jobs.length} jobs`)
    
    // More precise skill inference for data-related roles
    function inferSkillsFromTitlePrecise(title) {
      const skills = []
      const lowerTitle = title.toLowerCase()
      
      // Frontend roles (very specific)
      if (lowerTitle.includes('frontend') || lowerTitle.includes('front-end') || lowerTitle.includes('ui engineer')) {
        skills.push('React', 'JavaScript', 'HTML/CSS')
        return skills
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
      
      // ML/AI specific roles (more precise)
      if (lowerTitle.includes('machine learning') || lowerTitle.includes(' ml engineer') || lowerTitle.includes('ml ')) {
        skills.push('Python', 'PyTorch', 'Machine Learning')
        return skills
      }
      
      // Research roles (ML-focused)
      if (lowerTitle.includes('research') && (lowerTitle.includes('engineer') || lowerTitle.includes('scientist'))) {
        skills.push('Python', 'PyTorch', 'Machine Learning')
        return skills
      }
      
      // Data roles - MORE PRECISE CATEGORIZATION
      if (lowerTitle.includes('data')) {
        // Data Scientist - clearly ML-focused
        if (lowerTitle.includes('data scientist')) {
          skills.push('Python', 'SQL', 'Machine Learning')
          return skills
        }
        
        // Data Visualization - frontend/UI focused  
        if (lowerTitle.includes('visualization') || lowerTitle.includes('viz')) {
          skills.push('Python', 'SQL', 'JavaScript') // No ML!
          return skills
        }
        
        // Data Infrastructure/Engineering - backend focused
        if (lowerTitle.includes('infrastructure') || lowerTitle.includes('platform')) {
          skills.push('Python', 'SQL', 'Kubernetes', 'Docker')
          return skills
        }
        
        // Data Center - hardware/facilities focused
        if (lowerTitle.includes('data center') || lowerTitle.includes('datacenter')) {
          skills.push('MEP Systems', 'Data Center Design', 'Power Systems', 'Project Management')
          return skills
        }
        
        // Generic data engineer - only add ML if explicitly ML-related
        if (lowerTitle.includes('engineer')) {
          skills.push('Python', 'SQL')
          // Only add ML if there are ML indicators
          if (lowerTitle.includes('ai') || lowerTitle.includes('artificial') || 
              lowerTitle.includes('learning') || lowerTitle.includes('model')) {
            skills.push('Machine Learning')
          }
          return skills
        }
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
        skills.push('Python')
        return skills
      }
      
      // Manager roles - no technical skills
      if (lowerTitle.includes('manager') || lowerTitle.includes('director') || lowerTitle.includes('lead')) {
        skills.push('Leadership', 'Project Management')
        return skills
      }
      
      return skills
    }
    
    // Test the improved logic on problematic jobs
    console.log('\n🧪 Testing improved logic on problematic jobs:')
    const testJobs = [
      'Software Engineer, Data Visualization',
      'Data Infrastructure Engineer', 
      'Data Scientist',
      'Machine Learning Engineer',
      'Data Center Design Engineer'
    ]
    
    testJobs.forEach(title => {
      const skills = inferSkillsFromTitlePrecise(title)
      const hasML = skills.includes('Machine Learning')
      console.log(`   ${hasML ? '🤖' : '📊'} ${title}: [${skills.join(', ')}]`)
    })
    
    // Apply the improved logic to all jobs
    let fixedCount = 0
    let mlRemovedCount = 0
    
    data.jobs.forEach(job => {
      const originalSkills = job.skills || []
      const newSkills = inferSkillsFromTitlePrecise(job.title)
      
      const hadML = originalSkills.includes('Machine Learning')
      const hasML = newSkills.includes('Machine Learning')
      
      if (hadML && !hasML) {
        mlRemovedCount++
        console.log(`   ❌→✅ Removed ML from: ${job.title}`)
      }
      
      if (JSON.stringify(originalSkills.sort()) !== JSON.stringify(newSkills.sort())) {
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
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }))
    
    // Update summary
    if (data.summary) {
      data.summary.most_common_skills = mostCommonSkills
    }
    
    // Save the refined data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const newFilename = `openai-jobs-REFINED-${timestamp}.json`
    const newFilepath = path.join(dataDir, newFilename)
    
    fs.writeFileSync(newFilepath, JSON.stringify(data, null, 2))
    
    console.log(`\n✅ Applied precise skill inference:`)
    console.log(`   Fixed ${fixedCount} jobs`)
    console.log(`   Removed ML skill from ${mlRemovedCount} jobs`)
    console.log(`   Saved to: ${newFilename}`)
    
    // Show updated ML statistics
    const newMLCount = mostCommonSkills.find(s => s.skill === 'Machine Learning')?.count || 0
    console.log(`\n📈 Machine Learning skill count: ${newMLCount} jobs`)
    
    console.log(`\n📈 Top 10 skills after refinement:`)
    mostCommonSkills.slice(0, 10).forEach((skill, i) => {
      const percentage = ((skill.count / data.jobs.length) * 100).toFixed(1)
      console.log(`${i+1}. ${skill.skill}: ${skill.count} jobs (${percentage}%)`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixDataSkillsPrecision()