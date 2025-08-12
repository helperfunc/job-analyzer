import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let browser = null
  
  try {
    console.log('🚀 Starting Puppeteer test...')
    
    browser = await puppeteer.launch({
      headless: false, // Show browser to see what happens
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      ]
    })
    
    const page = await browser.newPage()
    
    // Set realistic headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Hide automation signals
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
    })

    console.log('📄 Navigating to OpenAI research...')
    
    const url = 'https://openai.com/research/'
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
    
    console.log('⏳ Waiting for page to fully load...')
    await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
    
    const html = await page.content()
    const title = await page.title()
    
    console.log(`📊 Page title: ${title}`)
    console.log(`📊 Content length: ${html.length}`)
    console.log(`📊 Contains "Just a moment": ${html.includes('Just a moment')}`)
    console.log(`📊 Contains "research": ${html.toLowerCase().includes('research')}`)
    
    // Save HTML for inspection
    const fs = require('fs')
    const path = require('path')
    const debugDir = path.join(process.cwd(), 'debug')
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true })
    }
    fs.writeFileSync(path.join(debugDir, 'openai-test.html'), html)
    console.log('💾 Saved HTML to debug/openai-test.html')
    
    res.status(200).json({
      success: true,
      title,
      contentLength: html.length,
      cloudflare: html.includes('Just a moment'),
      hasResearch: html.toLowerCase().includes('research'),
      debugFile: 'debug/openai-test.html'
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  } finally {
    if (browser) {
      console.log('🔒 Closing browser...')
      await browser.close()
    }
  }
}