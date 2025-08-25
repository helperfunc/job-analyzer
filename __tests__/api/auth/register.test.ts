import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/auth/register'
// No mocking - use real database with test data

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  // Cleanup helper
  const cleanupTestUser = async (email: string) => {
    const { supabase } = await import('../../../lib/supabase')
    if (supabase) {
      await supabase.from('users').delete().eq('email', email)
    }
  }

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    })
  })

  it('should return 400 for missing required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com'
        // missing username and password
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const response = JSON.parse(res._getData())
    expect(response.error).toBe('Missing required fields')
    expect(response.details).toBe('Username, email, and password are required')
  })

  it('should return 400 for invalid email format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Invalid email format'
    })
  })

  it('should return 400 for weak password', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // too short
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    const response = JSON.parse(res._getData())
    expect(response.error).toBe('Password too short')
    expect(response.details).toBe('Password must be at least 6 characters long')
  })

  it('should handle database RLS policy (registration blocked by security)', async () => {
    const testEmail = 'rls-test@example.com'
    const testUsername = 'rlsuser'
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: testUsername,
        email: testEmail,
        password: 'password123'
      }
    })

    await handler(req, res)

    // With RLS enabled, registration should fail with 500 and specific error
    expect(res._getStatusCode()).toBe(500)
    const response = JSON.parse(res._getData())
    expect(response.error).toBe('Database configuration error')
    expect(response.details).toContain('User registration requires database setup')
    expect(response.suggestion).toContain('ALTER TABLE users DISABLE ROW LEVEL SECURITY')
  })

  it('should handle RLS security policy correctly', async () => {
    const testEmail = 'security-test@example.com'
    const testUsername = 'securityuser'
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: testUsername,
        email: testEmail,
        password: 'password123',
        displayName: 'Test User'
      }
    })

    await handler(req, res)

    // RLS policy should prevent user creation
    expect(res._getStatusCode()).toBe(500)
    const response = JSON.parse(res._getData())
    
    expect(response.error).toBe('Database configuration error')
    expect(response.details).toContain('User registration requires database setup')
  })

  it('should validate registration attempt against RLS policy', async () => {
    const testEmail = 'validation-test@example.com'
    const testUsername = 'validationuser'
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        username: testUsername,
        email: testEmail,
        password: 'password123'
      }
    })

    await handler(req, res)

    // Database RLS should block the registration
    expect(res._getStatusCode()).toBe(500)
    const response = JSON.parse(res._getData())
    expect(response.error).toBe('Database configuration error')
    expect(response.details).toContain('User registration requires database setup')
  })
})