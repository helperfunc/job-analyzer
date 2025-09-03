import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if Supabase is configured
  if (!isSupabaseAvailable()) {
    return res.status(200).json({
      success: false,
      message: 'Supabase not configured',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY
    })
  }

  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    // Simple query without any filters
    console.log('Testing basic papers query...')
    
    const { data, error, count } = await supabase
      .from('research_papers')
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      console.error('Test query error:', error)
      return res.status(200).json({
        success: false,
        error: error,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint
      })
    }

    return res.status(200).json({
      success: true,
      count: count,
      dataLength: data?.length || 0,
      firstPaper: data?.[0] || null,
      message: 'Test query successful'
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}