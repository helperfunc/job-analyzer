import { supabase } from './supabase'

// Use the same supabase client to avoid multiple GoTrueClient instances
if (!supabase) {
  throw new Error('Supabase client not configured for testing')
}

export const testSupabase = supabase

// Test data helpers
export async function seedTestData() {
  // Create test users
  const testUsers = [
    {
      id: 'test-user-1',
      username: 'testuser1',
      email: 'test1@example.com',
      display_name: 'Test User 1',
      created_at: new Date().toISOString()
    },
    {
      id: 'test-user-2', 
      username: 'testuser2',
      email: 'test2@example.com',
      display_name: 'Test User 2',
      created_at: new Date().toISOString()
    }
  ]

  // Create test jobs
  const testJobs = [
    {
      id: 'test-job-1',
      title: 'Software Engineer',
      company: 'OpenAI',
      location: 'San Francisco',
      salary_min: 150000,
      salary_max: 200000,
      skills: ['Python', 'Machine Learning'],
      description: 'Build amazing AI systems',
      created_at: new Date().toISOString()
    },
    {
      id: 'test-job-2',
      title: 'Research Scientist',
      company: 'DeepMind',
      location: 'London',
      salary_min: 120000,
      salary_max: 180000,
      skills: ['Deep Learning', 'PyTorch'],
      description: 'Advance the state of AI research',
      created_at: new Date().toISOString()
    }
  ]

  // Create test papers
  const testPapers = [
    {
      id: 'test-paper-1',
      title: 'Attention Is All You Need',
      authors: ['Vaswani', 'Shazeer', 'Parmar'],
      abstract: 'The dominant sequence transduction models...',
      company: 'Google',
      publication_date: '2017-06-12',
      url: 'https://arxiv.org/abs/1706.03762',
      tags: ['transformer', 'attention', 'nlp'],
      created_at: new Date().toISOString()
    }
  ]

  // Insert test data
  try {
    await testSupabase.from('users').upsert(testUsers)
    await testSupabase.from('jobs').upsert(testJobs) 
    await testSupabase.from('research_papers').upsert(testPapers)
    
    console.log('✅ Test data seeded successfully')
  } catch (error) {
    console.error('❌ Failed to seed test data:', error)
  }
}

export async function cleanupTestData() {
  try {
    // Delete test data (in reverse order to handle foreign keys)
    await testSupabase.from('bookmarks').delete().ilike('user_id', 'test-%')
    await testSupabase.from('job_thoughts').delete().ilike('user_id', 'test-%')
    await testSupabase.from('paper_insights').delete().ilike('user_id', 'test-%')
    await testSupabase.from('research_papers').delete().ilike('id', 'test-%')
    await testSupabase.from('jobs').delete().ilike('id', 'test-%')
    await testSupabase.from('users').delete().ilike('id', 'test-%')
    
    console.log('🧹 Test data cleaned up')
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error)
  }
}