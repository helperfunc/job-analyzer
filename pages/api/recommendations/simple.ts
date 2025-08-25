import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { loadDemoBookmarks } from '../../../lib/demoStorage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface RecommendationScore {
  id: string
  type: 'job' | 'paper' | 'resource' | 'user'
  title: string
  score: number
  reason: string[]
  data: any
}

// Mock recommendations for demo mode
const mockRecommendations: RecommendationScore[] = [
  {
    id: '1',
    type: 'job',
    title: 'Senior Machine Learning Engineer',
    score: 85,
    reason: ['Based on your interest in AI positions', 'High salary range'],
    data: {
      company: 'OpenAI',
      location: 'San Francisco, CA',
      salary: '$250,000 - $400,000'
    }
  },
  {
    id: '2',
    type: 'paper',
    title: 'GPT-4 Technical Report',
    score: 80,
    reason: ['Related to your bookmarked papers', 'From OpenAI'],
    data: {
      company: 'OpenAI',
      publication_date: '2023-03-27',
      tags: ['gpt-4', 'language-model', 'ai']
    }
  },
  {
    id: '3',
    type: 'job',
    title: 'Research Scientist',
    score: 75,
    reason: ['Similar to your bookmarked positions', 'Research focus'],
    data: {
      company: 'DeepMind',
      location: 'London, UK',
      salary: '£120,000 - £180,000'
    }
  },
  {
    id: '4',
    type: 'resource',
    title: 'Deep Learning Interview Preparation Guide',
    score: 70,
    reason: ['Popular among similar users', 'Highly rated'],
    data: {
      resource_type: 'preparation',
      description: 'Comprehensive guide for ML/DL interviews'
    }
  },
  {
    id: '5',
    type: 'paper',
    title: 'Constitutional AI: Harmlessness from AI Feedback',
    score: 65,
    reason: ['From Anthropic', 'AI safety focus'],
    data: {
      company: 'Anthropic',
      publication_date: '2022-12-15',
      tags: ['ai-safety', 'constitutional-ai', 'rlhf']
    }
  },
  {
    id: '6',
    type: 'job',
    title: 'AI Safety Researcher',
    score: 60,
    reason: ['Emerging field', 'High impact role'],
    data: {
      company: 'Anthropic',
      location: 'Remote',
      salary: '$200,000 - $350,000'
    }
  }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get token from cookie or Authorization header
  let token = req.cookies.token
  
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  // If no token, return empty recommendations
  if (!token) {
    return res.status(200).json({
      success: true,
      recommendations: [],
      message: 'Please login to see personalized recommendations'
    })
  }

  // Try to verify token and get user info
  let userId = 'demo-user'
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.userId || 'demo-user'
  } catch (error) {
    // Token is invalid, but we'll still return some generic recommendations
    console.log('Token verification failed, returning generic recommendations')
  }

  const { type = 'all', limit = 10 } = req.query

  // Get user's bookmarks to create personalized recommendations
  const bookmarks = loadDemoBookmarks()
  const userBookmarks = bookmarks.filter(b => b.user_id === userId)
  
  // Create recommendations based on bookmarks
  let personalizedRecommendations: RecommendationScore[] = []
  
  if (userBookmarks.length > 0) {
    // Add recommendations based on bookmarked content
    userBookmarks.forEach((bookmark, index) => {
      if (bookmark.bookmark_type === 'job' && bookmark.job) {
        personalizedRecommendations.push({
          id: `bookmark_job_${bookmark.id}`,
          type: 'job',
          title: `Similar to: ${bookmark.job.title}`,
          score: 90 - index * 5,
          reason: ['Based on your bookmarked job', `Similar to ${bookmark.job.company} position`],
          data: {
            company: bookmark.job.company,
            location: bookmark.job.location,
            salary: bookmark.job.salary,
            isBookmarked: true
          }
        })
      } else if (bookmark.bookmark_type === 'paper' && bookmark.paper) {
        personalizedRecommendations.push({
          id: `bookmark_paper_${bookmark.id}`,
          type: 'paper',
          title: `Related to: ${bookmark.paper.title}`,
          score: 85 - index * 5,
          reason: ['Based on your bookmarked paper', `Similar research from ${bookmark.paper.company}`],
          data: {
            company: bookmark.paper.company,
            publication_date: bookmark.paper.publication_date,
            tags: bookmark.paper.tags,
            isBookmarked: true
          }
        })
      } else if (bookmark.bookmark_type === 'resource' && bookmark.resource) {
        personalizedRecommendations.push({
          id: `bookmark_resource_${bookmark.id}`,
          type: 'resource',
          title: `Similar to: ${bookmark.resource.title}`,
          score: 80 - index * 5,
          reason: ['Based on your bookmarked resource', 'Similar learning material'],
          data: {
            resource_type: bookmark.resource.resource_type,
            description: bookmark.resource.description,
            tags: bookmark.resource.tags,
            isBookmarked: true
          }
        })
      }
    })
  }
  
  // Combine personalized and mock recommendations
  let allRecommendations = [...personalizedRecommendations, ...mockRecommendations]
  
  // Filter recommendations by type
  let filteredRecommendations = allRecommendations
  
  if (type !== 'all') {
    filteredRecommendations = allRecommendations.filter(rec => rec.type === type)
  }

  // Sort by score and limit the results
  const limitedRecommendations = filteredRecommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(limit))

  return res.status(200).json({
    success: true,
    recommendations: limitedRecommendations,
    total: limitedRecommendations.length,
    hasPersonalizedContent: userBookmarks.length > 0,
    isUsingMockData: personalizedRecommendations.length === 0
  })
}