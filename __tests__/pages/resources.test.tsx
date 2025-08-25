import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../../contexts/AuthContext'
import Resources from '../../pages/resources'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

// Test wrapper with AuthProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
)

describe('Resources Page', () => {
  const mockRouter = {
    push: mockPush,
    pathname: '/resources',
    query: {},
    asPath: '/resources'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(fetch as jest.Mock).mockClear()
    // Clear localStorage to prevent state persistence
    localStorage.clear()
    // Reset window.open mock if it exists
    if (window.open && typeof window.open === 'function' && 'mockClear' in window.open) {
      (window.open as jest.Mock).mockClear()
    }
  })

  afterEach(() => {
    cleanup()
    jest.clearAllTimers()
  })

  it('renders page title and description', async () => {
    // Mock API responses for all endpoints that might be called
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Resources />
        </TestWrapper>
      )
    })

    expect(screen.getByText('Resource Management Center')).toBeInTheDocument()
    expect(screen.getByText(/Create, organize, and manage all your job-related resources in one place/)).toBeInTheDocument()
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('0 of 0 resources')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('displays loading state', async () => {
    // Mock a delayed response to test loading state
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      }), 100))
    )

    await act(async () => {
      render(
        <TestWrapper>
          <Resources />
        </TestWrapper>
      )
    })

    // Should show loading spinner initially
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    await act(async () => {
      render(
        <TestWrapper>
          <Resources />
        </TestWrapper>
      )
    })

    // Should show empty state when API fails
    await waitFor(() => {
      expect(screen.getByText('0 of 0 resources')).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})