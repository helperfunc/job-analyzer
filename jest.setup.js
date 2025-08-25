import '@testing-library/jest-dom'
import { seedTestData, cleanupTestData } from './lib/test-db'

// Setup test database before all tests
beforeAll(async () => {
  console.log('🚀 Setting up test database...')
  await seedTestData()
}, 30000) // Increased timeout for database operations

// Cleanup test database after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...')
  await cleanupTestData()
}, 30000)

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isReady: true,
    }
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Don't mock fetch - let it hit real database
// global.fetch = jest.fn()

// Mock window.confirm and window.alert
global.confirm = jest.fn()
global.alert = jest.fn()

// Clean up after each test to prevent memory leaks
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
  localStorage.clear()
  sessionStorage.clear()
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})