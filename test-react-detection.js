const fs = require('fs')
const path = require('path')

function testReactDetection() {
  console.log('🔍 Testing React detection in scraped data...')
  
  // Sample text that might cause false positives
  const testTexts = [
    'react to changing requirements',
    'reactive systems',
    'chemical reactions',
    'react quickly to incidents',
    'proactively react to issues',
    'React.js framework',
    'React components',
    'experience with React',
    'building with React',
    'React development'
  ]
  
  console.log('\n🧪 Testing various text patterns:')
  testTexts.forEach((text, i) => {
    const requirementsText = text.toLowerCase()
    const hasReact = requirementsText.includes('react') && !requirementsText.includes('reaction')
    console.log(`${i+1}. "${text}" -> ${hasReact ? '✅ MATCHES (React skill added)' : '❌ No match'}`)
  })
  
  // Now check actual job data
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('openai-jobs-') && f.endsWith('.json'))
    
    if (files.length === 0) {
      console.log('\n❌ No data files found')
      return
    }
    
    const latestFile = files.sort().pop()
    const filepath = path.join(dataDir, latestFile)
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    
    // Find some jobs with React skill and check their descriptions
    const reactJobs = data.jobs.filter(job => 
      job.skills && job.skills.includes('React')
    ).slice(0, 3) // Just check first 3
    
    console.log(`\n📄 Checking descriptions of first 3 React-tagged jobs:`)
    
    reactJobs.forEach((job, i) => {
      console.log(`\n${i+1}. ${job.title}`)
      if (job.description) {
        const desc = job.description.toLowerCase()
        const reactMatches = desc.match(/\b\w*react\w*\b/gi) || []
        console.log(`   React-related words found: ${reactMatches.join(', ')}`)
        
        // Show context around each match
        reactMatches.forEach(match => {
          const index = desc.indexOf(match.toLowerCase())
          const start = Math.max(0, index - 50)
          const end = Math.min(desc.length, index + match.length + 50)
          const context = desc.substring(start, end)
          console.log(`   Context for "${match}": "...${context}..."`)
        })
      }
    })
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

testReactDetection()