const fs = require('fs')
const fetch = require('node-fetch')

async function downloadPages() {
  console.log('📥 Downloading original web pages for analysis...')
  
  const pages = [
    {
      name: 'main-careers-page',
      url: 'https://openai.com/careers/search/',
      description: 'Main careers search page'
    },
    {
      name: 'inference-job-page', 
      url: 'https://openai.com/careers/software-engineer-inference-tl/',
      description: 'Individual job page (Inference TL)'
    },
    {
      name: 'manufacturing-job-page',
      url: 'https://openai.com/careers/manufacturing-design-engineering/', 
      description: 'Individual job page (Manufacturing)'
    }
  ]
  
  for (const page of pages) {
    console.log(`\n🔍 Downloading: ${page.description}`)
    console.log(`   URL: ${page.url}`)
    
    try {
      const response = await fetch(page.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      console.log(`   Status: ${response.status}`)
      console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)
      
      if (response.ok) {
        const html = await response.text()
        const filename = `${page.name}-${Date.now()}.html`
        fs.writeFileSync(filename, html)
        
        console.log(`   ✅ Saved: ${filename}`)
        console.log(`   Size: ${html.length} characters`)
        console.log(`   Preview: ${html.substring(0, 200)}...`)
        
        // Quick analysis
        const reactMentions = (html.match(/react/gi) || []).length
        const jsMentions = (html.match(/javascript/gi) || []).length
        const frontendMentions = (html.match(/frontend/gi) || []).length
        
        console.log(`   Quick analysis:`)
        console.log(`     - "react" mentions: ${reactMentions}`)
        console.log(`     - "javascript" mentions: ${jsMentions}`)
        console.log(`     - "frontend" mentions: ${frontendMentions}`)
        
      } else {
        console.log(`   ❌ Failed to download: ${response.status} ${response.statusText}`)
        
        // Save the error response too
        const errorText = await response.text()
        const filename = `${page.name}-error-${response.status}-${Date.now()}.html`
        fs.writeFileSync(filename, errorText)
        console.log(`   📄 Error page saved: ${filename}`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
    
    // Wait a bit between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n✅ Download complete. Please examine the saved HTML files.')
}

downloadPages()