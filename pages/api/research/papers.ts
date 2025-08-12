import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import { mockPapers } from '../../../data/mock-research-data'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if Supabase is configured
  if (!supabase) {
    // Return mock data when database is not configured
    const { company } = req.query
    let filteredPapers = mockPapers
    
    if (company) {
      filteredPapers = mockPapers.filter(p => p.company.toLowerCase() === company.toString().toLowerCase())
    }
    
    return res.status(200).json({
      success: true,
      data: filteredPapers,
      total: filteredPapers.length,
      message: 'Using mock data (database not configured)'
    })
  }

  if (req.method === 'GET') {
    try {
      const { company, limit = 100, offset = 0 } = req.query

      let query = supabase
        .from('research_papers')
        .select('*')
        .order('publication_date', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1)

      if (company) {
        query = query.eq('company', company)
      }

      const { data, error } = await query

      if (error) throw error

      res.status(200).json({
        success: true,
        data: data || [],
        total: data?.length || 0
      })
    } catch (error) {
      console.error('Error fetching papers:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch papers'
      })
    }
  } else if (req.method === 'POST') {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      })
    }
    
    try {
      const { title, authors, publication_date, abstract, url, arxiv_id, github_url, company, tags } = req.body

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        })
      }

      const { data, error } = await supabase
        .from('research_papers')
        .insert([{
          title,
          authors: authors || [],
          publication_date,
          abstract,
          url,
          arxiv_id,
          github_url,
          company,
          tags: tags || []
        }])
        .select()
        .single()

      if (error) throw error

      res.status(201).json({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error creating paper:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create paper'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Paper ID is required'
        })
      }

      if (!supabase) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured'
        })
      }

      const { error } = await supabase
        .from('research_papers')
        .delete()
        .eq('id', id)

      if (error) throw error

      res.status(200).json({
        success: true,
        message: 'Paper deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting paper:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete paper'
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}