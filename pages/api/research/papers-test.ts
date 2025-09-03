import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isSupabaseAvailable()) {
    return res.status(200).json({
      success: false,
      message: 'Database not configured',
      data: [],
      total: 0
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
    
    console.log('Testing basic papers query without any filters...')
    
    // Simple query to get papers
    const { data, error, count } = await supabase
      .from('research_papers')
      .select('*', { count: 'exact' })
      .limit(10)

    console.log('Query result:', { 
      hasData: !!data, 
      dataLength: data?.length, 
      hasError: !!error,
      count 
    })

    if (error) {
      console.error('Query error:', error)
      return res.status(200).json({
        success: false,
        error: error.message,
        errorCode: error.code,
        data: [],
        total: 0
      })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      total: count || data?.length || 0,
      message: 'Query successful'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: 'Server error',
      data: [],
      total: 0
    })
  }
}