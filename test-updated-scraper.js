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

async function testUpdatedScraper() {
  console.log('🔍 Testing updated scraper with real salary extraction...')
  
  try {
    // Get main page
    const response = await fetch('https://openai.com/careers/search/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Find high-paying job links (just test a few)
    const testJobs = [
      'Principal Engineer, GPU Platform',
      'Staff Machine Learning Engineer', 
      'Senior Research Engineer'
    ]
    
    const jobs = []
    
    console.log('🔍 Finding job links...')
    $('a').each((i, elem) => {
      const $elem = $(elem)
      const href = $elem.attr('href') || ''
      const text = $elem.text().trim()
      
      // Look for our test jobs
      if (href.includes('/careers/') && testJobs.some(job => text.includes(job))) {
        const fullUrl = href.startsWith('http') ? href : `https://openai.com${href}`
        jobs.push({
          title: text,
          url: fullUrl
        })
        console.log(`📋 Found: ${text} -> ${fullUrl}`)
      }
    })
    
    console.log(`🔍 Testing ${jobs.length} high-value jobs...`)
    
    const results = []
    
    // Test each job
    for (const job of jobs.slice(0, 3)) { // Just test first 3
      console.log(`\n🔍 Scraping: ${job.title}`)
      
      try {
        const jobResponse = await fetch(job.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        })
        
        if (jobResponse.ok) {
          const jobHtml = await jobResponse.text()
          const salaryInfo = extractSalary(jobHtml)
          
          // Extract skills
          const jobText = jobHtml.toLowerCase()
          const skills = []
          if (jobText.includes('python')) skills.push('Python')
          if (jobText.includes('cuda')) skills.push('CUDA')
          if (jobText.includes('c++')) skills.push('C++')
          if (jobText.includes('pytorch')) skills.push('PyTorch')
          if (jobText.includes('kubernetes')) skills.push('Kubernetes')
          if (jobText.includes('machine learning')) skills.push('Machine Learning')
          if (jobText.includes('distributed systems')) skills.push('Distributed Systems')
          
          const result = {
            title: job.title,
            url: job.url,
            salary: salaryInfo.salary || 'Not found',
            salary_min: salaryInfo.min,
            salary_max: salaryInfo.max,
            skills: skills.slice(0, 5), // Top 5 skills
            success: true
          }
          
          results.push(result)
          
          if (salaryInfo.salary) {
            console.log(`✅ SUCCESS: ${salaryInfo.salary}`)
            console.log(`💼 Skills: ${skills.join(', ')}`)
          } else {
            console.log(`⚠️ No salary found`)
          }
          
        } else {
          console.log(`❌ Failed: ${jobResponse.status}`)
          results.push({
            title: job.title,
            url: job.url,
            error: `HTTP ${jobResponse.status}`,
            success: false
          })
        }
        
        // Brief delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`)
        results.push({
          title: job.title,
          url: job.url,
          error: error.message,
          success: false
        })
      }
    }
    
    console.log('\n📊 Final Results:')
    console.log('================')
    
    const successful = results.filter(r => r.success && r.salary && r.salary !== 'Not found')
    const withSalary = successful.length
    const total = results.length
    
    console.log(`Total tested: ${total}`)
    console.log(`With salary data: ${withSalary}`)
    console.log(`Success rate: ${Math.round(withSalary/total * 100)}%`)
    
    console.log('\nHigh-paying jobs found:')
    successful
      .sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0))
      .forEach((job, i) => {
        console.log(`${i+1}. ${job.title}`)
        console.log(`   💰 Salary: ${job.salary}`)
        console.log(`   🛠 Skills: ${job.skills?.join(', ') || 'None extracted'}`)
        console.log(`   🔗 ${job.url}`)
        console.log()
      })
    
    // Save results
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir)
    }
    
    const testResult = {
      tested_at: new Date().toISOString(),
      total_tested: total,
      with_salary: withSalary,
      success_rate: Math.round(withSalary/total * 100),
      results: results
    }
    
    const filepath = path.join(dataDir, 'scraper-test-result.json')
    fs.writeFileSync(filepath, JSON.stringify(testResult, null, 2))
    console.log(`📁 Results saved to: ${filepath}`)
    
    return testResult
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return { error: error.message }
  }
}

// Run the test
testUpdatedScraper().then(result => {
  console.log('🏁 Test completed')
}).catch(console.error)