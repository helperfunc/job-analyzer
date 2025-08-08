const cheerio = require('cheerio')

async function debugAudioEngineer() {
  const jobUrl = 'https://openai.com/careers/audio-software-engineer/'
  
  console.log('🔍 Debugging Audio Software Engineer salary extraction:', jobUrl)
  
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
      
      // Look for the specific format mentioned: $325K + Offers Equity
      console.log('\n🔍 Looking for single salary format...')
      const singleSalaryPatterns = [
        /\$(\d{3,})[Kk]?\s*\+\s*Offers\s*Equity/gi,
        /\$(\d{3,})[Kk]?\s*\+/gi,
        /\$(\d{3,})[Kk]?(?!\s*[-–])/gi,
        /\$\s*(\d{3,})[Kk]?/gi
      ]
      
      singleSalaryPatterns.forEach((pattern, i) => {
        const matches = html.match(pattern)
        if (matches) {
          console.log(`✅ Single Pattern ${i+1}: ${matches.length} matches: ${matches.slice(0,5).join(', ')}`)
        } else {
          console.log(`❌ Single Pattern ${i+1}: No matches`)
        }
      })
      
      // Search for "Compensation" section specifically
      console.log('\n🔍 Looking for Compensation section...')
      if (html.includes('Compensation')) {
        console.log('✅ Found "Compensation" in page')
        
        // Find the compensation section
        const compIndex = html.indexOf('Compensation')
        const compSection = html.substring(compIndex, compIndex + 300)
        console.log(`💰 Compensation section: ${compSection}`)
        
        // Look for salary in this specific section
        const compMatch = compSection.match(/\$\s*\d+[,\d]*K?[^-–]*/i)
        if (compMatch) {
          console.log(`💰 Found salary in compensation: ${compMatch[0]}`)
        }
      }
      
      // Manual search for the exact format
      const exactMatch = html.match(/\$325K\s*\+\s*Offers\s*Equity/i)
      if (exactMatch) {
        console.log(`💰 Found exact match: ${exactMatch[0]}`)
      } else {
        console.log('❌ Exact format not found')
      }
      
      // Look for any $XXXk pattern
      const allDollarMatches = html.match(/\$\d+[,\d]*[Kk]?/gi)
      if (allDollarMatches) {
        console.log(`💰 All dollar amounts found: ${allDollarMatches.slice(0, 10).join(', ')}`)
      }
      
      // Check if there's a structured way to extract this
      const $ = cheerio.load(html)
      console.log('\n🔍 Looking for structured compensation...')
      
      // Look for any element containing "Compensation"
      const compElements = $('*').filter((i, elem) => {
        return $(elem).text().toLowerCase().includes('compensation')
      })
      
      console.log(`Found ${compElements.length} elements with "compensation"`)
      
      compElements.each((i, elem) => {
        const text = $(elem).text().trim()
        if (text.includes('$')) {
          console.log(`💰 Element ${i+1}: ${text.substring(0, 200)}`)
        }
      })
      
    } else {
      console.log('❌ Failed to access job page')
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

debugAudioEngineer()