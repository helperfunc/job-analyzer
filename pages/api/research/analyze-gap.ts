import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import OpenAI from 'openai'

// Empty mock data fallback
const mockGapAnalysis = {
  job_id: '',
  user_id: 'default',
  gap_analysis: {
    missing_skills: [],
    suggestions: [],
    confidence_score: 0
  },
  projects: []
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    const { job_id, user_id, current_skills } = req.body

    if (!job_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Job ID and User ID are required'
      })
    }

    // If database is not configured, return mock analysis
    if (!supabase) {
      const mockResult = {
        ...mockGapAnalysis,
        job_id,
        user_id,
        current_skills: current_skills || [],
        gap_analysis: {
          ...mockGapAnalysis.gap_analysis,
          skill_match_percentage: current_skills ? (current_skills.length / 5) * 100 : 0
        }
      }
      
      return res.status(200).json({
        success: true,
        data: mockResult
      })
    }

    // Get job information
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError || !jobData) {
      throw new Error('Job not found')
    }

    // Use OpenAI to analyze skill gaps
    const prompt = `
    Analyze the skill gap between required skills and current skills.
    
    Job Title: ${jobData.title}
    Required Skills: ${JSON.stringify(jobData.skills)}
    Current Skills: ${JSON.stringify(current_skills)}
    
    Provide a detailed gap analysis in JSON format with:
    1. missing_skills: Array of skills the candidate is missing
    2. skill_match_percentage: Overall percentage match
    3. recommendations: Specific recommendations for each missing skill
    4. priority_skills: Top 3 skills to focus on first
    `

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a career advisor analyzing skill gaps for job applications. Provide practical, actionable advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })

    const gapAnalysis = JSON.parse(completion.choices[0].message.content || '{}')

    // Save analysis results
    const { data, error } = await supabase
      .from('skill_gaps')
      .upsert([{
        job_id,
        user_id,
        required_skills: jobData.skills || [],
        current_skills: current_skills || [],
        gap_analysis: gapAnalysis
      }], {
        onConflict: 'job_id,user_id'
      })
      .select()
      .single()

    if (error) throw error

    res.status(200).json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error analyzing skill gap:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze skill gap'
    })
  }
}