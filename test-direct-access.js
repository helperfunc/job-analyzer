async function testDirectAccess() {
  console.log('🔍 Testing direct access to localhost:3002...')
  
  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  try {
    const response = await fetch('http://localhost:3002/', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    console.log(`📡 Response status: ${response.status}`)
    console.log(`📡 Response headers:`, [...response.headers.entries()])
    
    if (response.ok) {
      const html = await response.text()
      console.log(`✅ HTML received (${html.length} chars)`)
      if (html.includes('OpenAI 职位分析器')) {
        console.log('✅ Home page loaded successfully!')
      } else {
        console.log('⚠️ HTML content may not be correct')
        console.log('First 200 chars:', html.substring(0, 200))
      }
    } else {
      const errorText = await response.text()
      console.log('❌ Error response:', errorText.substring(0, 500))
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

testDirectAccess()