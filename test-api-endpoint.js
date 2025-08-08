async function testApiEndpoint() {
  console.log('🔍 Testing API endpoint on localhost:3002...')
  
  try {
    const response = await fetch('http://localhost:3002/api/scrape-with-puppeteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://openai.com/careers/search/'
      })
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API Response:')
      console.log(`📊 Total jobs: ${data.summary?.total_jobs || 'N/A'}`)
      console.log(`💰 Jobs with salary: ${data.summary?.jobs_with_salary || 'N/A'}`)
      
      if (data.summary?.highest_paying_jobs) {
        console.log('\n🏆 Top 5 highest paying jobs:')
        data.summary.highest_paying_jobs.slice(0, 5).forEach((job, i) => {
          console.log(`${i+1}. ${job.title}`)
          console.log(`   💰 $${job.salary_min}K - $${job.salary_max}K`)
          console.log(`   📍 ${job.location}`)
          console.log(`   🛠 ${job.skills?.join(', ') || 'No skills listed'}`)
        })
      }
      
      console.log(`\n📁 Data saved to: ${data.filepath}`)
      
    } else {
      const errorText = await response.text()
      console.log('❌ API Error:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

testApiEndpoint()