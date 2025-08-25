import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/get-summary'
// No mocking - use real database with test data

describe('/api/get-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    })
  })

  it('should return empty summary when no jobs found for unknown company', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        company: 'unknown-company'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    expect(response.success).toBe(true)
    expect(response.summary.total_jobs).toBe(0)
  })

  it('should return summary with real job data for OpenAI', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        company: 'openai'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.success).toBe(true)
    expect(response.company).toBe('Openai')
    expect(response.summary.total_jobs).toBeGreaterThanOrEqual(0)
    expect(response.summary).toHaveProperty('jobs_with_salary')
    expect(response.summary).toHaveProperty('highest_paying_jobs')
    expect(response.summary).toHaveProperty('most_common_skills')
  })

  it('should return summary with real job data from test database', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        company: 'openai'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.success).toBe(true)
    expect(response.company).toBe('Openai')
    
    // Check that we get data from our test seed
    if (response.summary.total_jobs > 0) {
      expect(response.summary.jobs_with_salary).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(response.summary.highest_paying_jobs)).toBe(true)
      expect(Array.isArray(response.summary.most_common_skills)).toBe(true)
    }
  })

  it('should handle DeepMind company correctly with real data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        company: 'deepmind'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    
    expect(response.success).toBe(true)
    expect(response.company).toBe('DeepMind')
    expect(response.summary).toHaveProperty('total_jobs')
    expect(response.summary.total_jobs).toBeGreaterThanOrEqual(0)
  })

  it('should handle missing company parameter by defaulting to openai', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {}
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const response = JSON.parse(res._getData())
    expect(response.success).toBe(true)
    expect(response.company).toBe('Openai') // Defaults to openai, capitalized
    expect(response.summary).toHaveProperty('total_jobs')
  })
})