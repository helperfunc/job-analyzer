import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, AuthenticatedRequest } from '../../../lib/auth'
import { supabase } from '../../../lib/supabase'

interface BookmarkRequest {
  bookmark_type: 'job' | 'paper' | 'resource'
  job_id?: string
  paper_id?: string
  resource_id?: string
  resource_type?: 'job_resource' | 'interview_resource' | 'user_resource'
  notes?: string
  tags?: string[]
  is_favorite?: boolean
}

export default authenticateUser(async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
  const user = req.user!

  if (req.method === 'GET') {
    return await getBookmarks(req, res, user.userId)
  } else if (req.method === 'POST') {
    return await addBookmark(req, res, user.userId)
  } else if (req.method === 'DELETE') {
    return await removeBookmark(req, res, user.userId)
  } else if (req.method === 'PUT') {
    return await updateBookmark(req, res, user.userId)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
})

async function getBookmarks(
  req: AuthenticatedRequest, 
  res: NextApiResponse,
  userId: string
) {
  try {
    const { type, limit, offset } = req.query
    
    let query = supabase
      .from('user_bookmarks')
      .select(`
        id,
        bookmark_type,
        notes,
        tags,
        is_favorite,
        created_at,
        job_id,
        paper_id,
        resource_id,
        resource_type,
        jobs:job_id (
          id,
          title,
          company,
          location,
          department,
          salary,
          created_at
        ),
        research_papers:paper_id (
          id,
          title,
          authors,
          company,
          publication_date,
          abstract,
          url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (type && typeof type === 'string') {
      query = query.eq('bookmark_type', type)
    }

    if (limit && typeof limit === 'string') {
      query = query.limit(parseInt(limit))
    }

    if (offset && typeof offset === 'string') {
      query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit as string) || 20) - 1)
    }

    const { data: bookmarks, error } = await query

    if (error) {
      console.error('Error fetching bookmarks:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch bookmarks',
        details: error.message 
      })
    }

    // 获取resource详情（如果有resource bookmarks）
    const resourceBookmarks = bookmarks?.filter(b => b.bookmark_type === 'resource' && b.resource_id) || []
    
    for (const bookmark of resourceBookmarks) {
      if (bookmark.resource_type === 'job_resource') {
        const { data: resource } = await supabase
          .from('job_resources')
          .select('id, title, description, url, resource_type, created_at')
          .eq('id', bookmark.resource_id)
          .single()
        bookmark.resource_details = resource
      } else if (bookmark.resource_type === 'interview_resource') {
        const { data: resource } = await supabase
          .from('interview_resources')
          .select('id, title, content, url, resource_type, created_at')
          .eq('id', bookmark.resource_id)
          .single()
        bookmark.resource_details = resource
      } else if (bookmark.resource_type === 'user_resource') {
        const { data: resource } = await supabase
          .from('user_resources')
          .select('id, title, description, url, resource_type, visibility, created_at')
          .eq('id', bookmark.resource_id)
          .single()
        bookmark.resource_details = resource
      }
    }

    return res.status(200).json({
      success: true,
      bookmarks: bookmarks || [],
      total: bookmarks?.length || 0
    })

  } catch (error) {
    console.error('Get bookmarks error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function addBookmark(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const bookmarkData: BookmarkRequest = req.body

    if (!bookmarkData.bookmark_type) {
      return res.status(400).json({ 
        error: 'Missing bookmark type',
        details: 'bookmark_type is required'
      })
    }

    // 验证必要字段
    if (bookmarkData.bookmark_type === 'job' && !bookmarkData.job_id) {
      return res.status(400).json({ error: 'job_id is required for job bookmarks' })
    }
    if (bookmarkData.bookmark_type === 'paper' && !bookmarkData.paper_id) {
      return res.status(400).json({ error: 'paper_id is required for paper bookmarks' })
    }
    if (bookmarkData.bookmark_type === 'resource' && (!bookmarkData.resource_id || !bookmarkData.resource_type)) {
      return res.status(400).json({ error: 'resource_id and resource_type are required for resource bookmarks' })
    }

    // 检查是否已经收藏
    let existingQuery = supabase
      .from('user_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('bookmark_type', bookmarkData.bookmark_type)

    if (bookmarkData.job_id) {
      existingQuery = existingQuery.eq('job_id', bookmarkData.job_id)
    }
    if (bookmarkData.paper_id) {
      existingQuery = existingQuery.eq('paper_id', bookmarkData.paper_id)
    }
    if (bookmarkData.resource_id) {
      existingQuery = existingQuery.eq('resource_id', bookmarkData.resource_id)
    }

    const { data: existing } = await existingQuery.single()

    if (existing) {
      return res.status(409).json({ 
        error: 'Already bookmarked',
        details: 'This item is already in your bookmarks'
      })
    }

    // 创建收藏
    const { data: bookmark, error } = await supabase
      .from('user_bookmarks')
      .insert([{
        user_id: userId,
        bookmark_type: bookmarkData.bookmark_type,
        job_id: bookmarkData.job_id,
        paper_id: bookmarkData.paper_id,
        resource_id: bookmarkData.resource_id,
        resource_type: bookmarkData.resource_type,
        notes: bookmarkData.notes,
        tags: bookmarkData.tags || [],
        is_favorite: bookmarkData.is_favorite || false
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating bookmark:', error)
      return res.status(500).json({ 
        error: 'Failed to create bookmark',
        details: error.message 
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Bookmark added successfully',
      bookmark
    })

  } catch (error) {
    console.error('Add bookmark error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function updateBookmark(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { bookmark_id, notes, tags, is_favorite } = req.body

    if (!bookmark_id) {
      return res.status(400).json({ error: 'bookmark_id is required' })
    }

    const { data: bookmark, error } = await supabase
      .from('user_bookmarks')
      .update({
        notes,
        tags,
        is_favorite
      })
      .eq('id', bookmark_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating bookmark:', error)
      return res.status(500).json({ 
        error: 'Failed to update bookmark',
        details: error.message 
      })
    }

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' })
    }

    return res.status(200).json({
      success: true,
      message: 'Bookmark updated successfully',
      bookmark
    })

  } catch (error) {
    console.error('Update bookmark error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function removeBookmark(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { bookmark_id } = req.query

    if (!bookmark_id || typeof bookmark_id !== 'string') {
      return res.status(400).json({ error: 'bookmark_id is required' })
    }

    const { error } = await supabase
      .from('user_bookmarks')
      .delete()
      .eq('id', bookmark_id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing bookmark:', error)
      return res.status(500).json({ 
        error: 'Failed to remove bookmark',
        details: error.message 
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Bookmark removed successfully'
    })

  } catch (error) {
    console.error('Remove bookmark error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}