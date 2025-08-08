// Test the improved salary extraction algorithm
function extractSalary(text) {
  // Look for salary range patterns first (higher priority)
  const rangeSalaryPatterns = [
    /\$(\d{3,})[Kk]?\s*[-–]\s*\$(\d{3,})[Kk]?/,
    /\$(\d{3,}),(\d{3})\s*[-–]\s*\$(\d{3,}),(\d{3})/,
    /USD\s*(\d{3,})[Kk]?\s*[-–]\s*(\d{3,})[Kk]?/
  ]
  
  for (const pattern of rangeSalaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      let min, max
      if (match[0].includes(',')) {
        // Format: $XXX,XXX - $XXX,XXX
        min = parseInt(match[1] + match[2]) / 1000
        max = parseInt(match[3] + match[4]) / 1000
      } else {
        // Format: $XXXK - $XXXK or $XXX - $XXX
        min = parseInt(match[1])
        max = parseInt(match[2])
        if (!match[0].toLowerCase().includes('k') && min < 1000) {
          // If no K and numbers are small, they're already in thousands
          // keep as is
        } else if (!match[0].toLowerCase().includes('k') && min > 1000) {
          // Large numbers without K means actual salary
          min = min / 1000
          max = max / 1000
        }
      }
      return {
        salary: match[0],
        min: Math.round(min),
        max: Math.round(max)
      }
    }
  }
  
  // Look for single salary patterns (like $325K + Offers Equity)
  const singleSalaryPatterns = [
    /\$(\d{3,})[Kk]?\s*\+\s*Offers?\s*Equity/i,
    /\$(\d{3,})[Kk]?\s*\+/i,
    /\$(\d{3,})[Kk]?(?!\s*[-–])/i
  ]
  
  for (const pattern of singleSalaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      let amount = parseInt(match[1])
      
      // Check if it has K suffix
      if (match[0].toLowerCase().includes('k')) {
        // Already in thousands
      } else if (amount > 1000) {
        // Convert to thousands
        amount = amount / 1000
      }
      
      // For single salary, estimate a range (±20%)
      const min = Math.round(amount * 0.8)
      const max = Math.round(amount * 1.2)
      
      return {
        salary: match[0],
        min,
        max
      }
    }
  }
  
  return {}
}

async function testImprovedExtraction() {
  console.log('🔍 Testing improved salary extraction algorithm...')
  
  // Test cases
  const testCases = [
    {
      name: 'Audio Software Engineer',
      url: 'https://openai.com/careers/audio-software-engineer/',
      expected: '$325K + Offers Equity'
    },
    {
      name: 'Data Scientist',
      url: 'https://openai.com/careers/data-scientist/',
      expected: '$255K – $405K'
    },
    {
      name: 'Principal Engineer GPU',
      url: 'https://openai.com/careers/principal-engineer-gpu-platform/',
      expected: '$405K – $590K'
    }
  ]
  
  console.log('\n📋 Testing extraction patterns on sample text...')
  
  const sampleTexts = [
    '$325K + Offers Equity',
    '$255K – $405K + Offers Equity',
    '$405K – $590K',
    '$180K + Equity',
    'Compensation $325K'
  ]
  
  sampleTexts.forEach(text => {
    const result = extractSalary(text)
    console.log(`Text: "${text}"`)
    console.log(`Result: ${result.salary || 'No match'} (${result.min}-${result.max})`)
    console.log()
  })
  
  console.log('🌐 Testing on actual job pages...')
  
  for (const testCase of testCases.slice(0, 2)) { // Test first 2 to avoid too many requests
    console.log(`\n🔍 Testing: ${testCase.name}`)
    
    try {
      const response = await fetch(testCase.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        const result = extractSalary(html)
        
        if (result.salary) {
          console.log(`✅ Found: ${result.salary} (${result.min}K - ${result.max}K)`)
        } else {
          console.log(`❌ No salary found`)
        }
      } else {
        console.log(`❌ Failed to fetch: ${response.status}`)
      }
      
      // Brief delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n✅ Test completed!')
}

testImprovedExtraction()