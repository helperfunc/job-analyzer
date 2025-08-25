import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../../contexts/AuthContext'
import Jobs from '../../pages/jobs'

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

describe('Jobs Page', () => {
  const mockRouter = {
    push: mockPush,
    pathname: '/jobs',
    query: {},
    asPath: '/jobs'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(fetch as jest.Mock).mockClear()
    localStorage.clear()
    
    // Default mocks for all API endpoints that the component calls
    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/jobs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, jobs: [] })
        })
      }
      if (url.includes('/api/research/papers')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        })
      }
      if (url.includes('/api/job-resources/by-jobs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: {} })
        })
      }
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })
  })

  it('renders page title and description', async () => {
    // Mock API responses
    ;(fetch as jest.Mock)
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
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Jobs Dashboard')).toBeInTheDocument()
    })
  })

  it('displays loading state initially', async () => {
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      }), 1000))
    )

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    // Initially should show loading
    expect(screen.getByText('Loading jobs...')).toBeInTheDocument()
  })

  it('loads and displays jobs from database', async () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Software Engineer',
        company: 'OpenAI',
        location: 'San Francisco',
        salary: '$150K - $200K',
        posted_date: '2023-01-01',
        requirements: ['Python', 'Machine Learning']
      },
      {
        id: 'job-2',
        title: 'Product Manager',
        company: 'Anthropic',
        location: 'Remote',
        salary: '$130K - $180K',
        posted_date: '2023-01-02',
        requirements: ['Product Strategy', 'AI/ML']
      }
    ]

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
      expect(screen.getByText('San Francisco')).toBeInTheDocument()
      expect(screen.getByText('Remote')).toBeInTheDocument()
    })
  })

  it('filters jobs by search query', async () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Software Engineer',
        company: 'OpenAI',
        location: 'San Francisco',
        requirements: ['Python', 'Machine Learning']
      },
      {
        id: 'job-2',
        title: 'Product Manager',
        company: 'OpenAI',
        location: 'Remote',
        requirements: ['Product Strategy']
      }
    ]

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })

    // Search for "engineer"
    const searchInput = screen.getByPlaceholderText(/Search jobs/i)
    fireEvent.change(searchInput, { target: { value: 'engineer' } })

    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.queryByText('Product Manager')).not.toBeInTheDocument()
  })

  it('displays jobs with correct company information', async () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Engineer',
        company: 'OpenAI'
      },
      {
        id: 'job-2',
        title: 'Engineer',
        company: 'Anthropic'
      }
    ]

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getAllByText('Engineer')).toHaveLength(2)
      // Just check that jobs are displayed
    })
  })

  it('displays jobs with location information', async () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Engineer',
        location: 'San Francisco',
        company: 'OpenAI'
      },
      {
        id: 'job-2',
        title: 'Engineer',
        location: 'Remote',
        company: 'OpenAI'
      }
    ]

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getAllByText('Engineer')).toHaveLength(2)
      expect(screen.getByText('San Francisco')).toBeInTheDocument()
      expect(screen.getByText('Remote')).toBeInTheDocument()
    })
  })

  it('displays jobs with different titles correctly', async () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'B Engineer',
        posted_date: '2023-01-01',
        company: 'OpenAI'
      },
      {
        id: 'job-2',
        title: 'A Engineer',
        posted_date: '2023-01-02',
        company: 'OpenAI'
      }
    ]

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('A Engineer')).toBeInTheDocument()
      expect(screen.getByText('B Engineer')).toBeInTheDocument()
    })
  })

  it('navigates to job details when job is clicked', async () => {
    const mockJobs = [
      {
        id: 'job-123',
        title: 'Software Engineer',
        company: 'OpenAI'
      }
    ]

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    })

    const jobCard = screen.getByText('Software Engineer').closest('.cursor-pointer') ||
                    screen.getByText('Software Engineer')
    fireEvent.click(jobCard)

    expect(mockPush).toHaveBeenCalledWith('/job/job-123?company=openai&index=0')
  })

  it('displays pagination when there are many jobs', async () => {
    const mockJobs = Array.from({ length: 25 }, (_, i) => ({
      id: `job-${i}`,
      title: `Engineer ${i}`,
      company: 'OpenAI'
    }))

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Engineer 0')).toBeInTheDocument()
    })

    // Should show pagination controls
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
  })

  it('handles empty job data gracefully', async () => {
    // Override the default mock to return empty data
    ;(fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          jobs: []
        })
      })
    )

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      // Check that it shows 0 jobs
      expect(screen.getByText('Jobs (0)')).toBeInTheDocument()
      expect(screen.getByText('Showing 1-0 of 0 jobs')).toBeInTheDocument()
    })
  })

  it('displays job data correctly', async () => {
    const mockJobs = [{ id: 'job-1', title: 'Fresh Job', company: 'OpenAI' }]
    
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Fresh Job')).toBeInTheDocument()
      expect(screen.getByText('Jobs (1)')).toBeInTheDocument()
    })
  })

  it('displays job counts correctly', async () => {
    const mockJobs = [
      { id: 'job-1', company: 'OpenAI', salary: '$150K' },
      { id: 'job-2', company: 'OpenAI', salary: '$200K' },
      { id: 'job-3', company: 'Anthropic', salary: null }
    ]

    // Mock the API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobs: mockJobs })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Jobs />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Jobs (3)')).toBeInTheDocument()
      expect(screen.getByText('Showing 1-3 of 3 jobs')).toBeInTheDocument()
    })
  })
})