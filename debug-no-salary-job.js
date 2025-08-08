const cheerio = require('cheerio')

async function debugNoSalaryJob() {
  // Test a job that didn't show salary - Account Director
  const jobUrl = 'https://openai.com/careers/account-director-digital-native/'
  
  console.log('🔍 Debugging why no salary found for:', jobUrl)
  
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
      
      console.log('\n🔍 Testing current patterns...')
      currentPatterns.forEach((pattern, i) => {
        const matches = html.match(pattern)
        console.log(`Pattern ${i+1}: ${matches ? matches.length + ' matches: ' + matches.slice(0,3).join(', ') : 'No matches'}`)
      })
      
      // Look for any numbers that might be salary
      console.log('\n🔍 Looking for any salary-like numbers...')
      
      // More flexible patterns
      const flexiblePatterns = [
        /\$\s*\d+[,\d]*\s*[-–—]\s*\$\s*\d+[,\d]*/gi,
        /\d{3,}[,\d]*k?\s*[-–—]\s*\d{3,}[,\d]*k?\s*(?:per year|annually|usd)/gi,
        /salary\s*[:]\s*\$?\d+[,\d]*[-–—]\$?\d+[,\d]*/gi,
        /compensation\s*[:]\s*\$?\d+[,\d]*[-–—]\$?\d+[,\d]*/gi,
        /range\s*[:]\s*\$?\d+[,\d]*[-–—]\$?\d+[,\d]*/gi
      ]
      
      flexiblePatterns.forEach((pattern, i) => {
        const matches = html.match(pattern)
        console.log(`Flexible ${i+1}: ${matches ? matches.length + ' matches: ' + matches.slice(0,3).join(', ') : 'No matches'}`)
      })
      
      // Look for the word "salary", "compensation", "pay" etc.
      console.log('\n🔍 Searching for salary-related keywords...')
      const salaryKeywords = ['salary', 'compensation', 'pay', 'wage', 'remuneration', 'package']
      salaryKeywords.forEach(keyword => {
        if (html.toLowerCase().includes(keyword)) {
          console.log(`✅ Found "${keyword}" in page`)
          // Find context around the keyword
          const index = html.toLowerCase().indexOf(keyword)
          const context = html.substring(Math.max(0, index-100), index+200)
          console.log(`   Context: ...${context}...`)
        } else {
          console.log(`❌ "${keyword}" not found`)
        }
      })
      
      // Check if this job type typically doesn't show salary
      const $ = cheerio.load(html)
      const title = $('h1').first().text() || $('title').text()
      const bodyText = $('body').text().toLowerCase()
      
      console.log(`\n📋 Job title: ${title}`)
      console.log(`📋 Page content includes "competitive" salary mention: ${bodyText.includes('competitive')}`)
      console.log(`📋 Page content includes "based on experience": ${bodyText.includes('based on experience')}`)
      
      // Look for any structured data
      $('script[type="application/ld+json"]').each((i, elem) => {
        try {
          const data = JSON.parse($(elem).html() || '{}')
          if (data.baseSalary || (data['@type'] === 'JobPosting' && data.baseSalary)) {
            console.log('💰 Found salary in JSON-LD:', data.baseSalary)
          }
        } catch (e) {
          // Invalid JSON
        }
      })
      
    } else {
      console.log('❌ Failed to access job page')
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

debugNoSalaryJob()