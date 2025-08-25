import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider } from '../../contexts/AuthContext'
import JobThoughts from '../../components/JobThoughts'

// Mock fetch
global.fetch = jest.fn()

// Test wrapper with AuthProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
)

describe('JobThoughts Component', () => {
  const mockJobId = 'test-job-1'
  const mockOnShowToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders without crashing and shows empty state', async () => {
    // Mock empty thoughts response
    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: []
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <JobThoughts jobId={mockJobId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText('No thoughts yet. Add your first thought!')).toBeInTheDocument()
    })

    // Verify fetch was called with correct endpoint
    expect(fetch).toHaveBeenCalledWith(`/api/job-thoughts?job_id=${mockJobId}`)
  })

  it('displays thoughts when they exist', async () => {
    const mockThoughts = [
      {
        id: 'thought-1',
        job_id: mockJobId,
        user_id: 'user-1',
        thought_type: 'general',
        content: 'This looks like a great opportunity!',
        rating: 4,
        is_interested: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      }
    ]

    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockThoughts
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <JobThoughts jobId={mockJobId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('This looks like a great opportunity!')).toBeInTheDocument()
    })
  })

  it('handles fetch errors gracefully', async () => {
    // Mock fetch to reject
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    await act(async () => {
      render(
        <TestWrapper>
          <JobThoughts jobId={mockJobId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    // Should show empty state when error occurs
    await waitFor(() => {
      expect(screen.getByText('No thoughts yet. Add your first thought!')).toBeInTheDocument()
    })

    // Toast function should be called with error message
    expect(mockOnShowToast).toHaveBeenCalledWith('❌ Failed to load thoughts')
  })

  it('handles invalid API response gracefully', async () => {
    // Mock invalid response
    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        error: 'Database error'
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <JobThoughts jobId={mockJobId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    // Should show empty state when API returns error
    await waitFor(() => {
      expect(screen.getByText('No thoughts yet. Add your first thought!')).toBeInTheDocument()
    })
  })
})