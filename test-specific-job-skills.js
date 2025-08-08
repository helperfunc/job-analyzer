const cheerio = require('cheerio')

async function testSpecificJobSkills() {
  // Test skill extraction for different job types
  const testJobs = [
    {
      title: 'Audio Software Engineer',
      url: 'https://openai.com/careers/audio-software-engineer/',
      expectedSkills: ['C++', 'Python', 'Audio Processing']
    },
    {
      title: 'Account Director - Sales',
      url: 'https://openai.com/careers/account-director-digital-native/',
      expectedSkills: ['Sales', 'Business Development']
    },
    {
      title: 'Data Scientist',
      url: 'https://openai.com/careers/data-scientist/',
      expectedSkills: ['Python', 'Machine Learning', 'Statistics']
    }
  ]
  
  console.log('🔍 Testing skill extraction for different job types...')
  
  for (const testJob of testJobs) {
    console.log(`\n🔍 Testing: ${testJob.title}`)
    console.log(`URL: ${testJob.url}`)
    
    try {
      const response = await fetch(testJob.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        const $ = cheerio.load(html)
        
        // Look for specific sections that contain requirements
        console.log('🔍 Looking for requirements sections...')
        
        // Find requirements or qualifications section
        const requirementsSections = $('*').filter((i, elem) => {
          const text = $(elem).text().toLowerCase()
          return text.includes('requirements') || 
                 text.includes('qualifications') || 
                 text.includes('skills') ||
                 text.includes('experience') ||
                 text.includes('what you')
        })
        
        console.log(`Found ${requirementsSections.length} potential requirements sections`)
        
        let requirementsText = ''
        requirementsSections.each((i, elem) => {
          const sectionText = $(elem).text()
          if (sectionText.length > 50 && sectionText.length < 2000) {
            console.log(`\nSection ${i+1} (${sectionText.length} chars):`)
            console.log(sectionText.substring(0, 300) + '...')
            requirementsText += ' ' + sectionText.toLowerCase()
          }
        })
        
        // Extract skills from requirements text
        const skills = []
        
        // Programming languages (only look in requirements sections)
        if (requirementsText.includes('python')) skills.push('Python')
        if (requirementsText.includes('javascript')) skills.push('JavaScript')
        if (requirementsText.includes('c++') || requirementsText.includes('cpp')) skills.push('C++')
        if (requirementsText.includes('go ') || requirementsText.includes('golang')) skills.push('Go')
        
        // Technical skills
        if (requirementsText.includes('machine learning') || requirementsText.includes(' ml ')) skills.push('Machine Learning')
        if (requirementsText.includes('pytorch')) skills.push('PyTorch')
        if (requirementsText.includes('tensorflow')) skills.push('TensorFlow')
        if (requirementsText.includes('kubernetes')) skills.push('Kubernetes')
        
        // Business skills
        if (requirementsText.includes('sales') || requirementsText.includes('selling')) skills.push('Sales')
        if (requirementsText.includes('business development')) skills.push('Business Development')
        if (requirementsText.includes('customer success')) skills.push('Customer Success')
        
        console.log(`\n💼 Extracted skills: ${skills.join(', ') || 'None'}`)
        console.log(`📋 Expected: ${testJob.expectedSkills.join(', ')}`)
        
      } else {
        console.log(`❌ Failed to fetch: ${response.status}`)
      }
      
      // Brief delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  }
}

testSpecificJobSkills()