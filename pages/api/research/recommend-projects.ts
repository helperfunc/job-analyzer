import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'
import OpenAI from 'openai'

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
    
    const { skill_gap_id } = req.body

    if (!skill_gap_id) {
      return res.status(400).json({
        success: false,
        error: 'Skill gap ID is required'
      })
    }

    // Get skill gap analysis
    const { data: gapData, error: gapError } = await supabase
      .from('skill_gaps')
      .select('*, job:jobs(*)')
      .eq('id', skill_gap_id)
      .single()

    if (gapError || !gapData) {
      throw new Error('Skill gap analysis not found')
    }

    const missingSkills = gapData.gap_analysis?.missing_skills || []
    const prioritySkills = gapData.gap_analysis?.priority_skills || []

    // Use OpenAI to generate project recommendations
    const prompt = `
    Based on the following skill gaps, recommend specific projects that can help build these skills.
    
    Job Title: ${gapData.job?.title}
    Missing Skills: ${JSON.stringify(missingSkills)}
    Priority Skills: ${JSON.stringify(prioritySkills)}
    
    Generate 3-5 project recommendations. For each project, provide:
    1. project_name: A descriptive name
    2. description: What the project does and why it's relevant
    3. difficulty: beginner/intermediate/advanced
    4. estimated_time: How long it might take
    5. skills_covered: Which missing skills this project addresses
    6. implementation_guide: Step-by-step guide to build it
    7. resources: Links to tutorials, libraries, or examples
    
    Focus on practical, portfolio-worthy projects that directly address the skill gaps.
    `

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a technical mentor recommending projects to help developers build missing skills. Focus on practical, implementable projects.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    })

    const recommendations = JSON.parse(completion.choices[0].message.content || '{}')
    const projects = recommendations.projects || []

    // Save project recommendations
    const projectInserts = projects.map((project: any) => ({
      skill_gap_id,
      project_name: project.project_name,
      description: project.description,
      difficulty: project.difficulty,
      estimated_time: project.estimated_time,
      resources: project.resources || [],
      implementation_guide: project.implementation_guide
    }))

    const { data, error } = await supabase
      .from('project_recommendations')
      .insert(projectInserts)
      .select()

    if (error) throw error

    res.status(200).json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error generating project recommendations:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate project recommendations'
    })
  }
}