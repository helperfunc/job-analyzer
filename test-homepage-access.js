async function testHomepageAccess() {
  console.log('🔍 Testing homepage access after restart...')
  
  // Wait for server to be fully ready
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  try {
    const response = await fetch('http://localhost:3002/', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    console.log(`📡 Status: ${response.status}`)
    console.log(`📡 Status Text: ${response.statusText}`)
    
    if (response.ok) {
      const html = await response.text()
      console.log(`✅ Page loaded successfully (${html.length} chars)`)
      
      // Check if it contains expected content
      if (html.includes('OpenAI 职位分析器')) {
        console.log('✅ Homepage content is correct!')
      } else if (html.includes('404')) {
        console.log('❌ Page shows 404 error')
        console.log('First 500 chars:', html.substring(0, 500))
      } else {
        console.log('⚠️ Unexpected content')
        console.log('Title:', html.match(/<title>(.*?)<\/title>/)?.[1] || 'No title found')
      }
    } else {
      console.log(`❌ HTTP Error: ${response.status}`)
      const text = await response.text()
      console.log('Error content:', text.substring(0, 300))
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

testHomepageAccess()