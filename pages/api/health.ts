import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check database connection if available
    let dbStatus = 'not configured'
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1)
          .single()
        
        dbStatus = error ? 'unhealthy' : 'healthy'
      } catch (error) {
        dbStatus = 'error'
      }
    }

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus
    })
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}