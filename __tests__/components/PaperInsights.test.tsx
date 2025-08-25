import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider } from '../../contexts/AuthContext'
import PaperInsights from '../../components/PaperInsights'

// Mock fetch
global.fetch = jest.fn()

// Test wrapper with AuthProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
)

describe('PaperInsights Component', () => {
  const mockPaperId = 'test-paper-1'
  const mockOnShowToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders without crashing and shows empty state', async () => {
    // Mock empty insights response
    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: []
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <PaperInsights paperId={mockPaperId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText('No insights yet. Add your first insight!')).toBeInTheDocument()
    })

    // Verify fetch was called with correct endpoint
    expect(fetch).toHaveBeenCalledWith(`/api/paper-insights?paper_id=${mockPaperId}`)
  })

  it('displays insights when they exist', async () => {
    const mockInsights = [
      {
        id: 'insight-1',
        paper_id: mockPaperId,
        user_id: 'user-1',
        insight: 'This paper introduces the Transformer architecture!',
        insight_type: 'summary',
        thought_type: 'analysis',
        rating: 5,
        relevance_to_career: 4,
        implementation_difficulty: 3,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      }
    ]

    ;(fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockInsights
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <PaperInsights paperId={mockPaperId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('This paper introduces the Transformer architecture!')).toBeInTheDocument()
    })
  })

  it('handles fetch errors gracefully', async () => {
    // Mock fetch to reject
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    await act(async () => {
      render(
        <TestWrapper>
          <PaperInsights paperId={mockPaperId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    // Should show empty state when error occurs
    await waitFor(() => {
      expect(screen.getByText('No insights yet. Add your first insight!')).toBeInTheDocument()
    })

    // Toast function should be called with error message
    expect(mockOnShowToast).toHaveBeenCalledWith('❌ Failed to load insights')
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
          <PaperInsights paperId={mockPaperId} onShowToast={mockOnShowToast} />
        </TestWrapper>
      )
    })

    // Should show empty state when API returns error
    await waitFor(() => {
      expect(screen.getByText('No insights yet. Add your first insight!')).toBeInTheDocument()
    })
  })
})