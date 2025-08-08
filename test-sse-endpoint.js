async function testSSEEndpoint() {
  console.log('🔍 Testing Server-Sent Events endpoint...')
  
  try {
    const response = await fetch('http://localhost:3002/api/scrape-progress', {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    })
    
    console.log(`📡 Response status: ${response.status}`)
    console.log(`📡 Content-Type: ${response.headers.get('content-type')}`)
    
    if (response.ok) {
      console.log('✅ SSE endpoint is accessible')
      
      // Read a few lines to test the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let receivedData = ''
      
      for (let i = 0; i < 5; i++) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        receivedData += chunk
        console.log(`📋 Received chunk ${i+1}: ${chunk.substring(0, 100)}...`)
        
        // Small delay to not overwhelm
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      reader.cancel()
      console.log('✅ SSE stream is working')
      
    } else {
      console.log(`❌ HTTP Error: ${response.status}`)
      const text = await response.text()
      console.log('Error response:', text)
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

testSSEEndpoint()