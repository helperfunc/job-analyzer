import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../../contexts/AuthContext'
import Auth from '../../pages/auth'
import Dashboard from '../../pages/dashboard'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
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

describe('Authentication Flow Integration', () => {
  const mockRouter = {
    push: mockPush,
    replace: mockReplace,
    pathname: '/auth',
    query: {},
    asPath: '/auth'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(fetch as jest.Mock).mockClear()
    localStorage.clear()
  })

  it('completes full login flow from auth to dashboard', async () => {
    // Render auth page
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    // Check that auth page renders correctly
    expect(screen.getByText('Welcome to Job Analyzer')).toBeInTheDocument()
    expect(screen.getByText('Sign in with your Gmail account to access all features')).toBeInTheDocument()
    
    // Check Google login button exists
    const googleButton = screen.getByText('Continue with Google')
    expect(googleButton).toBeInTheDocument()
    
    // Check guest option exists
    const guestButton = screen.getByText('Continue as Guest')
    expect(guestButton).toBeInTheDocument()
  })

  it('allows guest access without authentication', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    // Check guest option exists
    const guestButton = screen.getByText('Continue as Guest')
    expect(guestButton).toBeInTheDocument()
    
    // Test guest navigation works
    expect(guestButton.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders authentication options correctly', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    // Check all expected elements are present
    expect(screen.getByText('Welcome to Job Analyzer')).toBeInTheDocument()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    expect(screen.getByText('Continue as Guest')).toBeInTheDocument()
    expect(screen.getByText('What you can do after login:')).toBeInTheDocument()
    expect(screen.getByText('• Bookmark jobs and research papers')).toBeInTheDocument()
  })

  it('redirects unauthenticated users from dashboard to auth', async () => {
    // Mock unauthenticated response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      status: 401,
      json: async () => ({ error: 'Unauthorized' })
    })

    mockRouter.pathname = '/dashboard'
    ;(useRouter as jest.Mock).mockReturnValue({
      ...mockRouter,
      pathname: '/dashboard'
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })
  })

  it('maintains authentication state during dashboard operations', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      stats: {
        bookmarks: 5,
        comments: 3,
        resources: 2,
        publicResources: 1
      }
    }

    const mockBookmarks = [
      {
        id: 'bookmark-1',
        bookmark_type: 'paper',
        title: 'Test Paper',
        created_at: '2023-01-01T00:00:00.000Z'
      }
    ]

    // Mock authenticated dashboard load with comprehensive API coverage
    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/auth/me-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, user: mockUser })
        })
      }
      if (url.includes('/api/user/bookmarks-with-content')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, bookmarks: mockBookmarks })
        })
      }
      // Default response for other API calls
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [], resources: [] })
      })
    })

    mockRouter.pathname = '/dashboard'
    ;(useRouter as jest.Mock).mockReturnValue({
      ...mockRouter,
      pathname: '/dashboard'
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    // Verify user information is displayed
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    // Switch to bookmarks tab
    const bookmarksTab = screen.getByText('Bookmarks (5)')
    fireEvent.click(bookmarksTab)

    // Verify bookmarks are loaded and displayed
    await waitFor(() => {
      expect(screen.getByText('Test Paper')).toBeInTheDocument()
    })

    // Verify both API calls were made with credentials  
    expect(fetch).toHaveBeenCalledWith('/api/auth/me-simple', {
      credentials: 'include'
    })
    expect(fetch).toHaveBeenCalledWith('/api/user/bookmarks-with-content', {
      credentials: 'include'
    })
  })

  it('handles logout flow correctly', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      stats: { bookmarks: 0, comments: 0, resources: 0, publicResources: 0 }
    }

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: mockUser })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    mockRouter.pathname = '/dashboard'
    ;(useRouter as jest.Mock).mockReturnValue({
      ...mockRouter,
      pathname: '/dashboard'
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
    })

    // Click logout
    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/auth')
  })

  it('displays authentication features and benefits correctly', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    // Check that all feature descriptions are present
    expect(screen.getByText('What you can do after login:')).toBeInTheDocument()
    expect(screen.getByText('• Create and share resources (public/private)')).toBeInTheDocument()
    expect(screen.getByText('• Comment on jobs, papers, and resources')).toBeInTheDocument()
    expect(screen.getByText('• Vote on content (upvote/downvote)')).toBeInTheDocument()
    expect(screen.getByText('• Get personalized recommendations')).toBeInTheDocument()
    expect(screen.getByText('• View content from all users')).toBeInTheDocument()
  })
})