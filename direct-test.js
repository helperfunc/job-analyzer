const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

// Extract salary from text
function extractSalary(text) {
  const salaryPatterns = [
    /\$(\d{3,})[Kk]?\s*[-–]\s*\$(\d{3,})[Kk]?/,
    /\$(\d{3,}),(\d{3})\s*[-–]\s*\$(\d{3,}),(\d{3})/,
    /USD\s*(\d{3,})[Kk]?\s*[-–]\s*(\d{3,})[Kk]?/
  ]
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      let min, max
      if (match[0].includes(',')) {
        min = parseInt(match[1] + match[2]) / 1000
        max = parseInt(match[3] + match[4]) / 1000
      } else {
        min = parseInt(match[1])
        max = parseInt(match[2])
        if (!match[0].toLowerCase().includes('k') && min < 1000) {
          // keep as is
        } else if (!match[0].toLowerCase().includes('k') && min > 1000) {
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
  return {}
}

async function testScraper() {
  console.log('🔍 Testing direct OpenAI scraping...')
  
  try {
    const response = await fetch('https://openai.com/careers/search/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    console.log(`📄 Status: ${response.status}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    console.log(`📄 HTML length: ${html.length} bytes`)
    
    const $ = cheerio.load(html)
    
    // Look for structured data first
    const jobs = []
    let foundStructuredData = false
    
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html() || '{}')
        console.log('📋 Found JSON-LD data:', Object.keys(data))
        
        if (data['@type'] === 'JobPosting' || (Array.isArray(data) && data.some(d => d['@type'] === 'JobPosting'))) {
          foundStructuredData = true
          const postings = Array.isArray(data) ? data : [data]
          postings.forEach(posting => {
            if (posting['@type'] === 'JobPosting') {
              console.log(`💼 Job: ${posting.title}`)
              jobs.push({
                title: posting.title,
                url: posting.url,
                location: posting.jobLocation?.address?.addressLocality || 'Unknown',
                salary: posting.baseSalary?.value
              })
            }
          })
        }
      } catch (e) {
        // Not valid JSON
      }
    })
    
    if (!foundStructuredData) {
      console.log('⚠️ No structured JSON-LD data found, parsing HTML...')
      
      // Try to find job listings in various ways
      $('a').each((i, elem) => {
        const $elem = $(elem)
        const href = $elem.attr('href') || ''
        const text = $elem.text().trim()
        
        if (href.includes('/careers/') && text && text.length > 5 && text.length < 100) {
          if (text.includes('Engineer') || text.includes('Scientist') || 
              text.includes('Researcher') || text.includes('Manager') ||
              text.includes('Director') || text.includes('Principal')) {
            console.log(`💼 Found job link: ${text} -> ${href}`)
            jobs.push({
              title: text,
              url: href.startsWith('http') ? href : `https://openai.com${href}`,
              location: 'San Francisco'
            })
          }
        }
      })
    }
    
    console.log(`✅ Total jobs found: ${jobs.length}`)
    
    // Test accessing a specific known job URL
    if (jobs.length > 0) {
      const testJob = jobs[0]
      console.log(`🔍 Testing access to: ${testJob.url}`)
      
      try {
        const jobResponse = await fetch(testJob.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        })
        
        console.log(`Job page status: ${jobResponse.status}`)
        
        if (jobResponse.ok) {
          const jobHtml = await jobResponse.text()
          const salaryInfo = extractSalary(jobHtml)
          console.log('💰 Salary info:', salaryInfo)
        }
      } catch (error) {
        console.log('❌ Failed to access job page:', error.message)
      }
    }
    
    // Create a test result
    const result = {
      success: true,
      total_jobs: jobs.length,
      jobs: jobs.slice(0, 5), // First 5 jobs
      test_completed: new Date().toISOString()
    }
    
    // Save test result
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir)
    }
    
    const filepath = path.join(dataDir, 'test-result.json')
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2))
    console.log(`📁 Test result saved to: ${filepath}`)
    
    return result
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return { error: error.message }
  }
}

// Run the test
testScraper().then(result => {
  console.log('🏁 Test completed:', result)
}).catch(console.error)