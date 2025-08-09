const fs = require('fs')
const path = require('path')

function debugSpecificJobSkills() {
  console.log('🔍 Debugging specific job skill generation...')
  
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
    
    // Find the specific job
    const targetJob = data.jobs.find(job => 
      job.title.includes('Software Engineer, Data Visualization') ||
      job.url.includes('software-engineer-data-visualization')
    )
    
    if (!targetJob) {
      console.log('❌ Could not find "Software Engineer, Data Visualization" job')
      console.log('\n🔍 Available jobs with "Data Visualization":')
      const dataVizJobs = data.jobs.filter(job => 
        job.title.toLowerCase().includes('data visualization') ||
        job.title.toLowerCase().includes('visualization')
      )
      dataVizJobs.forEach(job => console.log(`   - ${job.title}`))
      return
    }
    
    console.log('\n🎯 Found the job:')
    console.log(`   Title: ${targetJob.title}`)
    console.log(`   URL: ${targetJob.url}`)
    console.log(`   Department: ${targetJob.department}`)
    console.log(`   Skills: [${targetJob.skills?.join(', ') || 'None'}]`)
    console.log(`   Has ML skill: ${targetJob.skills?.includes('Machine Learning') ? '✅ YES' : '❌ NO'}`)
    
    // Test our skill inference logic
    console.log('\n🧪 Testing skill inference logic:')
    
    function testSkillInference(title) {
      const skills = []
      const lowerTitle = title.toLowerCase()
      
      console.log(`   Input title: "${title}"`)
      console.log(`   Lowercase: "${lowerTitle}"`)
      
      // Check each condition that could add Machine Learning
      if (lowerTitle.includes('frontend') || lowerTitle.includes('front-end') || lowerTitle.includes('ui engineer')) {
        console.log('   ❌ Frontend role condition: NOT matched')
      } else if (lowerTitle.includes('backend') || lowerTitle.includes('back-end')) {
        console.log('   ❌ Backend role condition: NOT matched')
        skills.push('Python', 'Go', 'SQL')
      } else if (lowerTitle.includes('full stack') || lowerTitle.includes('fullstack')) {
        console.log('   ❌ Full stack condition: NOT matched')
        skills.push('JavaScript', 'React', 'Python', 'SQL')
      } else if (lowerTitle.includes('machine learning') || lowerTitle.includes(' ml ')) {
        console.log('   ❌ ML condition: NOT matched')
        skills.push('Python', 'PyTorch', 'Machine Learning')
      } else if (lowerTitle.includes('research') && (lowerTitle.includes('engineer') || lowerTitle.includes('scientist'))) {
        console.log('   ❌ Research condition: NOT matched')
        skills.push('Python', 'PyTorch', 'Machine Learning')
      } else if (lowerTitle.includes('data') && (lowerTitle.includes('scientist') || lowerTitle.includes('engineer'))) {
        console.log('   ✅ Data + Engineer condition: MATCHED!')
        console.log('   → Adding: Python, SQL, Machine Learning')
        skills.push('Python', 'SQL', 'Machine Learning')
      } else if (lowerTitle.includes('infrastructure') || lowerTitle.includes('devops') || lowerTitle.includes('sre')) {
        console.log('   ❌ Infrastructure condition: NOT matched')
        skills.push('Kubernetes', 'Docker', 'Google Cloud', 'Linux/Unix')
      } else if (lowerTitle.includes('security')) {
        console.log('   ❌ Security condition: NOT matched')
        skills.push('Python', 'Linux/Unix')
      } else if (lowerTitle.includes('gpu') || lowerTitle.includes('cuda') || lowerTitle.includes('kernels') || lowerTitle.includes('inference')) {
        console.log('   ❌ GPU/CUDA condition: NOT matched')
        skills.push('Python', 'C++', 'CUDA')
      } else if (lowerTitle.includes('software engineer') || lowerTitle.includes('engineer')) {
        console.log('   ✅ Generic software engineer condition: MATCHED!')
        console.log('   → Adding: Python')
        skills.push('Python')
      }
      
      console.log(`   Final inferred skills: [${skills.join(', ')}]`)
      return skills
    }
    
    const inferredSkills = testSkillInference(targetJob.title)
    
    console.log('\n🔍 Analysis:')
    if (inferredSkills.includes('Machine Learning')) {
      console.log('✅ Machine Learning skill was added by the inference logic')
      console.log('🔍 Reason: Title contains "data" + "engineer" → gets ML skill')
    } else {
      console.log('❌ Machine Learning skill should NOT be added by inference logic')
      console.log('❓ The skill might be from old/incorrect data')
    }
    
    console.log('\n💡 Key findings:')
    console.log('- Skills are generated AUTOMATICALLY based on job titles')
    console.log('- NOT generated by ChatGPT or LLMs')
    console.log('- Based on rule-based pattern matching in the code')
    console.log('- Job titles with "data" + "engineer" automatically get ML skill')
    console.log('- This might be too broad and needs refinement')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugSpecificJobSkills()