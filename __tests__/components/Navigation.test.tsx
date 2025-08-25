import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import Navigation from '../../components/Navigation'
import { AuthProvider } from '../../contexts/AuthContext'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

// Mock AuthContext
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  isVerified: true
}

const mockAuthContext = {
  user: null,
  loading: false,
  isAuthenticated: false,
  login: jest.fn(),
  register: jest.fn(),
  loginWithGoogle: jest.fn(),
  logout: jest.fn(),
  checkAuth: jest.fn()
}

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('Navigation Component', () => {
  const mockRouter = {
    push: mockPush,
    pathname: '/',
    query: {},
    asPath: '/'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders navigation links correctly', () => {
    render(<Navigation />)

    expect(screen.getByText('Job Analyzer')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Jobs')).toBeInTheDocument()
    expect(screen.getByText('Research')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Guide')).toBeInTheDocument()
  })

  it('highlights active page based on router pathname', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      ...mockRouter,
      pathname: '/jobs'
    })

    render(<Navigation />)

    const jobsLink = screen.getByText('Jobs')
    expect(jobsLink).toHaveClass('border-blue-500', 'text-gray-900')
  })

  it('contains correct navigation links', () => {
    render(<Navigation />)

    const jobsLink = screen.getByText('Jobs').closest('a')
    const researchLink = screen.getByText('Research').closest('a')
    const resourcesLink = screen.getByText('Resources').closest('a')
    const projectsLink = screen.getByText('Projects').closest('a')

    expect(jobsLink).toHaveAttribute('href', '/jobs')
    expect(researchLink).toHaveAttribute('href', '/research')
    expect(resourcesLink).toHaveAttribute('href', '/resources')
    expect(projectsLink).toHaveAttribute('href', '/projects')
  })

  it('displays guest mode and login when not authenticated', () => {
    render(<Navigation />)

    expect(screen.getByText('Guest Mode')).toBeInTheDocument()
    expect(screen.getByText('Gmail Login')).toBeInTheDocument()
  })

  it('displays user menu when authenticated', () => {
    // Mock authenticated state
    mockAuthContext.user = mockUser
    mockAuthContext.isAuthenticated = true

    render(<Navigation />)

    // Should show user info instead of guest mode
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.queryByText('Guest Mode')).not.toBeInTheDocument()
    expect(screen.queryByText('Gmail Login')).not.toBeInTheDocument()

    // Reset for other tests
    mockAuthContext.user = null
    mockAuthContext.isAuthenticated = false
  })

  it('handles logout correctly', async () => {
    // Mock authenticated state
    mockAuthContext.user = mockUser
    mockAuthContext.isAuthenticated = true

    render(<Navigation />)

    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)

    expect(mockAuthContext.logout).toHaveBeenCalled()

    // Reset for other tests
    mockAuthContext.user = null
    mockAuthContext.isAuthenticated = false
  })

  it('displays loading state', () => {
    mockAuthContext.loading = true

    render(<Navigation />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Reset for other tests
    mockAuthContext.loading = false
  })

  it('shows recommendations link when authenticated', () => {
    mockAuthContext.user = mockUser
    mockAuthContext.isAuthenticated = true

    render(<Navigation />)

    expect(screen.getByText('Recommendations')).toBeInTheDocument()

    // Reset for other tests
    mockAuthContext.user = null
    mockAuthContext.isAuthenticated = false
  })

  it('hides recommendations link when not authenticated', () => {
    render(<Navigation />)

    expect(screen.queryByText('Recommendations')).not.toBeInTheDocument()
  })

  it('displays correct user information when authenticated', () => {
    const customUser = {
      ...mockUser,
      displayName: 'Custom User',
      username: 'customuser'
    }
    mockAuthContext.user = customUser
    mockAuthContext.isAuthenticated = true

    render(<Navigation />)

    expect(screen.getByText('Custom User')).toBeInTheDocument()
    
    // Reset for other tests
    mockAuthContext.user = null
    mockAuthContext.isAuthenticated = false
  })

  it('shows username when displayName is not available', () => {
    const userWithoutDisplayName = {
      ...mockUser,
      displayName: '',
      username: 'fallbackuser'
    }
    mockAuthContext.user = userWithoutDisplayName
    mockAuthContext.isAuthenticated = true

    render(<Navigation />)

    expect(screen.getByText('fallbackuser')).toBeInTheDocument()
    
    // Reset for other tests
    mockAuthContext.user = null
    mockAuthContext.isAuthenticated = false
  })
})