async function testFixedAPI() {
  console.log('🧪 Testing fixed API endpoint...')
  
  try {
    // Test with a small subset first
    const response = await fetch('http://localhost:3000/api/scrape-with-puppeteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://openai.com/careers/search/',
        testMode: true // Limit to first few jobs for testing
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API call successful!')
      console.log(`📊 Found ${data.summary?.total_jobs || 0} jobs`)
      
      if (data.summary?.highest_paying_jobs) {
        console.log('\n🎯 Sample jobs and skills:')
        data.summary.highest_paying_jobs.slice(0, 5).forEach(job => {
          const hasReact = job.skills && job.skills.includes('React')
          const isFrontend = job.title.toLowerCase().includes('frontend') || 
                            job.title.toLowerCase().includes('front-end') ||
                            job.title.toLowerCase().includes('full stack')
          
          const status = hasReact && !isFrontend ? '❌ WRONG' : 
                        hasReact && isFrontend ? '✅ CORRECT' :
                        !hasReact ? '✅ CORRECT' : '?'
          
          console.log(`   ${status} ${job.title}: [${job.skills?.join(', ') || 'None'}]`)
        })
      }
      
      if (data.summary?.most_common_skills) {
        console.log('\n📈 Top skills:')
        data.summary.most_common_skills.slice(0, 8).forEach((skill, i) => {
          console.log(`${i+1}. ${skill.skill}: ${skill.count} jobs`)
        })
      }
      
    } else {
      const errorText = await response.text()
      console.log(`❌ API Error: ${response.status}`)
      console.log(`Error details: ${errorText}`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testFixedAPI()