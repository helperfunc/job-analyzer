const fs = require('fs')
const path = require('path')

function debugReactIssue() {
  console.log('🔍 Debugging React skill assignment issue...')
  
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
    
    // Look for the specific Software Engineer, Inference TL job
    const inferenceJob = data.jobs.find(job => 
      job.title.toLowerCase().includes('inference') && 
      job.title.toLowerCase().includes('software engineer')
    )
    
    if (inferenceJob) {
      console.log('\n🎯 Found Software Engineer, Inference TL job:')
      console.log(`   Title: ${inferenceJob.title}`)
      console.log(`   URL: ${inferenceJob.url}`)
      console.log(`   Skills (${inferenceJob.skills?.length || 0}): ${inferenceJob.skills?.join(', ') || 'None'}`)
      console.log(`   Department: ${inferenceJob.department}`)
      console.log(`   Location: ${inferenceJob.location}`)
      
      if (inferenceJob.skills && inferenceJob.skills.includes('React')) {
        console.log('\n❌ PROBLEM: This job incorrectly has React skill assigned!')
      }
      
      if (inferenceJob.description) {
        console.log('\n📄 Job description preview:')
        console.log(inferenceJob.description.substring(0, 500) + '...')
      }
    } else {
      console.log('\n❌ Could not find Software Engineer, Inference TL job')
      
      // Show all jobs with "inference" in title
      const inferenceJobs = data.jobs.filter(job => 
        job.title.toLowerCase().includes('inference')
      )
      
      console.log(`\n🔍 Found ${inferenceJobs.length} jobs with "inference" in title:`)
      inferenceJobs.forEach((job, i) => {
        console.log(`${i+1}. ${job.title}`)
        if (job.skills && job.skills.includes('React')) {
          console.log(`   ❌ Has React skill: ${job.skills.join(', ')}`)
        }
      })
    }
    
    // Show all jobs that have React skill
    const reactJobs = data.jobs.filter(job => 
      job.skills && job.skills.includes('React')
    )
    
    console.log(`\n⚠️ Found ${reactJobs.length} jobs with React skill:`)
    reactJobs.forEach((job, i) => {
      console.log(`${i+1}. ${job.title}`)
      console.log(`   URL: ${job.url}`)
      console.log(`   Department: ${job.department}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugReactIssue()