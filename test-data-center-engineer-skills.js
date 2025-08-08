const cheerio = require('cheerio')

async function testDataCenterEngineerSkills() {
  const jobUrl = 'https://openai.com/careers/data-center-design-engineer-electrical-stargate/'
  
  console.log('🔍 Testing Data Center Engineer skill extraction:', jobUrl)
  
  try {
    const response = await fetch(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    if (response.ok) {
      const html = await response.text()
      const $ = cheerio.load(html)
      
      console.log('🔍 Looking for requirements and qualifications...')
      
      // Find sections containing requirements
      let requirementsText = ''
      const requirementsSections = $('*').filter((i, elem) => {
        const text = $(elem).text().toLowerCase()
        return (text.includes('qualifications') || 
               text.includes('requirements') || 
               text.includes('key responsibilities') ||
               text.includes('preferred skills') ||
               text.includes('experience')) &&
               text.length > 100 && text.length < 3000
      })
      
      console.log(`Found ${requirementsSections.length} requirements sections`)
      
      requirementsSections.each((i, elem) => {
        const sectionText = $(elem).text()
        console.log(`\nSection ${i+1} (${sectionText.length} chars):`)
        console.log(sectionText.substring(0, 400) + '...')
        requirementsText += ' ' + sectionText.toLowerCase()
      })
      
      // Extract skills specific to data center/infrastructure roles
      const skills = []
      
      // Data Center & Infrastructure Skills
      if (requirementsText.includes('mep') || requirementsText.includes('mechanical, electrical, plumbing')) skills.push('MEP Systems')
      if (requirementsText.includes('data center') || requirementsText.includes('datacenter')) skills.push('Data Center Design')
      if (requirementsText.includes('power') || requirementsText.includes('electrical')) skills.push('Power Systems')
      if (requirementsText.includes('cooling') || requirementsText.includes('hvac')) skills.push('Cooling Systems')
      if (requirementsText.includes('ups') || requirementsText.includes('uninterruptible power')) skills.push('UPS Systems')
      if (requirementsText.includes('generator') || requirementsText.includes('backup power')) skills.push('Backup Power')
      if (requirementsText.includes('chiller') || requirementsText.includes('cdu')) skills.push('Cooling Equipment')
      if (requirementsText.includes('critical infrastructure') || requirementsText.includes('mission critical')) skills.push('Critical Infrastructure')
      if (requirementsText.includes('vendor management') || requirementsText.includes('contractor')) skills.push('Vendor Management')
      if (requirementsText.includes('project management') || requirementsText.includes('project lead')) skills.push('Project Management')
      if (requirementsText.includes('commissioning') || requirementsText.includes('testing')) skills.push('Commissioning')
      if (requirementsText.includes('compliance') || requirementsText.includes('regulatory')) skills.push('Regulatory Compliance')
      if (requirementsText.includes('construction') || requirementsText.includes('building')) skills.push('Construction Management')
      if (requirementsText.includes('cad') || requirementsText.includes('autocad')) skills.push('CAD/Design Software')
      
      // Management & Leadership
      if (requirementsText.includes('leadership') || requirementsText.includes('leading teams')) skills.push('Leadership')
      if (requirementsText.includes('operations') || requirementsText.includes('operational')) skills.push('Operations Management')
      
      // Professional Certifications
      if (requirementsText.includes('professional engineer') || requirementsText.includes('pe license')) skills.push('Professional Engineering License')
      if (requirementsText.includes('bachelor') || requirementsText.includes('degree')) skills.push('Engineering Degree')
      
      console.log(`\n💼 Extracted skills for Data Center Engineer:`)
      skills.forEach((skill, i) => {
        console.log(`   ${i+1}. ${skill}`)
      })
      
      console.log(`\n📊 Total skills found: ${skills.length}`)
      
      return skills
      
    } else {
      console.log(`❌ Failed to fetch: ${response.status}`)
      return []
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return []
  }
}

testDataCenterEngineerSkills()