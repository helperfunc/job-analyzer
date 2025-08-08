async function testFullImprovedScraper() {
  console.log('🔍 Testing full improved scraper with new salary extraction...')
  
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
      console.log(`📈 Success rate: ${Math.round((data.summary?.jobs_with_salary || 0) / (data.summary?.total_jobs || 1) * 100)}%`)
      
      if (data.summary?.highest_paying_jobs) {
        console.log('\n🏆 Top 10 highest paying jobs:')
        data.summary.highest_paying_jobs.slice(0, 10).forEach((job, i) => {
          if (job.salary_min && job.salary_max) {
            console.log(`${i+1}. ${job.title}`)
            console.log(`   💰 $${job.salary_min}K - $${job.salary_max}K`)
            console.log(`   📍 ${job.location} | ${job.department}`)
            console.log(`   🛠 ${job.skills?.slice(0,3).join(', ') || 'No skills listed'}`)
            console.log()
          } else {
            console.log(`${i+1}. ${job.title} - ${job.description || 'No salary'}`)
          }
        })
      }
      
      // Check if Audio Software Engineer is now included
      const audioJob = data.summary?.highest_paying_jobs?.find(job => 
        job.title.toLowerCase().includes('audio software engineer')
      )
      
      if (audioJob) {
        console.log('🎵 Audio Software Engineer found in results!')
        console.log(`   💰 Salary: $${audioJob.salary_min}K - $${audioJob.salary_max}K`)
      } else {
        console.log('🎵 Audio Software Engineer not found in top results (checking all jobs...)')
        
        // Find in the raw data if available
        if (data.jobs) {
          const audioInAll = data.jobs.find(job => 
            job.title.toLowerCase().includes('audio software engineer')
          )
          if (audioInAll) {
            console.log('   Found in full list with salary:', audioInAll.salary || 'None')
          }
        }
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

testFullImprovedScraper()