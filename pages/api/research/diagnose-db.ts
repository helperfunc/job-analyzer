import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = getSupabase()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  const diagnostics: any = {
    env: {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      urlValue: supabaseUrl?.substring(0, 30) + '...',
    },
    connection: null,
    tableTest: null,
    simpleQuery: null,
    error: null
  }

  try {
    // Create a fresh client
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    diagnostics.connection = 'Client created successfully'

    // Test 1: Simple count query
    try {
      const { count, error } = await supabase
        .from('research_papers')
        .select('*', { count: 'exact', head: true })

      if (error) {
        diagnostics.tableTest = { error: error.message, code: error.code }
      } else {
        diagnostics.tableTest = { success: true, count }
      }
    } catch (e) {
      diagnostics.tableTest = { error: e instanceof Error ? e.message : 'Unknown error' }
    }

    // Test 2: Fetch a few records
    try {
      const { data, error } = await supabase
        .from('research_papers')
        .select('id, title, company')
        .limit(3)

      if (error) {
        diagnostics.simpleQuery = { error: error.message, code: error.code }
      } else {
        diagnostics.simpleQuery = { 
          success: true, 
          recordCount: data?.length || 0,
          sample: data?.[0] || null
        }
      }
    } catch (e) {
      diagnostics.simpleQuery = { error: e instanceof Error ? e.message : 'Unknown error' }
    }

    // Test 3: Check RLS policies
    try {
      // Try with service role if available (usually not in client-side)
      const { data, error } = await supabase.rpc('current_setting', { 
        setting: 'request.jwt.claims' 
      })
      
      diagnostics.auth = { 
        jwtClaims: data,
        error: error?.message 
      }
    } catch (e) {
      diagnostics.auth = { note: 'Could not check JWT claims' }
    }

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return res.status(200).json(diagnostics)
}