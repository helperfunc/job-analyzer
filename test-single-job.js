async function testSingleJob() {
  console.log('🧪 Testing single job with improved logic...')
  
  try {
    const response = await fetch('http://localhost:3000/api/scrape-with-puppeteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://openai.com/careers/search/',
        testMode: true // Add a test mode to only process first few jobs
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Test completed, check server logs for debug output')
      console.log(`📊 Summary: ${data.summary?.total_jobs} jobs processed`)
      
      // Check if any jobs still have React incorrectly
      if (data.summary?.highest_paying_jobs) {
        const reactJobs = data.summary.highest_paying_jobs.filter(job => 
          job.skills && job.skills.includes('React') && 
          !job.title.toLowerCase().includes('frontend') &&
          !job.title.toLowerCase().includes('front-end') &&
          !job.title.toLowerCase().includes('ui')
        )
        
        if (reactJobs.length > 0) {
          console.log(`❌ Still found ${reactJobs.length} non-frontend jobs with React:`)
          reactJobs.forEach(job => {
            console.log(`   - ${job.title}`)
          })
        } else {
          console.log('✅ No non-frontend jobs incorrectly have React!')
        }
      }
    } else {
      console.log(`❌ API Error: ${response.status}`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSingleJob()