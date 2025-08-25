import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/scraping-status'

describe('/api/scraping-status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 for missing company parameter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Company parameter required'
    })
  })

  it('should return inactive status when no scraping is running', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        company: 'openai'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({
      isActive: false,
      message: 'No active scraping'
    })
  })

  it('should start scraping status tracking', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        company: 'openai'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.success).toBe(true)
    expect(response.message).toBe('Started scraping for openai')
    expect(response.startTime).toBeDefined()
    expect(typeof response.startTime).toBe('number')
  })

  it('should return active status when scraping is running', async () => {
    // First, start scraping
    const { req: startReq, res: startRes } = createMocks({
      method: 'POST',
      query: {
        company: 'deepmind'
      }
    })

    await handler(startReq, startRes)
    const startResponse = JSON.parse(startRes._getData())

    // Then check status
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        company: 'deepmind'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.isActive).toBe(true)
    expect(response.message).toBe('Scraping in progress')
    expect(response.startTime).toBe(startResponse.startTime)
    expect(response.duration).toBeDefined()
    expect(response.duration).toBeGreaterThanOrEqual(0)
  })

  it('should clear scraping status', async () => {
    // First, start scraping
    const { req: startReq, res: startRes } = createMocks({
      method: 'POST',
      query: {
        company: 'anthropic'
      }
    })

    await handler(startReq, startRes)

    // Then clear it
    const { req: deleteReq, res: deleteRes } = createMocks({
      method: 'DELETE',
      query: {
        company: 'anthropic'
      }
    })

    await handler(deleteReq, deleteRes)

    expect(deleteRes._getStatusCode()).toBe(200)
    expect(JSON.parse(deleteRes._getData())).toEqual({
      success: true,
      message: 'Cleared scraping status for anthropic'
    })

    // Verify it's cleared
    const { req: checkReq, res: checkRes } = createMocks({
      method: 'GET',
      query: {
        company: 'anthropic'
      }
    })

    await handler(checkReq, checkRes)

    expect(checkRes._getStatusCode()).toBe(200)
    expect(JSON.parse(checkRes._getData())).toEqual({
      isActive: false,
      message: 'No active scraping'
    })
  })

  it('should timeout old scraping status after 20 minutes', async () => {
    // Mock Date.now to simulate time passing
    const originalNow = Date.now
    let currentTime = 1000000000000 // Some fixed time

    Date.now = jest.fn(() => currentTime)

    // Start scraping
    const { req: startReq, res: startRes } = createMocks({
      method: 'POST',
      query: {
        company: 'openai'
      }
    })

    await handler(startReq, startRes)

    // Advance time by 21 minutes
    currentTime += 21 * 60 * 1000

    // Check status - should be timed out
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        company: 'openai'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.isActive).toBe(false)
    expect(response.message).toBe('Scraping timed out')
    expect(response.duration).toBe(21 * 60 * 1000)

    // Restore Date.now
    Date.now = originalNow
  })

  it('should return 405 for unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      query: {
        company: 'openai'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    })
  })

  it('should handle multiple companies independently', async () => {
    // Start scraping for OpenAI
    const { req: openaiStartReq, res: openaiStartRes } = createMocks({
      method: 'POST',
      query: { company: 'openai' }
    })
    await handler(openaiStartReq, openaiStartRes)

    // Start scraping for DeepMind
    const { req: deepmindStartReq, res: deepmindStartRes } = createMocks({
      method: 'POST',
      query: { company: 'deepmind' }
    })
    await handler(deepmindStartReq, deepmindStartRes)

    // Check OpenAI status - should be active
    const { req: openaiCheckReq, res: openaiCheckRes } = createMocks({
      method: 'GET',
      query: { company: 'openai' }
    })
    await handler(openaiCheckReq, openaiCheckRes)
    expect(JSON.parse(openaiCheckRes._getData()).isActive).toBe(true)

    // Check DeepMind status - should be active
    const { req: deepmindCheckReq, res: deepmindCheckRes } = createMocks({
      method: 'GET',
      query: { company: 'deepmind' }
    })
    await handler(deepmindCheckReq, deepmindCheckRes)
    expect(JSON.parse(deepmindCheckRes._getData()).isActive).toBe(true)

    // Clear OpenAI scraping
    const { req: openaiDeleteReq, res: openaiDeleteRes } = createMocks({
      method: 'DELETE',
      query: { company: 'openai' }
    })
    await handler(openaiDeleteReq, openaiDeleteRes)

    // Check OpenAI status - should be inactive
    const { req: openaiCheck2Req, res: openaiCheck2Res } = createMocks({
      method: 'GET',
      query: { company: 'openai' }
    })
    await handler(openaiCheck2Req, openaiCheck2Res)
    expect(JSON.parse(openaiCheck2Res._getData()).isActive).toBe(false)

    // Check DeepMind status - should still be active
    const { req: deepmindCheck2Req, res: deepmindCheck2Res } = createMocks({
      method: 'GET',
      query: { company: 'deepmind' }
    })
    await handler(deepmindCheck2Req, deepmindCheck2Res)
    expect(JSON.parse(deepmindCheck2Res._getData()).isActive).toBe(true)
  })
})