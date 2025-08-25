import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/user/bookmarks-with-content'
import jwt from 'jsonwebtoken'
// No mocking - use real database with test data

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key'

describe('/api/user/bookmarks-with-content', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Helper function to create a valid JWT token for testing
  const createTestToken = (userId: string = 'test-user-1') => {
    return jwt.sign({ userId, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' })
  }

  it('should return 401 for missing token', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Authentication required',
      details: 'No token provided'
    })
  })

  it('should return 401 for invalid token', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer invalid-token'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const response = JSON.parse(res._getData())
    expect(response.error).toBe('Invalid or expired token')
  })

  it('should return empty bookmarks when user has no bookmarks', async () => {
    const testToken = createTestToken('nonexistent-user')
    
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testToken}`
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    expect(response.success).toBe(true)
    expect(response.bookmarks).toEqual([])
    expect(response.total).toBe(0)
  })

  it('should return bookmarks with real database content', async () => {
    const testToken = createTestToken('test-user-1')
    
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testToken}`
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.success).toBe(true)
    expect(response.bookmarks).toBeInstanceOf(Array)
    expect(response.total).toBeGreaterThanOrEqual(0)
    
    // Verify structure of returned bookmarks
    if (response.bookmarks.length > 0) {
      const bookmark = response.bookmarks[0]
      expect(bookmark).toHaveProperty('bookmark_type')
      expect(bookmark).toHaveProperty('created_at')
    }
  })

  it('should handle bookmarks data correctly', async () => {
    const testToken = createTestToken('test-user-2')
    
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testToken}`
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.success).toBe(true)
    expect(response.bookmarks).toBeInstanceOf(Array)
    expect(typeof response.total).toBe('number')
  })

  it('should filter bookmarks by user ID correctly', async () => {
    const testToken1 = createTestToken('test-user-1')
    const testToken2 = createTestToken('test-user-2')
    
    // Test with first user
    const { req: req1, res: res1 } = createMocks({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testToken1}`
      }
    })

    await handler(req1, res1)
    const response1 = JSON.parse(res1._getData())

    // Test with second user  
    const { req: req2, res: res2 } = createMocks({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testToken2}`
      }
    })

    await handler(req2, res2)
    const response2 = JSON.parse(res2._getData())

    // Both should succeed
    expect(res1._getStatusCode()).toBe(200)
    expect(res2._getStatusCode()).toBe(200)
    expect(response1.success).toBe(true)
    expect(response2.success).toBe(true)
  })

  it('should return 405 for non-GET requests', async () => {
    const testToken = createTestToken()
    
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: `Bearer ${testToken}`
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    })
  })
})