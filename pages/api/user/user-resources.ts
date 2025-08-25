import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const RESOURCES_DIR = path.join(process.cwd(), 'data', 'resources')
const RESOURCES_FILE = path.join(RESOURCES_DIR, 'user-resources.json')

// Ensure storage directory exists
if (!fs.existsSync(RESOURCES_DIR)) {
  fs.mkdirSync(RESOURCES_DIR, { recursive: true })
}

// Load resources from file
function loadResources() {
  try {
    if (fs.existsSync(RESOURCES_FILE)) {
      return JSON.parse(fs.readFileSync(RESOURCES_FILE, 'utf-8'))
    }
  } catch (error) {
    console.error('Error loading resources:', error)
  }
  return []
}

// Save resources to file
function saveResources(resources: any[]) {
  try {
    fs.writeFileSync(RESOURCES_FILE, JSON.stringify(resources, null, 2))
  } catch (error) {
    console.error('Error saving resources:', error)
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get token from cookie or Authorization header
  let token = req.cookies.token
  
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      details: 'Please login to access your resources'
    })
  }

  // Verify token and get user info
  let userId = 'demo-user'
  let decoded: any = null
  try {
    decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.userId || 'demo-user'
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: 'Please log in again'
    })
  }

  const allResources = loadResources()

  if (req.method === 'GET') {
    // Filter resources for current user (handle multiple user ID formats)
    const userResources = allResources.filter((resource: any) => {
      return resource.user_id === userId || 
             (decoded && resource.user_id === decoded.userId) ||
             (decoded && decoded.email && resource.user_id === btoa(decoded.email).replace(/[^a-zA-Z0-9]/g, ''))
    })

    return res.status(200).json({
      success: true,
      resources: userResources,
      total: userResources.length,
      userId: userId
    })

  } else if (req.method === 'POST') {
    // Create new resource
    const { title, description, resource_type, url, tags, visibility, content } = req.body

    if (!title || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Title and description are required'
      })
    }

    const newResource = {
      id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      resource_type: resource_type || 'other',
      url: url?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      visibility: visibility || 'public', // Default to public
      content: content?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    allResources.push(newResource)
    saveResources(allResources)

    return res.status(201).json({
      success: true,
      resource: newResource,
      message: 'Resource created successfully'
    })

  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}