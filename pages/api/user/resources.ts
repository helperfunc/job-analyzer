import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, optionalAuth, AuthenticatedRequest } from '../../../lib/auth'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

interface UserResourceRequest {
  title: string
  description?: string
  content?: string
  url?: string
  resource_type: 'article' | 'video' | 'course' | 'tool' | 'note' | 'project' | 'other'
  visibility: 'public' | 'private'
  tags?: string[]
  category?: string
}

// 使用optionalAuth允许未登录用户查看公开资源
export default optionalAuth(async function handler(
  req: AuthenticatedRequest, 
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return await getResources(req, res)
  } else if (req.method === 'POST') {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    return await createResource(req, res, req.user.userId)
  } else if (req.method === 'PUT') {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    return await updateResource(req, res, req.user.userId)
  } else if (req.method === 'DELETE') {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    return await deleteResource(req, res, req.user.userId)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
})

async function getResources(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { 
      user_id, 
      visibility, 
      resource_type, 
      category, 
      search, 
      limit = '20', 
      offset = '0',
      my_resources 
    } = req.query

    if (!isSupabaseAvailable()) {
      return res.status(503).json({
        error: 'Database not configured'
      })
    }

    const supabase = getSupabase()

    let query = supabase
      .from('user_resources')
      .select(`
        id,
        title,
        description,
        content,
        url,
        resource_type,
        visibility,
        tags,
        category,
        view_count,
        bookmark_count,
        created_at,
        updated_at,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)

    // 如果用户已登录且查看自己的资源，显示所有资源
    if (req.user && my_resources === 'true') {
      query = query.eq('user_id', req.user.userId)
    } else {
      // 否则只显示公开资源
      query = query.eq('visibility', 'public')
      
      // 如果指定了用户ID，则显示该用户的公开资源
      if (user_id && typeof user_id === 'string') {
        query = query.eq('user_id', user_id)
      }
    }

    // 应用其他过滤条件
    if (visibility && typeof visibility === 'string' && req.user) {
      query = query.eq('visibility', visibility)
    }

    if (resource_type && typeof resource_type === 'string') {
      query = query.eq('resource_type', resource_type)
    }

    if (category && typeof category === 'string') {
      query = query.eq('category', category)
    }

    // 搜索功能
    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // 分页
    const limitNum = parseInt(Array.isArray(limit) ? limit[0] : limit)
    const offsetNum = parseInt(Array.isArray(offset) ? offset[0] : offset)
    query = query
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1)

    const { data: resources, error } = await query

    if (error) {
      console.error('Error fetching resources:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch resources',
        details: error.message 
      })
    }

    return res.status(200).json({
      success: true,
      resources: resources || [],
      total: resources?.length || 0
    })

  } catch (error) {
    console.error('Get resources error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function createResource(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    const resourceData: UserResourceRequest = req.body

    if (!resourceData.title || !resourceData.resource_type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'title and resource_type are required'
      })
    }

    if (!['article', 'video', 'course', 'tool', 'note', 'project', 'other'].includes(resourceData.resource_type)) {
      return res.status(400).json({ 
        error: 'Invalid resource type'
      })
    }

    if (!['public', 'private'].includes(resourceData.visibility)) {
      return res.status(400).json({ 
        error: 'Invalid visibility value. Must be "public" or "private"'
      })
    }

    const { data: resource, error } = await supabase
      .from('user_resources')
      .insert([{
        user_id: userId,
        title: resourceData.title,
        description: resourceData.description,
        content: resourceData.content,
        url: resourceData.url,
        resource_type: resourceData.resource_type,
        visibility: resourceData.visibility,
        tags: resourceData.tags || [],
        category: resourceData.category
      }])
      .select(`
        id,
        title,
        description,
        content,
        url,
        resource_type,
        visibility,
        tags,
        category,
        view_count,
        bookmark_count,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error creating resource:', error)
      return res.status(500).json({ 
        error: 'Failed to create resource',
        details: error.message 
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      resource
    })

  } catch (error) {
    console.error('Create resource error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function updateResource(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { resource_id, ...updateData }: UserResourceRequest & { resource_id: string } = req.body

    if (!resource_id) {
      return res.status(400).json({ error: 'resource_id is required' })
    }

    if (!isSupabaseAvailable()) {
      return res.status(503).json({
        error: 'Database not configured'
      })
    }

    const supabase = getSupabase()

    // 验证用户拥有该资源
    const { data: existingResource, error: checkError } = await supabase
      .from('user_resources')
      .select('id')
      .eq('id', resource_id)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingResource) {
      return res.status(404).json({ 
        error: 'Resource not found or access denied'
      })
    }

    // 验证数据
    if (updateData.resource_type && !['article', 'video', 'course', 'tool', 'note', 'project', 'other'].includes(updateData.resource_type)) {
      return res.status(400).json({ 
        error: 'Invalid resource type'
      })
    }

    if (updateData.visibility && !['public', 'private'].includes(updateData.visibility)) {
      return res.status(400).json({ 
        error: 'Invalid visibility value. Must be "public" or "private"'
      })
    }

    const { data: resource, error } = await supabase
      .from('user_resources')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', resource_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating resource:', error)
      return res.status(500).json({ 
        error: 'Failed to update resource',
        details: error.message 
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      resource
    })

  } catch (error) {
    console.error('Update resource error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function deleteResource(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { resource_id } = req.query

    if (!resource_id || typeof resource_id !== 'string') {
      return res.status(400).json({ error: 'resource_id is required' })
    }

    if (!isSupabaseAvailable()) {
      return res.status(503).json({
        error: 'Database not configured'
      })
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from('user_resources')
      .delete()
      .eq('id', resource_id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting resource:', error)
      return res.status(500).json({ 
        error: 'Failed to delete resource',
        details: error.message 
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    })

  } catch (error) {
    console.error('Delete resource error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}