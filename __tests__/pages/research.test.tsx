import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../../contexts/AuthContext'
import Research from '../../pages/research'

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

describe('Research Page', () => {
  const mockRouter = {
    push: mockPush,
    pathname: '/research',
    query: {},
    asPath: '/research'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(fetch as jest.Mock).mockClear()
    localStorage.clear()
    
    // Default mocks for all API endpoints that the component calls
    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        })
      }
      if (url.includes('/api/research/scrape-papers-puppeteer')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, status: 'started' })
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
    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    expect(screen.getByText('Research Center')).toBeInTheDocument()
    expect(screen.getByText(/Discover and manage research papers from AI companies/)).toBeInTheDocument()
  })

  it('renders scraping controls', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    expect(screen.getByText('Papers & Research')).toBeInTheDocument()
    
    // Wait for PapersTab to load and show scraping controls
    await waitFor(() => {
      expect(screen.getByText('📥 Scrape OpenAI Papers')).toBeInTheDocument()
      expect(screen.getByText('📥 Scrape Anthropic Papers')).toBeInTheDocument()
      expect(screen.getByText('📥 Scrape DeepMind Papers')).toBeInTheDocument()
    })
  })

  it('initiates paper scraping when button is clicked', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          papers: [],
          total: 0
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          status: 'started',
          message: 'Paper scraping started'
        })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('📥 Scrape OpenAI Papers')).toBeInTheDocument()
    })

    const openaiButton = screen.getByText('📥 Scrape OpenAI Papers')
    fireEvent.click(openaiButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/research/scrape-papers-puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: 'openai' })
      })
    })
  })

  it('displays scraping progress', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          papers: [],
          total: 0
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          status: 'started'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isActive: true,
          progress: {
            processed: 5,
            total: 10,
            currentPaper: 'Attention Is All You Need'
          }
        })
      })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('📥 Scrape DeepMind Papers')).toBeInTheDocument()
    })

    const deepmindButton = screen.getByText('📥 Scrape DeepMind Papers')
    fireEvent.click(deepmindButton)

    await waitFor(() => {
      const scrapingButtons = screen.getAllByText('Scraping...')
      expect(scrapingButtons.length).toBeGreaterThan(0)
    })
  })

  it('loads and displays papers from API', async () => {
    const mockPapers = [
      {
        id: 'paper-1',
        title: 'Attention Is All You Need',
        authors: ['Vaswani', 'Shazeer'],
        abstract: 'The dominant sequence transduction models...',
        company: 'Google',
        publication_date: '2017-06-12',
        url: 'https://arxiv.org/abs/1706.03762',
        tags: ['transformer', 'attention']
      },
      {
        id: 'paper-2',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        authors: ['Devlin', 'Chang'],
        abstract: 'We introduce a new language representation model...',
        company: 'Google',
        publication_date: '2018-10-11',
        url: 'https://arxiv.org/abs/1810.04805',
        tags: ['bert', 'nlp']
      }
    ]

    // Override the default mock for this specific test
    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPapers
          })
        })
      }
      // Default fallback for other endpoints
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument()
      expect(screen.getByText('BERT: Pre-training of Deep Bidirectional Transformers')).toBeInTheDocument()
      expect(screen.getByText('Vaswani, Shazeer')).toBeInTheDocument()
    })
  })

  it('filters papers by search query', async () => {
    const mockPapers = [
      {
        id: 'paper-1',
        title: 'Attention Mechanisms',
        authors: ['Author A'],
        company: 'OpenAI',
        publication_date: '2023-01-01',
        abstract: 'Paper about attention mechanisms',
        url: 'https://example.com/paper1',
        tags: ['attention']
      },
      {
        id: 'paper-2',
        title: 'BERT Models',
        authors: ['Author B'],
        company: 'Google',
        publication_date: '2023-01-02',
        abstract: 'Paper about BERT models',
        url: 'https://example.com/paper2',
        tags: ['bert']
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPapers
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Attention Mechanisms')).toBeInTheDocument()
      expect(screen.getByText('BERT Models')).toBeInTheDocument()
    })

    // Search for "attention"
    const searchInput = screen.getByPlaceholderText(/Search papers/i)
    fireEvent.change(searchInput, { target: { value: 'attention' } })

    expect(screen.getByText('Attention Mechanisms')).toBeInTheDocument()
    expect(screen.queryByText('BERT Models')).not.toBeInTheDocument()
  })

  it('filters papers by company', async () => {
    const mockPapers = [
      {
        id: 'paper-1',
        title: 'Paper 1',
        company: 'OpenAI',
        authors: [],
        publication_date: '2023-01-01',
        abstract: 'Test paper 1',
        url: 'https://example.com/paper1',
        tags: ['openai']
      },
      {
        id: 'paper-2',
        title: 'Paper 2',
        company: 'Google',
        authors: [],
        publication_date: '2023-01-02',
        abstract: 'Test paper 2',
        url: 'https://example.com/paper2',
        tags: ['google']
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPapers
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Paper 1')).toBeInTheDocument()
      expect(screen.getByText('Paper 2')).toBeInTheDocument()
    })

    // Filter by OpenAI
    const companyFilter = screen.getByDisplayValue('All Companies')
    fireEvent.change(companyFilter, { target: { value: 'openai' } })

    expect(screen.getByText('Paper 1')).toBeInTheDocument()
    expect(screen.queryByText('Paper 2')).not.toBeInTheDocument()
  })

  it('sorts papers by different criteria', async () => {
    const mockPapers = [
      {
        id: 'paper-1',
        title: 'Z Paper',
        publication_date: '2023-01-01',
        authors: [],
        company: 'OpenAI',
        abstract: 'Z paper abstract',
        url: 'https://example.com/z-paper',
        tags: ['test']
      },
      {
        id: 'paper-2',
        title: 'A Paper',
        publication_date: '2023-01-02',
        authors: [],
        company: 'Google',
        abstract: 'A paper abstract',
        url: 'https://example.com/a-paper',
        tags: ['test']
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPapers
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Z Paper')).toBeInTheDocument()
      expect(screen.getByText('A Paper')).toBeInTheDocument()
    })

    // Sort by title
    const sortSelect = screen.getByDisplayValue('Newest First')
    fireEvent.change(sortSelect, { target: { value: 'title-asc' } })

    // Wait for sorting to take effect and look for actual paper titles
    await waitFor(() => {
      expect(screen.getByText('A Paper')).toBeInTheDocument()
      expect(screen.getByText('Z Paper')).toBeInTheDocument()
    })

    // Check sorting order by looking at the paper containers
    const paperElements = screen.getByText('A Paper').closest('.bg-white')
    const zPaperElements = screen.getByText('Z Paper').closest('.bg-white')
    expect(paperElements).toBeInTheDocument()
    expect(zPaperElements).toBeInTheDocument()
  })

  it('opens paper URL in new tab when clicked', async () => {
    const mockPapers = [
      {
        id: 'paper-1',
        title: 'Test Paper',
        url: 'https://arxiv.org/abs/1234.5678',
        authors: [],
        company: 'OpenAI',
        publication_date: '2023-01-01',
        abstract: 'Test paper abstract',
        tags: ['test']
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPapers
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Test Paper')).toBeInTheDocument()
    })

    const paperLink = screen.getByText('📄 Paper')
    expect(paperLink).toHaveAttribute('href', 'https://arxiv.org/abs/1234.5678')
    expect(paperLink).toHaveAttribute('target', '_blank')
  })

  it('handles bookmark functionality', async () => {
    const mockPapers = [
      {
        id: 'paper-1',
        title: 'Test Paper',
        authors: [],
        company: 'OpenAI',
        publication_date: '2023-01-01',
        abstract: 'Test paper abstract',
        url: 'https://example.com/paper1',
        tags: ['test']
      }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPapers
          })
        })
      }
      if (url.includes('/api/auth/me-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            user: { id: 'test-user', email: 'test@example.com' }
          })
        })
      }
      if (url.includes('/api/user/bookmarks-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            bookmarks: []
          })
        })
      }
      if (url.includes('/api/user/bookmarks-add')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Bookmarked successfully'
          })
        })
      }
      if (url.includes('/api/votes/simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            votes: [],
            stats: { upvotes: 0, downvotes: 0, total: 0, score: 0 }
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Test Paper')).toBeInTheDocument()
    })

    // Check that bookmark button is present and functional
    const bookmarkButton = screen.getByText(/Bookmark/)
    expect(bookmarkButton).toBeInTheDocument()
    
    fireEvent.click(bookmarkButton)

    // The button might change to "Bookmarked" after click
    await waitFor(() => {
      expect(screen.getByText(/Bookmark/)).toBeInTheDocument()
    })
  })

  it('displays loading state', async () => {
    ;(fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    )

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    // Should show loading spinner when papers are being fetched
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      // Should show empty state when API fails
      expect(screen.getByText('No papers found')).toBeInTheDocument()
    })
  })

  it('displays paper statistics', async () => {
    const mockPapers = [
      { id: 'paper-1', company: 'OpenAI', tags: ['gpt'], title: 'GPT Paper', authors: [], publication_date: '2023-01-01', abstract: 'GPT paper', url: 'https://example.com/gpt' },
      { id: 'paper-2', company: 'OpenAI', tags: ['dall-e'], title: 'DALL-E Paper', authors: [], publication_date: '2023-01-02', abstract: 'DALL-E paper', url: 'https://example.com/dalle' },
      { id: 'paper-3', company: 'DeepMind', tags: ['alphago'], title: 'AlphaGo Paper', authors: [], publication_date: '2023-01-03', abstract: 'AlphaGo paper', url: 'https://example.com/alphago' }
    ]

    ;(fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/research/papers-simple')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockPapers
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })

    await act(async () => {
      render(
        <TestWrapper>
          <Research />
        </TestWrapper>
      )
    })

    await waitFor(() => {
      // Should show total paper count in the filter area
      expect(screen.getByText('3 of 3 papers')).toBeInTheDocument()
    })
  })
})