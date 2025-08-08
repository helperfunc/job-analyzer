const cheerio = require('cheerio')

async function testSpecificJob() {
  const jobUrl = 'https://openai.com/careers/principal-engineer-gpu-platform/'
  
  console.log('🔍 Testing specific job access:', jobUrl)
  
  try {
    const response = await fetch(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    console.log(`📄 Status: ${response.status}`)
    console.log(`📄 URL: ${response.url}`)
    console.log(`📄 Status Text: ${response.statusText}`)
    console.log(`📄 Content Type: ${response.headers.get('content-type')}`)
    
    if (response.ok) {
      const html = await response.text()
      console.log(`📄 HTML length: ${html.length} bytes`)
      
      // Look for salary information
      const salaryPatterns = [
        /\$[\d,]+K?\s*[-–]\s*\$[\d,]+K?/gi,
        /\$[\d,]+\s*[-–]\s*\$[\d,]+/gi,
        /[\d,]+k\s*[-–]\s*[\d,]+k/gi,
        /USD\s*[\d,]+\s*[-–]\s*[\d,]+/gi
      ]
      
      let salaryFound = false
      for (const pattern of salaryPatterns) {
        const matches = html.match(pattern)
        if (matches) {
          console.log(`💰 Found salary pattern: ${matches[0]}`)
          salaryFound = true
        }
      }
      
      // Also check if it contains the known numbers
      if (html.includes('405') && html.includes('590')) {
        console.log('💰 Page contains 405 and 590 - likely the salary range')
      }
      
      // Extract title
      const $ = cheerio.load(html)
      const title = $('title').text() || $('h1').first().text()
      console.log(`📋 Page title: ${title}`)
      
      // Look for job description/details
      const jobContent = $('main').text() || $('body').text()
      if (jobContent.length > 1000) {
        console.log('📋 Job content found (showing first 500 chars):')
        console.log(jobContent.substring(0, 500) + '...')
      }
      
      if (!salaryFound) {
        console.log('⚠️ No clear salary pattern found in HTML')
      }
      
    } else {
      console.log('❌ Failed to access job page')
      const text = await response.text()
      console.log('Error page content (first 500 chars):')
      console.log(text.substring(0, 500))
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

testSpecificJob()