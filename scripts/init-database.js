// 初始化数据库示例数据
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iszbbsnhqakhjrfkzspv.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzemJic25ocWFraGpyZmt6c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzIzOTEsImV4cCI6MjA3MDUwODM5MX0.0TH3dbz_ePZaBVCsi59AQZ_mJLlYp1LBApXUZvL7-4g'

const supabase = createClient(supabaseUrl, supabaseKey)

const samplePapers = [
  {
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
    publication_date: "2017-06-12",
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    url: "https://arxiv.org/abs/1706.03762",
    arxiv_id: "1706.03762",
    github_url: "https://github.com/tensorflow/tensor2tensor",
    company: "Google",
    tags: ["transformer", "attention", "nlp", "deep-learning"]
  },
  {
    title: "Language Models are Few-Shot Learners",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah"],
    publication_date: "2020-05-28",
    abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches.",
    url: "https://arxiv.org/abs/2005.14165",
    arxiv_id: "2005.14165",
    company: "OpenAI",
    tags: ["gpt-3", "language-models", "few-shot", "nlp"]
  },
  {
    title: "Constitutional AI: Harmlessness from AI Feedback",
    authors: ["Yuntao Bai", "Saurav Kadavath", "Sandipan Kundu", "Amanda Askell"],
    publication_date: "2022-12-15",
    abstract: "We propose a method for training harmless AI assistants without human labels, using only a list of rules or principles. We train a harmless assistant by first training a preference model from AI feedback, and then using this preference model to train a harmless assistant via reinforcement learning from AI feedback (RLAIF).",
    url: "https://arxiv.org/abs/2212.08073",
    arxiv_id: "2212.08073",
    company: "Anthropic",
    tags: ["constitutional-ai", "safety", "alignment", "rlhf"]
  },
  {
    title: "Scaling Laws for Neural Language Models",
    authors: ["Jared Kaplan", "Sam McCandlish", "Tom Henighan", "Tom B. Brown"],
    publication_date: "2020-01-23",
    abstract: "We study empirical scaling laws for language model performance on the cross-entropy loss. The loss scales as a power-law with model size, dataset size, and the amount of compute used for training, with some trends spanning more than seven orders of magnitude.",
    url: "https://arxiv.org/abs/2001.08361",
    arxiv_id: "2001.08361",
    company: "OpenAI",
    tags: ["scaling-laws", "language-models", "empirical-study"]
  },
  {
    title: "Training Compute-Optimal Large Language Models",
    authors: ["Jordan Hoffmann", "Sebastian Borgeaud", "Arthur Mensch", "Elena Buchatskaya"],
    publication_date: "2022-03-29",
    abstract: "We investigate the optimal model size and number of tokens for training a transformer language model under a given compute budget. We find that current large language models are significantly over-sized, given their respective compute budgets, and that the optimal model size for a given compute budget is smaller than previously thought.",
    url: "https://arxiv.org/abs/2203.15556",
    arxiv_id: "2203.15556",
    company: "DeepMind",
    tags: ["chinchilla", "scaling", "compute-optimal", "llm"]
  }
]

async function initDatabase() {
  console.log('🚀 Initializing database with sample data...')
  
  try {
    // Insert papers
    console.log('📚 Inserting research papers...')
    const { data: papers, error: papersError } = await supabase
      .from('research_papers')
      .insert(samplePapers)
      .select()
    
    if (papersError) {
      console.error('Error inserting papers:', papersError)
      return
    }
    
    console.log(`✅ Inserted ${papers.length} research papers`)
    
    // Get some jobs to relate papers to
    console.log('🔍 Fetching existing jobs...')
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, company')
      .limit(5)
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      console.log('⚠️  No jobs found. Please scrape some jobs first.')
      return
    }
    
    if (jobs && jobs.length > 0) {
      console.log(`📋 Found ${jobs.length} jobs`)
      
      // Create some job-paper relations
      const relations = []
      
      // Relate transformer paper to ML jobs
      const transformerPaper = papers.find(p => p.title.includes('Attention'))
      const mlJob = jobs.find(j => j.title.toLowerCase().includes('machine learning') || j.title.toLowerCase().includes('research'))
      
      if (transformerPaper && mlJob) {
        relations.push({
          job_id: mlJob.id,
          paper_id: transformerPaper.id,
          relevance_score: 0.9,
          relevance_reason: 'Transformer architecture is fundamental for modern ML research positions'
        })
      }
      
      // Relate Constitutional AI to Anthropic jobs
      const caiPaper = papers.find(p => p.title.includes('Constitutional'))
      const anthropicJob = jobs.find(j => j.company === 'Anthropic')
      
      if (caiPaper && anthropicJob) {
        relations.push({
          job_id: anthropicJob.id,
          paper_id: caiPaper.id,
          relevance_score: 0.95,
          relevance_reason: 'Constitutional AI is a core research area at Anthropic'
        })
      }
      
      if (relations.length > 0) {
        const { data: relData, error: relError } = await supabase
          .from('job_paper_relations')
          .insert(relations)
          .select()
        
        if (relError) {
          console.error('Error creating relations:', relError)
        } else {
          console.log(`✅ Created ${relData.length} job-paper relations`)
        }
      }
    }
    
    console.log('🎉 Database initialization complete!')
    
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

// Run the initialization
initDatabase()