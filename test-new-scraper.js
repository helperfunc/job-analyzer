const { NextApiRequest, NextApiResponse } = require('next')
const handler = require('./pages/api/scrape-with-puppeteer.ts').default

// Mock request and response
const req = {
  method: 'POST',
  body: { url: 'https://openai.com/careers/search/' }
}

const res = {
  status: (code) => ({
    json: (data) => {
      console.log(`Status: ${code}`)
      console.log('Response:', JSON.stringify(data, null, 2))
    }
  })
}

// Test the handler
console.log('Testing new scraper approach...')
handler(req, res).catch(console.error)