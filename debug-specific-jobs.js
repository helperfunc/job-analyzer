const fs = require('fs')
const path = require('path')

function debugSpecificJobs() {
  console.log('🔍 Debugging specific jobs that incorrectly have React skill...')
  
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
    
    // Find the specific problematic jobs
    const problemJobs = data.jobs.filter(job => 
      (job.title.includes('Manufacturing Design Engineering') || 
       job.title.includes('Software Engineer, Inference - TL') ||
       job.title.includes('Principal Engineer, GPU Platform')) &&
      job.skills && job.skills.includes('React')
    )
    
    console.log(`\n🎯 Found ${problemJobs.length} problematic jobs with React:`)
    
    problemJobs.forEach((job, i) => {
      console.log(`\n${i+1}. ${job.title}`)
      console.log(`   URL: ${job.url}`)
      console.log(`   Skills: ${job.skills.join(', ')}`)
      console.log(`   Department: ${job.department}`)
      console.log(`   Location: ${job.location}`)
      
      // Check if we have description to analyze
      if (job.description) {
        console.log(`   \n📄 Job description length: ${job.description.length} characters`)
        
        // Look for any occurrence of "react" in the description
        const desc = job.description.toLowerCase()
        const reactMatches = desc.match(/\b\w*react\w*\b/gi) || []
        
        if (reactMatches.length > 0) {
          console.log(`   🔍 Found "react" mentions: ${reactMatches.join(', ')}`)
          
          // Show context around each match
          reactMatches.slice(0, 3).forEach((match, j) => {
            const index = desc.indexOf(match.toLowerCase())
            const start = Math.max(0, index - 80)
            const end = Math.min(desc.length, index + match.length + 80)
            const context = desc.substring(start, end).replace(/\s+/g, ' ')
            console.log(`   Context ${j+1}: "...${context}..."`)
          })
        } else {
          console.log('   ❌ No "react" found in description at all!')
        }
        
        // Check if this matches our new logic
        console.log('\n   🧪 Testing with improved logic:')
        
        const hasReactFramework = (desc.includes('react.js') || 
                                  desc.includes('react js') ||
                                  desc.includes('reactjs') ||
                                  (desc.includes('react') && desc.includes('component')) ||
                                  (desc.includes('react') && desc.includes('framework')) ||
                                  (desc.includes('react') && desc.includes('frontend')) ||
                                  (desc.includes('react') && desc.includes('javascript')) ||
                                  (desc.includes('react') && desc.includes('experience'))) &&
                                 !desc.includes('reactive') &&
                                 !desc.includes('reaction') &&
                                 !desc.includes('react to') &&
                                 !desc.includes('react quickly')
        
        console.log(`   New logic result: ${hasReactFramework ? 'Would still add React ❌' : 'Would NOT add React ✅'}`)
        
        if (hasReactFramework) {
          // Find what's triggering it
          if (desc.includes('react.js')) console.log('   Triggered by: react.js')
          if (desc.includes('react js')) console.log('   Triggered by: react js') 
          if (desc.includes('reactjs')) console.log('   Triggered by: reactjs')
          if (desc.includes('react') && desc.includes('component')) console.log('   Triggered by: react + component')
          if (desc.includes('react') && desc.includes('framework')) console.log('   Triggered by: react + framework')
          if (desc.includes('react') && desc.includes('frontend')) console.log('   Triggered by: react + frontend')
          if (desc.includes('react') && desc.includes('javascript')) console.log('   Triggered by: react + javascript')
          if (desc.includes('react') && desc.includes('experience')) console.log('   Triggered by: react + experience')
        }
        
      } else {
        console.log('   ❌ No description available!')
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugSpecificJobs()