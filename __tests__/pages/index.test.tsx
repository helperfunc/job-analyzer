import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/router'
import Home from '../../pages/index'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe('Home Page', () => {
  const mockRouter = {
    push: mockPush,
    replace: mockReplace,
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(fetch as jest.Mock).mockClear()
    localStorage.clear()
    
    // Default mock for all fetch calls
    ;(fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          summary: {
            total_jobs: 0,
            highest_paying_jobs: [],
            most_common_skills: []
          }
        })
      })
    )
  })

  it('renders the main heading and description', async () => {
    await act(async () => {
      render(<Home />)
    })

    expect(screen.getByText('AI Company Job Analyzer')).toBeInTheDocument()
    expect(screen.getByText(/Quickly analyze all positions at AI companies/)).toBeInTheDocument()
  })

  it('renders URL input field', async () => {
    await act(async () => {
      render(<Home />)
    })

    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    expect(urlInput).toBeInTheDocument()
    expect(urlInput).toHaveAttribute('type', 'url')
  })

  it('renders company selection buttons', async () => {
    await act(async () => {
      render(<Home />)
    })

    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByText('DeepMind')).toBeInTheDocument()
  })

  it('updates URL when company button is clicked', async () => {
    await act(async () => {
      render(<Home />)
    })

    const openaiButton = screen.getByText('OpenAI')
    fireEvent.click(openaiButton)

    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    expect(urlInput).toHaveValue('https://openai.com/careers/search/')
  })

  it('updates URL for DeepMind button', async () => {
    await act(async () => {
      render(<Home />)
    })

    const deepmindButton = screen.getByText('DeepMind')
    fireEvent.click(deepmindButton)

    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    expect(urlInput).toHaveValue('https://job-boards.greenhouse.io/deepmind')
  })

  it('renders scraping button initially enabled', async () => {
    await act(async () => {
      render(<Home />)
    })

    const scrapeButton = screen.getByText('Quick Job Analysis')
    expect(scrapeButton).toBeInTheDocument()
    expect(scrapeButton).not.toBeDisabled()
  })

  it('disables scraping button when no URL is provided', async () => {
    await act(async () => {
      render(<Home />)
    })

    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    fireEvent.change(urlInput, { target: { value: '' } })

    const scrapeButton = screen.getByText('Quick Job Analysis')
    expect(scrapeButton).toBeDisabled()
  })

  it('initiates scraping when button is clicked', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        status: 'started'
      })
    })

    await act(async () => {
      render(<Home />)
    })

    // Set a URL first
    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    fireEvent.change(urlInput, { target: { value: 'https://openai.com/careers' } })

    const scrapeButton = screen.getByText('Quick Job Analysis')
    fireEvent.click(scrapeButton)

    expect(scrapeButton).toHaveTextContent('Analyzing...')
    expect(scrapeButton).toBeDisabled()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/scrape-with-puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://openai.com/careers' })
      })
    })
  })

  it('shows reset button during scraping', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        status: 'started'
      })
    })

    await act(async () => {
      render(<Home />)
    })

    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    fireEvent.change(urlInput, { target: { value: 'https://openai.com/careers' } })

    const scrapeButton = screen.getByText('Quick Job Analysis')
    fireEvent.click(scrapeButton)

    await waitFor(() => {
      expect(screen.getByText('🔧 Reset')).toBeInTheDocument()
    })
  })

  it('shows reset button functionality', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, status: 'started' })
    })

    await act(async () => {
      render(<Home />)
    })

    // Start scraping
    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    await act(async () => {
      fireEvent.change(urlInput, { target: { value: 'https://deepmind.com/careers' } })
    })

    const scrapeButton = screen.getByText('Quick Job Analysis')
    await act(async () => {
      fireEvent.click(scrapeButton)
    })

    await waitFor(() => {
      expect(screen.getByText('🔧 Reset')).toBeInTheDocument()
    })

    // Click reset
    const resetButton = screen.getByText('🔧 Reset')
    await act(async () => {
      fireEvent.click(resetButton)
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/scraping-status?company=deepmind', {
        method: 'DELETE'
      })
    })
  })

  it('displays basic results layout', async () => {
    const mockResults = {
      success: true,
      company: 'OpenAI',
      summary: {
        total_jobs: 25,
        jobs_with_salary: 20,
        highest_paying_jobs: [
          {
            title: 'Senior Software Engineer',
            salary: '$200K - $300K',
            location: 'San Francisco',
            skills: ['Python', 'JavaScript', 'React', 'Node.js']
          }
        ],
        most_common_skills: [
          { skill: 'Python', count: 15 },
          { skill: 'Machine Learning', count: 12 }
        ]
      }
    }

    localStorage.setItem('openai-jobs-analysis-result', JSON.stringify(mockResults))

    await act(async () => {
      render(<Home />)
    })

    // Results should be displayed from cache
    expect(screen.getByText('25')).toBeInTheDocument() // total jobs
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    expect(screen.getAllByText('Python')).toHaveLength(2) // Should appear in both job skills and common skills
  })

  it('loads cached data from localStorage on mount', async () => {
    const cachedData = {
      company: 'OpenAI',
      summary: {
        total_jobs: 10,
        highest_paying_jobs: [],
        most_common_skills: []
      }
    }

    localStorage.setItem('openai-jobs-analysis-result', JSON.stringify(cachedData))

    await act(async () => {
      render(<Home />)
    })

    // Should display cached data
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('handles scraping errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      render(<Home />)
    })

    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    await act(async () => {
      fireEvent.change(urlInput, { target: { value: 'https://openai.com/careers' } })
    })

    const scrapeButton = screen.getByText('Quick Job Analysis')
    await act(async () => {
      fireEvent.click(scrapeButton)
    })

    // Check that error handling doesn't crash the app
    await waitFor(() => {
      expect(scrapeButton).toBeInTheDocument()
    })
  })

  it('shows navigation buttons when results are available', async () => {
    const mockResults = {
      success: true,
      company: 'OpenAI',
      summary: {
        total_jobs: 10,
        highest_paying_jobs: [],
        most_common_skills: []
      }
    }

    localStorage.setItem('openai-jobs-analysis-result', JSON.stringify(mockResults))

    await act(async () => {
      render(<Home />)
    })

    await waitFor(() => {
      expect(screen.getByText('📋 Jobs')).toBeInTheDocument()
      expect(screen.getByText('🔬 Research')).toBeInTheDocument()
      expect(screen.getByText('📚 Resources')).toBeInTheDocument()
    })
  })

  it('navigates to jobs page when Jobs button is clicked', async () => {
    const mockResults = {
      success: true,
      summary: { total_jobs: 10, highest_paying_jobs: [], most_common_skills: [] }
    }
    
    localStorage.setItem('openai-jobs-analysis-result', JSON.stringify(mockResults))

    await act(async () => {
      render(<Home />)
    })

    const jobsButton = screen.getByText('📋 Jobs')
    fireEvent.click(jobsButton)

    expect(mockPush).toHaveBeenCalledWith('/jobs')
  })

  it('clears all data when Clear All Data button is clicked', async () => {
    window.confirm = jest.fn(() => true)
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'All data cleared' })
    })

    const mockResults = {
      success: true,
      summary: { total_jobs: 10, highest_paying_jobs: [], most_common_skills: [] }
    }
    localStorage.setItem('openai-jobs-analysis-result', JSON.stringify(mockResults))

    await act(async () => {
      render(<Home />)
    })

    const clearButton = screen.getByText('🗑️ Clear All Data')
    fireEvent.click(clearButton)

    expect(window.confirm).toHaveBeenCalled()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/jobs/clear-all', {
        method: 'DELETE'
      })
    })
  })

  it('handles manual URL input', () => {
    render(<Home />)

    const urlInput = screen.getByPlaceholderText(/Enter company careers page URL/)
    fireEvent.change(urlInput, { target: { value: 'https://custom-company.com/careers' } })

    expect(urlInput).toHaveValue('https://custom-company.com/careers')
  })
})