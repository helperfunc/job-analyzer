const cheerio = require('cheerio')
const fetch = require('node-fetch')

async function testSpecificURL() {
  console.log('🧪 Testing specific job URL...')
  
  const jobUrl = 'https://openai.com/careers/software-engineer-inference-tl/'
  
  try {
    console.log(`📄 Fetching: ${jobUrl}`)
    
    const response = await fetch(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status}`)
      return
    }
    
    const html = await response.text()
    console.log(`📊 HTML length: ${html.length} characters`)
    
    const $ = cheerio.load(html)
    
    // Test the extraction logic
    console.log('\n🔍 Testing content extraction:')
    
    // Extract job description first
    let jobDescription = ''
    const jobContentSelectors = [
      'div[data-testid="job-description"]',
      '.job-description',
      '[class*="description"]',
      '[class*="content"]',
      'main',
      'article'
    ]
    
    for (const selector of jobContentSelectors) {
      const content = $(selector).text()
      if (content && content.length > 200) {
        jobDescription = content
        console.log(`   Found content with selector "${selector}": ${content.length} chars`)
        break
      }
    }
    
    // If no specific content found, get text from common job posting containers
    if (!jobDescription) {
      jobDescription = $('body').text()
      console.log(`   Using body text: ${jobDescription.length} chars`)
    }
    
    // Find requirements/qualifications sections specifically from the job description
    let requirementsText = ''
    const lowerDesc = jobDescription.toLowerCase()
    
    // Split into paragraphs and find requirements-related sections
    const paragraphs = jobDescription.split('\n').filter(p => p.trim().length > 20)
    
    console.log(`   Found ${paragraphs.length} paragraphs`)
    
    paragraphs.forEach(paragraph => {
      const lowerPara = paragraph.toLowerCase()
      if (lowerPara.includes('requirements') || 
          lowerPara.includes('qualifications') || 
          lowerPara.includes('what you') ||
          lowerPara.includes('you have') ||
          lowerPara.includes('must have') ||
          lowerPara.includes('skills') ||
          lowerPara.includes('experience with') ||
          lowerPara.includes('minimum qualifications')) {
        requirementsText += ' ' + paragraph.toLowerCase()
      }
    })
    
    console.log(`   Requirements text length: ${requirementsText.length}`)
    
    // If no specific requirements found, don't fall back to entire body
    if (requirementsText.length < 50) {
      // Look for bullet points or lists that might contain requirements
      const listItems = $('li, ul, ol').text().toLowerCase()
      if (listItems && listItems.length > 50) {
        requirementsText = listItems
        console.log(`   Using list items: ${listItems.length} chars`)
      } else {
        // Last resort: use a small portion of the description, not the entire page
        requirementsText = jobDescription.substring(0, 1000).toLowerCase()
        console.log(`   Using first 1000 chars of description`)
      }
    }
    
    console.log(`\n📝 Final requirements text preview:`)
    console.log(`"${requirementsText.substring(0, 300)}..."`)
    
    // Test React detection
    console.log(`\n🧪 Testing React detection:`)
    
    const jobTitle = 'Software Engineer, Inference - TL'
    const isFrontendRole = jobTitle.toLowerCase().includes('frontend') || 
                           jobTitle.toLowerCase().includes('front-end') ||
                           jobTitle.toLowerCase().includes('ui') ||
                           jobTitle.toLowerCase().includes('web developer') ||
                           requirementsText.includes('frontend developer') ||
                           requirementsText.includes('web application')
    
    console.log(`   Is frontend role: ${isFrontendRole}`)
    
    const hasReactFramework = isFrontendRole && (requirementsText.includes('react.js') || 
                              requirementsText.includes('react js') ||
                              requirementsText.includes('reactjs') ||
                              requirementsText.includes('react framework') ||
                              requirementsText.includes('react library')) &&
                             !requirementsText.includes('reactive') &&
                             !requirementsText.includes('reaction') &&
                             !requirementsText.includes('react to') &&
                             !requirementsText.includes('react quickly')
    
    console.log(`   Has React framework: ${hasReactFramework}`)
    
    // Check what mentions of "react" exist
    const reactMentions = requirementsText.match(/\b\w*react\w*\b/gi) || []
    console.log(`   React-related words found: ${reactMentions.join(', ')}`)
    
    // Show context for each mention
    reactMentions.forEach((mention, i) => {
      const index = requirementsText.indexOf(mention.toLowerCase())
      const start = Math.max(0, index - 50)
      const end = Math.min(requirementsText.length, index + mention.length + 50)
      const context = requirementsText.substring(start, end)
      console.log(`   Context ${i+1}: "...${context}..."`)
    })
    
    console.log(`\n✅ Final result: ${hasReactFramework ? '❌ Would add React skill' : '✅ Would NOT add React skill'}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testSpecificURL()