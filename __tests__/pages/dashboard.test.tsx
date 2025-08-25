import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../../contexts/AuthContext'
import Dashboard from '../../pages/dashboard'

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

describe('Dashboard Page', () => {
  const mockRouter = {
    push: mockPush,
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(fetch as jest.Mock).mockClear()
    
    // Default mock for all fetch calls
    ;(fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          bookmarks: [],
          user: {
            id: 'test-user',
            email: 'test@example.com',
            stats: { bookmarks: 0, comments: 0, resources: 0, publicResources: 0 }
          }
        })
      })
    )
  })

  it('redirects to auth if user is not authenticated', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      status: 401,
      json: async () => ({ error: 'Unauthorized' })
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

  it('displays user information when authenticated', async () => {
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

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: mockUser
      })
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
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('displays user stats correctly', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      stats: {
        bookmarks: 10,
        comments: 5,
        resources: 8,
        publicResources: 3
      }
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: mockUser })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument() // bookmarks
      expect(screen.getByText('8')).toBeInTheDocument() // resources
      expect(screen.getByText('5')).toBeInTheDocument() // comments
      expect(screen.getByText('3 public, 5 private')).toBeInTheDocument() // resource breakdown
    })
  })

  it('switches between tabs correctly', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      stats: { bookmarks: 0, comments: 0, resources: 0, publicResources: 0 }
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: mockUser })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument()
    })

    // Click on Bookmarks tab
    const bookmarksTab = screen.getByText('Bookmarks (0)')
    fireEvent.click(bookmarksTab)

    expect(screen.getByText('Your Bookmarks (0)')).toBeInTheDocument()

    // Click on Resources tab
    const resourcesTab = screen.getByText(/My Resources/)
    fireEvent.click(resourcesTab)

    expect(screen.getByText('Your Resources (0)')).toBeInTheDocument()
  })

  it('loads and displays bookmarks when bookmarks tab is active', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      stats: { bookmarks: 2, comments: 0, resources: 0, publicResources: 0 }
    }

    const mockBookmarks = [
      {
        id: 'bookmark-1',
        bookmark_type: 'paper',
        title: 'Test Paper',
        description: 'A test research paper',
        created_at: '2023-01-01T00:00:00.000Z',
        metadata: {
          authors: ['John Doe'],
          company: 'OpenAI',
          url: 'https://example.com/paper'
        }
      },
      {
        id: 'bookmark-2',
        bookmark_type: 'resource',
        title: 'Test Resource',
        description: 'A helpful resource',
        created_at: '2023-01-01T00:00:00.000Z',
        metadata: {
          url: 'https://example.com/resource',
          resource_type: 'article'
        }
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
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

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Bookmarks (2)')).toBeInTheDocument()
    })

    // Click on bookmarks tab
    const bookmarksTab = screen.getByText('Bookmarks (2)')
    fireEvent.click(bookmarksTab)

    await waitFor(() => {
      expect(screen.getByText('Test Paper')).toBeInTheDocument()
      expect(screen.getByText('Test Resource')).toBeInTheDocument()
      expect(screen.getByText('A test research paper')).toBeInTheDocument()
    })
  })

  it('opens bookmark links in new tab when View is clicked', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      stats: { bookmarks: 1, comments: 0, resources: 0, publicResources: 0 }
    }

    const mockBookmarks = [
      {
        id: 'bookmark-1',
        bookmark_type: 'paper',
        title: 'Test Paper',
        metadata: {
          url: 'https://arxiv.org/abs/1234.5678'
        }
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
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
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [], resources: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    // Switch to bookmarks tab
    await waitFor(() => {
      const bookmarksTab = screen.getByText('Bookmarks (1)')
      fireEvent.click(bookmarksTab)
    })

    await waitFor(() => {
      const viewLink = screen.getByText('View')
      expect(viewLink).toHaveAttribute('href', 'https://arxiv.org/abs/1234.5678')
      expect(viewLink).toHaveAttribute('target', '_blank')
    })
  })

  it('filters bookmarks based on search input', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      stats: { bookmarks: 2, comments: 0, resources: 0, publicResources: 0 }
    }

    const mockBookmarks = [
      {
        id: 'bookmark-1',
        bookmark_type: 'paper',
        title: 'Machine Learning Paper',
        created_at: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'bookmark-2',
        bookmark_type: 'paper',
        title: 'Deep Learning Research',
        created_at: '2023-01-01T00:00:00.000Z'
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
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
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [], resources: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    // Switch to bookmarks tab
    await waitFor(() => {
      const bookmarksTab = screen.getByText('Bookmarks (2)')
      fireEvent.click(bookmarksTab)
    })

    await waitFor(() => {
      expect(screen.getByText('Machine Learning Paper')).toBeInTheDocument()
      expect(screen.getByText('Deep Learning Research')).toBeInTheDocument()
    })

    // Search for "machine"
    const searchInput = screen.getByPlaceholderText('Search bookmarks...')
    fireEvent.change(searchInput, { target: { value: 'machine' } })

    // Should only show the machine learning paper
    expect(screen.getByText('Machine Learning Paper')).toBeInTheDocument()
    expect(screen.queryByText('Deep Learning Research')).not.toBeInTheDocument()
  })

  it('handles logout correctly', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
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

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      const logoutButton = screen.getByText('Logout')
      expect(logoutButton).toBeInTheDocument()
    })

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

  it('refreshes data when refresh button is clicked', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      stats: { bookmarks: 1, comments: 0, resources: 0, publicResources: 0 }
    }

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: mockUser })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, bookmarks: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, bookmarks: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    // Switch to bookmarks tab
    await waitFor(() => {
      const bookmarksTab = screen.getByText('Bookmarks (1)')
      fireEvent.click(bookmarksTab)
    })

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh')
      expect(refreshButton).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/user/bookmarks-with-content', {
        credentials: 'include'
      })
    })
  })

  it('displays loading state correctly', async () => {
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    )

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('displays error state when user fetch fails', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Go to Login')).toBeInTheDocument()
    })
  })
})