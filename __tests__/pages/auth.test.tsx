import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../../contexts/AuthContext'
import Auth from '../../pages/auth'

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

describe('Auth Page', () => {
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

  it('renders authentication page correctly', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Welcome to Job Analyzer')).toBeInTheDocument()
    })
    
    // Should show Google login option
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    
    // Should show guest option
    expect(screen.getByText('Continue as Guest')).toBeInTheDocument()
    
    // Should show description
    expect(screen.getByText('Sign in with your Gmail account to access all features')).toBeInTheDocument()
  })

  it('shows login benefits information', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('What you can do after login:')).toBeInTheDocument()
    })
    
    // Should show feature list
    expect(screen.getByText('• Bookmark jobs and research papers')).toBeInTheDocument()
    expect(screen.getByText('• Create and share resources (public/private)')).toBeInTheDocument()
    expect(screen.getByText('• Get personalized recommendations')).toBeInTheDocument()
  })

  it('has functional Google login button', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    const googleButton = await screen.findByText('Continue with Google')
    expect(googleButton).toBeInTheDocument()
    
    // Should be clickable (not disabled)
    expect(googleButton.closest('button')).not.toBeDisabled()
  })

  it('has functional guest link', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    const guestLink = await screen.findByText('Continue as Guest')
    expect(guestLink).toBeInTheDocument()
    
    // Should be a link to home page
    expect(guestLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders without console errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    await act(async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Welcome to Job Analyzer')).toBeInTheDocument()
    })
    
    // Should not have any console errors during render
    expect(consoleError).not.toHaveBeenCalled()
    
    consoleError.mockRestore()
  })
})