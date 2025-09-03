import { supabase } from './supabase'

/**
 * Get or create a UUID for a given external auth provider user ID
 * This maintains the mapping between external auth IDs (like Google IDs) and internal UUIDs
 */
export async function getOrCreateUserUUID(
  providerUserId: string, 
  provider: string = 'unknown',
  userInfo?: {
    email?: string
    username?: string
    displayName?: string
  }
): Promise<string> {
  if (!supabase) {
    // In demo mode without database, return a consistent UUID based on the provider ID
    // This ensures the same "user" gets the same UUID in demo mode
    if (providerUserId === 'demo-user' || providerUserId === 'default') {
      return '00000000-0000-0000-0000-000000000001'
    }
    // For other demo users, generate a consistent UUID from the provider ID
    const hash = providerUserId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const uuid = `00000000-0000-0000-0000-${hash.toString(16).padStart(12, '0').slice(0, 12)}`
    return uuid
  }

  try {
    // First, check if this provider user already has a mapping
    const { data: existingMapping, error: mappingError } = await supabase
      .from('user_auth_providers')
      .select('user_id')
      .eq('provider', provider)
      .eq('provider_user_id', providerUserId)
      .single()

    if (existingMapping) {
      return existingMapping.user_id
    }

    // No mapping exists, create a new user and mapping
    // First create the user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        username: userInfo?.username || `${provider}_${providerUserId.slice(0, 20)}`,
        email: userInfo?.email || `${providerUserId}@${provider}.local`,
        password_hash: 'oauth_user_no_password',
        display_name: userInfo?.displayName || userInfo?.username || providerUserId,
        is_verified: true // OAuth users are pre-verified
      })
      .select('id')
      .single()

    if (userError) {
      // User might already exist with this email, try to find them
      if (userError.code === '23505' && userInfo?.email) { // unique violation
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', userInfo.email)
          .single()

        if (existingUser) {
          // Create the mapping for existing user
          await supabase
            .from('user_auth_providers')
            .insert({
              user_id: existingUser.id,
              provider,
              provider_user_id: providerUserId
            })
          
          return existingUser.id
        }
      }
      
      throw userError
    }

    // Create the auth provider mapping
    await supabase
      .from('user_auth_providers')
      .insert({
        user_id: newUser.id,
        provider,
        provider_user_id: providerUserId
      })

    return newUser.id

  } catch (error) {
    console.error('Error in getOrCreateUserUUID:', error)
    // Fallback to a consistent UUID based on provider ID
    const hash = providerUserId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return `00000000-0000-0000-0000-${hash.toString(16).padStart(12, '0').slice(0, 12)}`
  }
}

/**
 * Get UUID from a text user ID (for backward compatibility)
 * Handles both UUID strings and provider user IDs
 */
export async function getUserUUID(textUserId: string): Promise<string> {
  // Check if it's already a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(textUserId)) {
    return textUserId
  }

  // Try to determine the provider from the ID format
  let provider = 'unknown'
  if (textUserId.startsWith('google-')) {
    provider = 'google'
  } else if (textUserId.startsWith('github-')) {
    provider = 'github'
  } else if (textUserId === 'demo-user' || textUserId === 'default') {
    provider = 'demo'
  }

  return getOrCreateUserUUID(textUserId, provider)
}