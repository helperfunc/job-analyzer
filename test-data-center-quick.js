async function testDataCenterQuick() {
  console.log('🔍 Quick test for data center engineer skills...')
  
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
    
    if (response.ok) {
      // Just check if the response is successful, don't wait for full completion
      console.log('✅ API call initiated successfully')
      console.log('⏳ Scraping in progress... Check logs or wait for completion')
      
      // Test the jobs-by-skill API with a simple skill
      setTimeout(async () => {
        try {
          const skillResponse = await fetch('http://localhost:3002/api/jobs-by-skill?skill=Python')
          if (skillResponse.ok) {
            const skillData = await skillResponse.json()
            console.log(`✅ Skills API working: Found ${skillData.total} jobs requiring Python`)
          }
        } catch (err) {
          console.log('⚠️ Skills API not ready yet, data might still be scraping')
        }
      }, 5000)
      
    } else {
      console.log(`❌ API Error: ${response.status}`)
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

testDataCenterQuick()