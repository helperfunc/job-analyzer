import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'
import { authenticateUser, AuthenticatedRequest } from '../../../lib/auth'

interface RecommendationScore {
  id: string
  type: 'job' | 'paper' | 'resource' | 'user'
  title: string
  score: number
  reason: string[]
  data: any
}

export default authenticateUser(async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = req.user!
  const { type = 'all', limit = 10 } = req.query

  try {
    const recommendations = await generateRecommendations(user.userId, type as string, parseInt(limit as string))

    return res.status(200).json({
      success: true,
      recommendations,
      user: {
        userId: user.userId,
        username: user.username
      }
    })
  } catch (error) {
    console.error('Recommendations error:', error)
    return res.status(500).json({
      error: 'Failed to generate recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

async function generateRecommendations(
  userId: string, 
  type: string, 
  limit: number
): Promise<RecommendationScore[]> {
  const recommendations: RecommendationScore[] = []

  // 获取用户的行为数据
  const [userBookmarks, userVotes] = await Promise.all([
    getUserBookmarks(userId),
    getUserVotes(userId)
  ])

  if (type === 'all' || type === 'job') {
    const jobRecs = await generateJobRecommendations(userId, userBookmarks, userVotes)
    recommendations.push(...jobRecs)
  }

  if (type === 'all' || type === 'paper') {
    const paperRecs = await generatePaperRecommendations(userId, userBookmarks, userVotes)
    recommendations.push(...paperRecs)
  }

  if (type === 'all' || type === 'resource') {
    const resourceRecs = await generateResourceRecommendations(userId, userBookmarks, userVotes)
    recommendations.push(...resourceRecs)
  }

  if (type === 'all' || type === 'user') {
    const userRecs = await generateUserRecommendations(userId, userBookmarks, userVotes)
    recommendations.push(...userRecs)
  }

  // 按分数排序并限制数量
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

async function getUserBookmarks(userId: string) {
  const { data: bookmarks } = await supabase
    .from('user_bookmarks')
    .select(`
      bookmark_type,
      job_id,
      paper_id,
      resource_id,
      jobs:job_id (company, title, skills),
      research_papers:paper_id (company, title, tags)
    `)
    .eq('user_id', userId)

  return bookmarks || []
}

async function getUserVotes(userId: string) {
  const { data: votes } = await supabase
    .from('votes')
    .select(`
      target_type,
      vote_type,
      job_id,
      paper_id,
      resource_id,
      jobs:job_id (company, title, skills),
      research_papers:paper_id (company, title, tags)
    `)
    .eq('user_id', userId)
    .eq('vote_type', 1) // 只考虑点赞的内容

  return votes || []
}

async function generateJobRecommendations(
  userId: string,
  userBookmarks: any[],
  userVotes: any[]
): Promise<RecommendationScore[]> {
  const recommendations: RecommendationScore[] = []

  // 获取用户感兴趣的公司和技能
  const interestedCompanies = new Set<string>()
  const interestedSkills = new Set<string>()

  // Process bookmarks
  userBookmarks.forEach(item => {
    if (item.jobs) {
      if (item.jobs.company) interestedCompanies.add(item.jobs.company.toLowerCase())
      if (item.jobs.skills) {
        item.jobs.skills.forEach((skill: string) => interestedSkills.add(skill.toLowerCase()))
      }
    }
  })
  
  // Process votes
  userVotes.forEach(item => {
    if (item.jobs) {
      if (item.jobs.company) interestedCompanies.add(item.jobs.company.toLowerCase())
      if (item.jobs.skills) {
        item.jobs.skills.forEach((skill: string) => interestedSkills.add(skill.toLowerCase()))
      }
    }
  })

  // 获取已收藏/投票的工作ID
  const interactedJobIds = new Set([
    ...userBookmarks.filter(b => b.job_id).map(b => b.job_id),
    ...userVotes.filter(v => v.job_id).map(v => v.job_id)
  ])

  // 查找相似工作
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .not('id', 'in', `(${Array.from(interactedJobIds).join(',')})`)
    .limit(50)

  jobs?.forEach(job => {
    let score = 0
    const reasons: string[] = []

    // 基于公司匹配
    if (interestedCompanies.has(job.company.toLowerCase())) {
      score += 30
      reasons.push(`You've shown interest in ${job.company} positions`)
    }

    // 基于技能匹配
    if (job.skills) {
      const matchedSkills = job.skills.filter((skill: string) => 
        interestedSkills.has(skill.toLowerCase())
      )
      if (matchedSkills.length > 0) {
        score += matchedSkills.length * 10
        reasons.push(`Matching skills: ${matchedSkills.join(', ')}`)
      }
    }

    // 基于薪资范围（倾向推荐高薪职位）
    if (job.salary_max && job.salary_max > 200000) {
      score += 5
      reasons.push('High salary position')
    }

    if (score > 0) {
      recommendations.push({
        id: job.id,
        type: 'job',
        title: job.title,
        score,
        reason: reasons,
        data: job
      })
    }
  })

  return recommendations
}

async function generatePaperRecommendations(
  userId: string,
  userBookmarks: any[],
  userVotes: any[]
): Promise<RecommendationScore[]> {
  const recommendations: RecommendationScore[] = []

  // 获取用户感兴趣的公司和标签
  const interestedCompanies = new Set<string>()
  const interestedTags = new Set<string>()

  // Process bookmarks
  userBookmarks.forEach(item => {
    if (item.research_papers) {
      if (item.research_papers.company) interestedCompanies.add(item.research_papers.company.toLowerCase())
      if (item.research_papers.tags) {
        item.research_papers.tags.forEach((tag: string) => interestedTags.add(tag.toLowerCase()))
      }
    }
    if (item.jobs && item.jobs.company) {
      interestedCompanies.add(item.jobs.company.toLowerCase())
    }
  })
  
  // Process votes
  userVotes.forEach(item => {
    if (item.research_papers) {
      if (item.research_papers.company) interestedCompanies.add(item.research_papers.company.toLowerCase())
      if (item.research_papers.tags) {
        item.research_papers.tags.forEach((tag: string) => interestedTags.add(tag.toLowerCase()))
      }
    }
    if (item.jobs && item.jobs.company) {
      interestedCompanies.add(item.jobs.company.toLowerCase())
    }
  })

  // 获取已收藏/投票的论文ID
  const interactedPaperIds = new Set([
    ...userBookmarks.filter(b => b.paper_id).map(b => b.paper_id),
    ...userVotes.filter(v => v.paper_id).map(v => v.paper_id)
  ])

  // 查找相似论文
  const { data: papers } = await supabase
    .from('research_papers')
    .select('*')
    .not('id', 'in', `(${Array.from(interactedPaperIds).join(',')})`)
    .limit(50)

  papers?.forEach(paper => {
    let score = 0
    const reasons: string[] = []

    // 基于公司匹配
    if (interestedCompanies.has(paper.company.toLowerCase())) {
      score += 25
      reasons.push(`Research from ${paper.company}`)
    }

    // 基于标签匹配
    if (paper.tags) {
      const matchedTags = paper.tags.filter((tag: string) => 
        interestedTags.has(tag.toLowerCase())
      )
      if (matchedTags.length > 0) {
        score += matchedTags.length * 8
        reasons.push(`Related topics: ${matchedTags.join(', ')}`)
      }
    }

    // 最新论文加分
    const publicationDate = new Date(paper.publication_date)
    const daysAgo = (Date.now() - publicationDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo < 30) {
      score += 5
      reasons.push('Recent research')
    }

    if (score > 0) {
      recommendations.push({
        id: paper.id,
        type: 'paper',
        title: paper.title,
        score,
        reason: reasons,
        data: paper
      })
    }
  })

  return recommendations
}

async function generateResourceRecommendations(
  userId: string,
  userBookmarks: any[],
  userVotes: any[]
): Promise<RecommendationScore[]> {
  // 基于用户资源的简单推荐
  // 可以扩展为基于用户兴趣的资源推荐
  return []
}

async function generateUserRecommendations(
  userId: string,
  userBookmarks: any[],
  userVotes: any[]
): Promise<RecommendationScore[]> {
  const recommendations: RecommendationScore[] = []

  // 找到有相似兴趣的用户
  const { data: similarUsers } = await supabase
    .from('users')
    .select(`
      id,
      username,
      display_name,
      interests,
      skills
    `)
    .neq('id', userId)
    .limit(20)

  // 简单的用户推荐逻辑
  // 可以基于共同收藏、投票等来推荐用户

  return recommendations
}