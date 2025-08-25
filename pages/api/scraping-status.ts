import { NextApiRequest, NextApiResponse } from 'next'

// Simple in-memory store for scraping status
// In production, you'd use Redis or database
const scrapingStatus = new Map<string, { isActive: boolean; startTime: number; company?: string }>()

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const { company } = req.query

  if (!company || typeof company !== 'string') {
    return res.status(400).json({ error: 'Company parameter required' })
  }

  switch (method) {
    case 'GET':
      // Check scraping status
      const status = scrapingStatus.get(company)
      const now = Date.now()
      
      if (status && status.isActive) {
        // Check if scraping has been running too long (timeout after 20 minutes)
        const duration = now - status.startTime
        if (duration > 20 * 60 * 1000) {
          // Timeout - clear status
          scrapingStatus.delete(company)
          return res.json({ 
            isActive: false, 
            message: 'Scraping timed out',
            duration: duration 
          })
        }
        
        return res.json({ 
          isActive: true, 
          startTime: status.startTime,
          duration: duration,
          message: 'Scraping in progress'
        })
      } else {
        return res.json({ 
          isActive: false, 
          message: 'No active scraping'
        })
      }

    case 'POST':
      // Start scraping
      const startTime = Date.now()
      scrapingStatus.set(company, { 
        isActive: true, 
        startTime: startTime,
        company: company 
      })
      console.log(`🔄 Started scraping status tracking for ${company}`)
      return res.json({ 
        success: true, 
        message: `Started scraping for ${company}`,
        startTime: startTime
      })

    case 'DELETE':
      // End scraping
      scrapingStatus.delete(company)
      console.log(`✅ Cleared scraping status for ${company}`)
      return res.json({ 
        success: true, 
        message: `Cleared scraping status for ${company}`
      })

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}