import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.TEST_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.TEST_SUPABASE_ANON_KEY

// Only create the client if both environment variables are properly set
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper function to check if supabase is available
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null
}

// Helper function to get supabase or throw error
export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Database not configured')
  }
  return supabase
}