import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

// Mock data for when database is not available
const mockPapers = [
  {
    id: '1',
    title: 'Attention Is All You Need',
    authors: ['Vaswani', 'Shazeer', 'Parmar'],
    publication_date: '2017-06-12',
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
    url: 'https://arxiv.org/abs/1706.03762',
    arxiv_id: '1706.03762',
    company: 'Google',
    tags: ['transformer', 'attention', 'nlp']
  },
  {
    id: '2',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    authors: ['Devlin', 'Chang', 'Lee', 'Toutanova'],
    publication_date: '2018-10-11',
    abstract: 'We introduce a new language representation model called BERT...',
    url: 'https://arxiv.org/abs/1810.04805',
    arxiv_id: '1810.04805',
    company: 'Google',
    tags: ['bert', 'nlp', 'pre-training']
  },
  {
    id: '3',
    title: 'GPT-3: Language Models are Few-Shot Learners',
    authors: ['Brown', 'Mann', 'Ryder'],
    publication_date: '2020-05-28',
    abstract: 'Recent work has demonstrated substantial gains on many NLP tasks...',
    url: 'https://arxiv.org/abs/2005.14165',
    arxiv_id: '2005.14165',
    company: 'OpenAI',
    tags: ['gpt', 'language-model', 'few-shot']
  }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { company, limit = 100 } = req.query
      
      // Try to fetch from database first
      if (supabase) {
        try {
          console.log(`Papers-simple: Fetching papers (limit=${limit}, company=${company})`)
          
          // Start with a basic query
          let query = supabase.from('research_papers').select('*')
          
          // Add company filter if specified
          if (company && company !== 'all') {
            query = query.eq('company', company)
          }
          
          // Add limit
          query = query.limit(Number(limit))
          
          // Execute query
          const { data, error } = await query
          
          if (error) {
            console.error('Papers-simple query error:', error)
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            })
            throw error
          }
          
          if (data) {
            console.log(`Papers-simple: Successfully fetched ${data.length} papers`)
            return res.status(200).json({
              success: true,
              data: data,
              total: data.length
            })
          }
        } catch (dbError) {
          console.error('Database query failed:', dbError)
          console.log('Falling back to mock data due to database error')
        }
      }
      
      // Fallback to mock data
      let filteredPapers = mockPapers
      
      if (company && company !== 'all') {
        filteredPapers = mockPapers.filter(p => 
          p.company.toLowerCase() === company.toString().toLowerCase()
        )
      }
      
      return res.status(200).json({
        success: true,
        data: filteredPapers.slice(0, Number(limit)),
        total: filteredPapers.length,
        isUsingMockData: true
      })
      
    } catch (error) {
      console.error('Error fetching papers:', error)
      return res.status(200).json({
        success: true,
        data: mockPapers,
        total: mockPapers.length,
        isUsingMockData: true,
        error: 'Using mock data due to error'
      })
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}