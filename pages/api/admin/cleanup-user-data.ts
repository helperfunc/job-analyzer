import { NextApiRequest, NextApiResponse } from 'next'
import { loadDemoBookmarks, saveDemoBookmarks, loadDemoVotes, saveDemoVotes } from '../../../lib/demoStorage'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Load current data
    const bookmarks = loadDemoBookmarks()
    const votes = loadDemoVotes()

    // Group by email to consolidate user data
    const userDataMap = new Map()

    // Process bookmarks
    bookmarks.forEach(bookmark => {
      const userId = bookmark.user_id
      
      // Try to extract email from various user ID formats
      let email = null
      if (userId.includes('@')) {
        email = userId
      } else if (userId.startsWith('google-')) {
        // This is a Google ID, we can't extract email directly
        // Keep as is for now
        email = userId
      } else {
        // Try to decode base64 encoded emails
        try {
          const decoded = atob(userId)
          if (decoded.includes('@')) {
            email = decoded
          }
        } catch (e) {
          // Not base64 encoded
        }
      }

      if (!email) {
        email = userId // fallback to userId
      }

      if (!userDataMap.has(email)) {
        userDataMap.set(email, {
          bookmarks: [],
          votes: [],
          userIds: new Set()
        })
      }

      userDataMap.get(email).bookmarks.push(bookmark)
      userDataMap.get(email).userIds.add(userId)
    })

    // Process votes
    votes.forEach(vote => {
      const userId = vote.user_id
      
      let email = null
      if (userId.includes('@')) {
        email = userId
      } else if (userId.startsWith('google-')) {
        email = userId
      } else {
        try {
          const decoded = atob(userId)
          if (decoded.includes('@')) {
            email = decoded
          }
        } catch (e) {
          // Not base64 encoded
        }
      }

      if (!email) {
        email = userId
      }

      if (!userDataMap.has(email)) {
        userDataMap.set(email, {
          bookmarks: [],
          votes: [],
          userIds: new Set()
        })
      }

      userDataMap.get(email).votes.push(vote)
      userDataMap.get(email).userIds.add(userId)
    })

    // Generate cleanup report
    const report = {
      totalUsers: userDataMap.size,
      userSummary: Array.from(userDataMap.entries()).map(([email, data]) => ({
        email: email,
        userIds: Array.from(data.userIds),
        bookmarkCount: data.bookmarks.length,
        voteCount: data.votes.length
      }))
    }

    return res.status(200).json({
      success: true,
      message: 'User data analysis complete',
      report: report
    })

  } catch (error) {
    console.error('Error analyzing user data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze user data'
    })
  }
}