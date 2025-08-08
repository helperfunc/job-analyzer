const cheerio = require('cheerio')

async function debugWithSalaryJob() {
  // Test a job that DID show salary - Data Scientist
  const jobUrl = 'https://openai.com/careers/data-scientist/'
  
  console.log('🔍 Debugging salary extraction for job WITH salary:', jobUrl)
  
  try {
    const response = await fetch(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    console.log(`📄 Status: ${response.status}`)
    
    if (response.ok) {
      const html = await response.text()
      console.log(`📄 HTML length: ${html.length} bytes`)
      
      // Current salary patterns
      const currentPatterns = [
        /\$(\d{3,})[Kk]?\s*[-–]\s*\$(\d{3,})[Kk]?/gi,
        /\$(\d{3,}),(\d{3})\s*[-–]\s*\$(\d{3,}),(\d{3})/gi,
        /USD\s*(\d{3,})[Kk]?\s*[-–]\s*(\d{3,})[Kk]?/gi
      ]
      
      console.log('\n💰 Testing current patterns...')
      currentPatterns.forEach((pattern, i) => {
        const matches = html.match(pattern)
        if (matches) {
          console.log(`✅ Pattern ${i+1}: ${matches.length} matches: ${matches.slice(0,3).join(', ')}`)
        } else {
          console.log(`❌ Pattern ${i+1}: No matches`)
        }
      })
      
      // Look for salary context
      console.log('\n🔍 Looking for salary context...')
      const salaryKeywords = ['salary', 'compensation', 'pay', 'wage', 'annual']
      salaryKeywords.forEach(keyword => {
        if (html.toLowerCase().includes(keyword)) {
          console.log(`✅ Found "${keyword}" in page`)
        }
      })
      
      // Find where the salary appears in the HTML
      const $ = cheerio.load(html)
      const title = $('h1').first().text() || $('title').text()
      console.log(`\n📋 Job title: ${title}`)
      
      // Look for any section that might contain salary
      const possibleSalarySections = [
        'compensation',
        'benefits', 
        'package',
        'salary',
        'pay'
      ]
      
      possibleSalarySections.forEach(section => {
        const sectionElement = $(`*:contains("${section}")`).first()
        if (sectionElement.length) {
          const sectionText = sectionElement.text()
          if (sectionText.includes('$')) {
            console.log(`💰 Found $ in ${section} section: ${sectionText.substring(0, 200)}`)
          }
        }
      })
      
      // Look for the actual salary pattern manually
      const salaryMatch = html.match(/\$255K\s*[-–]\s*\$405K/i)
      if (salaryMatch) {
        console.log(`💰 Found expected salary: ${salaryMatch[0]}`)
        
        // Find the surrounding context
        const index = html.indexOf(salaryMatch[0])
        const context = html.substring(Math.max(0, index-200), index+300)
        console.log(`📋 Context around salary:`)
        console.log(context)
      }
      
    } else {
      console.log('❌ Failed to access job page')
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

debugWithSalaryJob()