import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { loadDemoBookmarks } from '../../../lib/demoStorage'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Helper function to load papers data from Supabase
async function loadPapersData() {
  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      console.log('Database not available for papers data')
      return []
    }

    const supabase = getSupabase()
    
    if (supabase) {
      const { data, error } = await supabase
        .from('research_papers')
        .select('*')
        .limit(1000)
      
      if (!error && data) {
        return data
      }
    }
  } catch (error) {
    console.error('Error loading papers from database:', error)
  }
  return []
}

// Helper function to load resources data from Supabase
async function loadResourcesData() {
  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      console.log('Database not available for resources data')
      return []
    }

    const supabase = getSupabase()

    if (supabase) {
      // Try all resource tables and combine results
      const [userResourcesResult, jobResourcesResult, interviewResourcesResult] = await Promise.all([
        supabase.from('user_resources').select('*').limit(1000),
        supabase.from('job_resources').select('*').limit(1000), 
        supabase.from('interview_resources').select('*').limit(1000)
      ])
      
      console.log('Resource query results:', {
        user_resources: { count: userResourcesResult.data?.length || 0, error: userResourcesResult.error },
        job_resources: { count: jobResourcesResult.data?.length || 0, error: jobResourcesResult.error },
        interview_resources: { count: interviewResourcesResult.data?.length || 0, error: interviewResourcesResult.error }
      })
      
      // Combine all resources
      const allResources = [
        ...(userResourcesResult.data || []),
        ...(jobResourcesResult.data || []),
        ...(interviewResourcesResult.data || [])
      ]
      
      console.log(`Total combined resources: ${allResources.length}`)
      return allResources
      
    } else {
      console.log('Supabase client not available')
    }
  } catch (error) {
    console.error('Error loading resources from database:', error)
  }
  console.log('No resources found, returning empty array')
  return []
}

// Helper function to load jobs data from Supabase
async function loadJobsData() {
  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      console.log('Database not available for jobs data')
      return []
    }

    const supabase = getSupabase()

    if (supabase) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .limit(1000)
      
      if (!error && data) {
        return data
      }
    }
  } catch (error) {
    console.error('Error loading jobs from database:', error)
  }
  return []
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
      details: 'No token provided'
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

  if (req.method === 'GET') {
    // Get all bookmarks
    const allBookmarks = loadDemoBookmarks()
    
    // Filter bookmarks for current user
    const userBookmarks = allBookmarks.filter(b => {
      return b.user_id === userId || 
             (decoded && b.user_id === decoded.userId) ||
             (decoded && decoded.email && b.user_id === btoa(decoded.email).replace(/[^a-zA-Z0-9]/g, ''))
    })
    
    // Load all data sources
    const [papers, resources, jobs] = await Promise.all([
      loadPapersData(),
      loadResourcesData(),
      loadJobsData()
    ])
    
    console.log(`Loaded data: ${papers.length} papers, ${resources.length} resources, ${jobs.length} jobs`)
    console.log(`Resources sample:`, resources.slice(0, 2))
    
    // Populate bookmarks with actual content
    const populatedBookmarks = userBookmarks.map(bookmark => {
      const populated = { ...bookmark }
      
      if (bookmark.bookmark_type === 'paper' && bookmark.paper_id) {
        const paper = papers.find(p => p.id === bookmark.paper_id)
        if (paper) {
          populated.title = paper.title
          populated.description = paper.abstract || paper.summary || ''
          populated.metadata = {
            authors: paper.authors,
            publication_date: paper.publication_date,
            company: paper.company,
            tags: paper.tags || [],
            url: paper.url
          }
        }
      } else if (bookmark.bookmark_type === 'resource' && bookmark.resource_id) {
        const resource = resources.find(r => r.id === bookmark.resource_id)
        console.log(`Looking for resource ${bookmark.resource_id}, found:`, resource)
        if (resource) {
          populated.title = resource.title
          populated.description = resource.description || resource.content || ''
          
          // Check multiple possible URL field names
          const resourceUrl = resource.url || resource.link || resource.href || resource.source_url
          
          populated.metadata = {
            resource_type: resource.resource_type || resource.type,
            url: resourceUrl,
            tags: resource.tags || []
          }
          console.log(`Resource metadata populated:`, populated.metadata)
        } else {
          console.log(`Resource ${bookmark.resource_id} not found in resources array of ${resources.length} items`)
        }
      } else if (bookmark.bookmark_type === 'job' && bookmark.job_id) {
        const job = jobs.find(j => j.id === bookmark.job_id)
        if (job) {
          populated.title = job.title
          populated.description = job.description || job.responsibilities?.join(' ') || ''
          populated.metadata = {
            company: job.company,
            location: job.location,
            department: job.department,
            type: job.type
          }
        }
      }
      
      return populated
    })
    
    return res.status(200).json({
      success: true,
      bookmarks: populatedBookmarks,
      total: populatedBookmarks.length
    })
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}