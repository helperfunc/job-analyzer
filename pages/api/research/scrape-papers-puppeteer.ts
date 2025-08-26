import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import { getSupabase, isSupabaseAvailable } from '../../../lib/supabase'

interface Paper {
  title: string
  authors: string[]
  publication_date?: string
  abstract?: string
  url: string
  arxiv_id?: string
  github_url?: string
  company: string
  tags: string[]
  venue?: string
}

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

  const { company } = req.body

  if (!company || !['openai', 'anthropic', 'deepmind'].includes(company.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Company must be either "openai", "anthropic", or "deepmind"'
    })
  }

  let browser = null

  try {
    // Check if database is available
    if (!isSupabaseAvailable()) {
      return res.status(500).json({
        error: 'Database not available',
        details: 'Database connection is not configured'
      })
    }

    const supabase = getSupabase()
    
    console.log(`🚀 Starting Puppeteer to scrape ${company} research papers...`)
    
    // Start scraping asynchronously and return immediately
    const scrapingLogic = async () => {
      try {
        // Launch Puppeteer with settings to bypass Cloudflare
        browser = await puppeteer.launch({
          headless: true, // Using headless mode
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor'
          ]
        })
        
        const page = await browser.newPage()
        
        // Set a realistic user agent with English language preference
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 })
        
        // Set extra headers to request English content
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
        })
        
        // Hide webdriver presence
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          })
          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
          })
          Object.defineProperty(navigator, 'language', {
            get: () => 'en-US',
          })
        })

        const papers: Paper[] = []

        if (company.toLowerCase() === 'openai') {
          await scrapeOpenAIWithPuppeteer(page, papers)
        } else if (company.toLowerCase() === 'anthropic') {
          await scrapeAnthropicWithPuppeteer(page, papers)
        } else if (company.toLowerCase() === 'deepmind') {
          await scrapeDeepMindWithPuppeteer(page, papers)
        }

        // Save papers to database if Supabase is configured
        if (supabase && papers.length > 0) {
          console.log(`💾 Attempting to save ${papers.length} papers to database...`)
          let savedCount = 0
          
          for (let i = 0; i < papers.length; i++) {
            const paper = papers[i]
            try {
              console.log(`💾 Saving paper ${i + 1}/${papers.length}: ${paper.title.substring(0, 50)}...`)
              
              // Remove venue field before saving to database if it doesn't exist in schema
              const paperForDb = { ...paper };
              delete paperForDb.venue;
              
              const { data, error } = await supabase
                .from('research_papers')
                .upsert([paperForDb], { 
                  onConflict: 'url'
                })
                .select()

              if (error) {
                console.error(`❌ Error saving paper "${paper.title}":`, error)
              } else if (data) {
                savedCount += data.length
                console.log(`✅ Successfully saved: ${paper.title.substring(0, 50)}...`)
              }
            } catch (err) {
              console.error(`❌ Exception saving paper "${paper.title}":`, err)
            }
          }
          console.log(`✅ Total saved ${savedCount} out of ${papers.length} papers to database`)
        }

        return {
          success: true,
          company,
          count: papers.length,
          papers: papers.slice(0, 10), // Return first 10 papers as preview
          message: `Successfully scraped ${papers.length} papers from ${company} using Puppeteer`
        }
      } catch (scrapingError) {
        console.error(`❌ Background research scraping failed for ${company}:`, scrapingError)
        return {
          success: false,
          company,
          error: scrapingError instanceof Error ? scrapingError.message : 'Unknown scraping error'
        }
      } finally {
        if (browser) {
          console.log('🔒 Closing browser...')
          await browser.close()
        }
      }
    }

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scraping timeout')), 10 * 60 * 1000) // 10 minute timeout
    })

    // Start scraping in background and return immediately
    Promise.race([scrapingLogic(), timeoutPromise])
      .then((result) => {
        console.log(`✅ Background research scraping completed for ${company}`)
      })
      .catch((error) => {
        console.error(`❌ Background research scraping failed for ${company}:`, error)
      })

    // Return immediately to avoid browser timeout
    res.status(200).json({
      success: true,
      message: `Started background scraping for ${company} papers. Use polling to check completion.`,
      company: company,
      status: 'started'
    })

  } catch (error) {
    console.error('Error starting background research scraping:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to start background scraping',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function scrapeOpenAIWithPuppeteer(page: any, papers: Paper[]): Promise<void> {
  try {
    const url = 'https://openai.com/research/index/'
    console.log(`🚀 Navigating to ${url}...`)
    
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    })
    
    // Check if we got redirected to a localized version and redirect to English
    const currentUrl = page.url()
    if (currentUrl.includes('/zh-Hans') || currentUrl.includes('/zh-CN')) {
      console.log('🌍 Detected localized page, redirecting to English version...')
      const englishUrl = currentUrl.replace(/\/zh-Hans(-CN)?/, '')
      await page.goto(englishUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      })
    }
    
    // Wait for initial content to load and bypass Cloudflare
    await new Promise(resolve => setTimeout(resolve, 8000))
    
    // Continuously click "Load more" button until all content is loaded (back to 2016)
    let loadMoreAttempts = 0
    let consecutiveFailures = 0
    const maxConsecutiveFailures = 3 // Stop after 3 consecutive failures
    const maxTotalAttempts = 50 // Reasonable limit to avoid infinite loop
    
    console.log(`🔄 Starting to load all papers by clicking "Load more" repeatedly...`)
    
    while (loadMoreAttempts < maxTotalAttempts && consecutiveFailures < maxConsecutiveFailures) {
      try {
        loadMoreAttempts++
        console.log(`🔄 Attempt ${loadMoreAttempts}: Looking for "Load more" button...`)
        
        // Wait for the page to settle between attempts
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Get current page content length to detect if new content was loaded
        const beforeContentLength = await page.evaluate(() => document.body.textContent?.length || 0)
        
        // Find and click the "Load more" button
        const loadMoreClicked = await page.evaluate(() => {
          // Find all buttons and look for "Load more"
          const allButtons = Array.from(document.querySelectorAll('button'));
          const loadMoreButton = allButtons.find(btn => {
            const text = btn.textContent?.trim();
            return text === 'Load more';
          });
          
          if (loadMoreButton) {
            // Check if the button is visible and enabled
            const isVisible = loadMoreButton.offsetWidth > 0 && loadMoreButton.offsetHeight > 0;
            const isEnabled = !loadMoreButton.disabled;
            
            if (isVisible && isEnabled) {
              loadMoreButton.click();
              return true;
            } else {
              return false;
            }
          }
          
          return false;
        });
        
        if (loadMoreClicked) {
          console.log(`📥 Successfully clicked "Load more" button (attempt ${loadMoreAttempts})`)
          
          // Wait longer for new content to load
          await new Promise(resolve => setTimeout(resolve, 5000))
          
          // Check if new content was actually loaded
          const afterContentLength = await page.evaluate(() => document.body.textContent?.length || 0)
          const contentIncreased = afterContentLength > beforeContentLength
          
          if (contentIncreased) {
            console.log(`✅ New content loaded! Page size: ${beforeContentLength} → ${afterContentLength}`)
            consecutiveFailures = 0 // Reset failure counter
            
            // Check if we've reached 2016 content (optional early termination check)
            const has2016Content = await page.evaluate(() => {
              return document.body.textContent?.includes('2016') || false;
            });
            
            if (has2016Content) {
              console.log(`🎯 Detected 2016 content, likely reached the end of available papers`)
            }
          } else {
            console.log(`⚠️ Button clicked but no new content detected`)
            consecutiveFailures++
          }
        } else {
          console.log(`❌ "Load more" button not found or not clickable (attempt ${loadMoreAttempts})`)
          consecutiveFailures++
        }
        
        // Log progress every 5 attempts
        if (loadMoreAttempts % 5 === 0) {
          const currentContentLength = await page.evaluate(() => document.body.textContent?.length || 0)
          console.log(`📊 Progress: ${loadMoreAttempts} attempts, content length: ${currentContentLength}`)
        }
        
      } catch (e) {
        console.log(`⚠️ Error on attempt ${loadMoreAttempts}:`, e)
        consecutiveFailures++
      }
    }
    
    if (consecutiveFailures >= maxConsecutiveFailures) {
      console.log(`🏁 Stopped after ${consecutiveFailures} consecutive failures to load more content`)
    } else if (loadMoreAttempts >= maxTotalAttempts) {
      console.log(`🏁 Stopped after reaching maximum attempts (${maxTotalAttempts})`)
    }
    
    console.log(`📋 Final stats: ${loadMoreAttempts} total attempts to click "Load more"`)
    
    // Get the final HTML after loading all content
    const html = await page.content()
    
    // Check for Cloudflare protection
    if (html.includes('Just a moment') || html.includes('Please wait')) {
      console.log(`⚠️ Cloudflare challenge detected, trying longer wait...`)
      await new Promise(resolve => setTimeout(resolve, 15000))
      const retryHtml = await page.content()
      if (retryHtml.includes('Just a moment')) {
        console.log(`❌ Could not bypass Cloudflare`)
        return
      }
    }
    
    console.log(`📊 Final page content length: ${html.length}`)
    
    const $ = cheerio.load(html)
    
    // Enhanced parsing based on the actual OpenAI research page structure
    console.log('🔍 Parsing OpenAI research papers using targeted title extraction...')
    
    const bodyText = $('body').text()
    console.log(`📊 Page content sample: ${bodyText.substring(0, 500)}...`)
    
    // Use targeted exact title matching to ensure clean titles
    console.log('🔄 Using precise title extraction...')
    
    const foundTitles = new Set<string>()
    
    // Define exact, clean titles based on OpenAI research history (2025 back to 2016)
    const knownTitles = [
      // 2025 papers
      'GPT-5 System Card',
      'Introducing GPT-5', 
      'From hard refusals to safe-completions: toward output-centric safety training',
      'Introducing gpt-oss',
      'gpt-oss-120b & gpt-oss-20b Model Card',
      'Estimating worst case frontier risks of open weight LLMs',
      'Pioneering an AI clinical copilot with Penda Health',
      'ChatGPT agent System Card',
      'Introducing ChatGPT agent',
      'Toward understanding and preventing misalignment generalization',
      'Introducing HealthBench',
      'Introducing OpenAI o3 and o4-mini',
      'Thinking with images',
      'OpenAI o3 and o4-mini System Card',
      'Our updated Preparedness Framework',
      'Introducing GPT-4.1 in the API',
      'BrowseComp: a benchmark for browsing agents',
      'PaperBench: Evaluating AI\'s Ability to Replicate AI Research',
      'Introducing 4o Image Generation',
      'Addendum to GPT-4o System Card: 4o image generation',
      'Early methods for studying affective use and emotional well-being on ChatGPT',
      'Introducing next-generation audio models in the API',
      'Detecting misbehavior in frontier reasoning models',
      'OpenAI GPT-4.5 System Card',
      'Introducing GPT-4.5',
      'Deep research System Card',
      'Introducing the SWE-Lancer benchmark',
      'Sharing the latest Model Spec',
      'Introducing deep research',
      'OpenAI o3-mini',
      'OpenAI o3-mini System Card',
      'Operator System Card',
      'Computer-Using Agent',
      'Trading inference-time compute for adversarial robustness',
      
      // 2024 papers
      'Deliberative alignment: reasoning enables safer language models',
      'Sora System Card',
      'OpenAI o1 System Card',
      'Advancing red teaming with people and AI',
      'Introducing SimpleQA',
      'Simplifying, stabilizing, and scaling continuous-time consistency models',
      'Evaluating fairness in ChatGPT',
      'MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering',
      'Learning to reason with LLMs',
      'OpenAI o1-mini',
      'Introducing SWE-bench Verified',
      'GPT-4o System Card',
      'Improving Model Safety Behavior with Rule-Based Rewards',
      'GPT-4o mini: advancing cost-efficient intelligence',
      'Prover-Verifier Games improve legibility of language model outputs',
      'OpenAI and Los Alamos National Laboratory announce research partnership',
      'Finding GPT-4\'s mistakes with GPT-4',
      'Consistency Models',
      'Improved Techniques for Training Consistency Models',
      'A Holistic Approach to Undesired Content Detection in the Real World',
      'Extracting Concepts from GPT-4',
      'Hello GPT-4o',
      'Understanding the source of what we see and hear online',
      'The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions',
      'Video generation models as world simulators',
      'Building an early warning system for LLM-aided biological threat creation',
      
      // 2023 papers  
      'Practices for Governing Agentic AI Systems',
      'DALL·E 3 system card',
      'GPT-4V(ision) system card',
      'Confidence-Building Measures for Artificial Intelligence: Workshop proceedings',
      'Frontier AI regulation: Managing emerging risks to public safety',
      'Improving mathematical reasoning with process supervision',
      'Democratic inputs to AI',
      'Language models can explain neurons in language models',
      'GPTs are GPTs: An early look at the labor market impact potential of large language models',
      'GPT-4',
      'Forecasting potential misuses of language models for disinformation campaigns and how to reduce risk',
      
      // 2022 papers
      'Point-E: A system for generating 3D point clouds from complex prompts',
      'Scaling laws for reward model overoptimization',
      'Introducing Whisper',
      'Efficient training of language models to fill in the middle',
      'A hazard analysis framework for code synthesis large language models',
      'DALL·E 2 pre-training mitigations',
      'Learning to play Minecraft with Video PreTraining',
      'Evolution through large models',
      'AI-written critiques help humans notice flaws',
      'Techniques for training large neural networks',
      'Teaching models to express their uncertainty in words',
      'Hierarchical text-conditional image generation with CLIP latents',
      'Measuring Goodhart\'s law',
      'A research agenda for assessing the economic impacts of code generation models',
      'Lessons learned on language model safety and misuse',
      'Solving (some) formal math olympiad problems',
      'Aligning language models to follow instructions',
      'Text and code embeddings by contrastive pre-training',
      'WebGPT: Improving the factual accuracy of language models through web browsing',
      'Solving math word problems',
      'Summarizing books with human feedback',
      'TruthfulQA: Measuring how models mimic human falsehoods',
      'Introducing Triton: Open-source GPU programming for neural networks',
      'Evaluating large language models trained on code',
      'Improving language model behavior by training on a curated dataset',
      'Multimodal neurons in artificial neural networks',
      'Understanding the capabilities, limitations, and societal impact of large language models',
      'Scaling Kubernetes to 7,500 nodes',
      'DALL·E: Creating images from text',
      'CLIP: Connecting text and images',
      
      // More 2020-2016 papers (expanding the list)
      'Generative language modeling for automated theorem proving',
      'Learning to summarize with human feedback',
      'Image GPT',
      'Language models are few-shot learners',
      'AI and efficiency',
      'Jukebox',
      'Improving verifiability in AI development',
      'OpenAI Microscope',
      'Scaling laws for neural language models',
      'Dota 2 with large scale deep reinforcement learning',
      'Deep double descent',
      'Procgen Benchmark',
      'Safety Gym',
      'Benchmarking safe exploration in deep reinforcement learning',
      'GPT-2: 1.5B release',
      'Solving Rubik\'s Cube with a robot hand',
      'Fine-tuning GPT-2 from human preferences',
      'Emergent tool use from multi-agent interaction',
      'Testing robustness against unforeseen adversaries',
      'GPT-2: 6-month follow-up',
      'Why responsible AI development needs cooperation on safety',
      'Transfer of adversarial robustness between perturbation types',
      'MuseNet',
      'Generative modeling with sparse transformers',
      'OpenAI Five defeats Dota 2 world champions',
      'Better language models and their implications'
    ]
    
    // Look for each known title in the text
    for (const title of knownTitles) {
      if (bodyText.includes(title) && !foundTitles.has(title)) {
        foundTitles.add(title)
        
        // Extract surrounding text for context
        const titleIndex = bodyText.indexOf(title)
        const beforeTitle = bodyText.substring(Math.max(0, titleIndex - 300), titleIndex)
        const afterTitle = bodyText.substring(titleIndex + title.length, titleIndex + title.length + 600)
        
        // Extract publication date with improved pattern matching
        let publicationDate = '2025-08-07' // Default recent date
        const datePatterns = [
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(202[0-9])/i,
          /(202[0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])/
        ]
        
        for (const pattern of datePatterns) {
          const dateMatch = beforeTitle.match(pattern)
          if (dateMatch) {
            try {
              const dateStr = dateMatch[0]
              const date = new Date(dateStr)
              if (!isNaN(date.getTime())) {
                publicationDate = date.toISOString().split('T')[0]
                break
              }
            } catch (e) {
              // Continue to next pattern
            }
          }
        }
        
        // Extract paper type
        let paperType = 'Publication'
        const typeMatch = beforeTitle.match(/(Publication|Release|Safety|Milestone|Conclusion|Product|Research)(?=.*?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i)
        if (typeMatch) {
          paperType = typeMatch[1]
        }
        
        // Extract clean abstract
        let abstract = afterTitle.trim()
        // Remove leading non-alphabetic characters
        abstract = abstract.replace(/^[^A-Za-z]*/, '').trim()
        
        // Find the first sentence or meaningful chunk
        if (abstract.length > 0) {
          // Look for sentence endings
          const sentenceEnd = abstract.search(/[.!?]\s+[A-Z]/)
          if (sentenceEnd > 20) {
            abstract = abstract.substring(0, sentenceEnd + 1)
          } else {
            // Take first reasonable chunk up to 300 chars
            abstract = abstract.substring(0, 300)
            if (!abstract.endsWith('.') && !abstract.endsWith('...')) {
              abstract += '...'
            }
          }
        } else {
          abstract = `${paperType} from OpenAI focusing on ${title.toLowerCase()}.`
        }
        
        // Generate proper URL for this paper based on title
        // Use known URL mappings for accuracy, fall back to generated URLs
        const knownUrlMappings: Record<string, string> = {
          'gpt-oss-120b & gpt-oss-20b Model Card': 'https://openai.com/index/gpt-oss-model-card/',
          'Introducing gpt-oss': 'https://openai.com/index/introducing-gpt-oss/',
          'Introducing GPT-4.1 in the API': 'https://openai.com/index/introducing-gpt-4-1-in-the-api/',
          'Introducing GPT-5': 'https://openai.com/index/introducing-gpt-5/',
          'Introducing ChatGPT agent': 'https://openai.com/index/introducing-chatgpt-agent/',
          'Introducing OpenAI o3 and o4-mini': 'https://openai.com/index/introducing-openai-o3-and-o4-mini/',
          'Introducing GPT-4.5': 'https://openai.com/index/introducing-gpt-4-5/',
          'Introducing deep research': 'https://openai.com/index/introducing-deep-research/',
          'Computer-Using Agent': 'https://openai.com/index/computer-using-agent/',
          'Hello GPT-4o': 'https://openai.com/index/hello-gpt-4o/',
          'GPT-4o mini: advancing cost-efficient intelligence': 'https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/',
          'Video generation models as world simulators': 'https://openai.com/index/video-generation-models-as-world-simulators/',
          'Introducing Whisper': 'https://openai.com/index/introducing-whisper/',
          'Learning to reason with LLMs': 'https://openai.com/index/learning-to-reason-with-llms/',
          'GPT-4': 'https://openai.com/index/gpt-4-research/',
          'Language models are few-shot learners': 'https://openai.com/index/language-models-are-few-shot-learners/'
        }
        
        let paperUrl = knownUrlMappings[title]
        
        if (!paperUrl) {
          // Generate URL from title as fallback
          let urlSlug = title.toLowerCase()
            .replace(/\s*&\s*/g, '-and-') // Convert & to -and-
            .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
            .replace(/\s+/g, '-') // Convert spaces to hyphens
            .replace(/-+/g, '-') // Collapse multiple hyphens
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .slice(0, 60) // Slightly longer limit for better accuracy
          
          paperUrl = `https://openai.com/index/${urlSlug}/`
        }
        
        papers.push({
          title, // Use the exact, clean title
          authors: ['OpenAI'],
          publication_date: publicationDate,
          abstract,
          url: paperUrl,
          company: 'OpenAI',
          tags: generateTags(title + ' ' + abstract + ' ' + paperType)
        })
        
        console.log(`📝 Found paper: "${title}" (${publicationDate})`)
      }
    }
    
    console.log(`✅ Found ${papers.length} papers total from OpenAI`)
    
  } catch (error) {
    console.error('Error scraping OpenAI with Puppeteer:', error)
  }
}

async function scrapeAnthropicWithPuppeteer(page: any, papers: Paper[]): Promise<void> {
  try {
    // Focus on the research page which should contain publications
    const urls = [
      'https://www.anthropic.com/research'
    ]
    
    for (const url of urls) {
      try {
        console.log(`📄 Navigating to ${url}...`)
        
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        })
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 8000))
        
        const html = await page.content()
        
        // Check if we got past any protection
        if (html.includes('Just a moment') || html.includes('Please wait')) {
          console.log(`⚠️ Protection detected on ${url}, trying longer wait...`)
          await new Promise(resolve => setTimeout(resolve, 15000))
        }
        
        console.log(`📊 Page loaded, content length: ${html.length}`)
        
        const $ = cheerio.load(html)
        
        // Look for research papers - focus on publication section
        const selectors = [
          // Look for publication containers
          'article',
          '[class*="publication"]',
          '[class*="paper"]', 
          '[class*="research"]',
          '[class*="card"]',
          '[class*="item"]',
          
          // Specific Anthropic content
          'div[data-testid*="publication"]',
          'div[data-testid*="paper"]',
          
          // Headings and links
          'h1, h2, h3, h4, h5',
          'a[href*="/research/"]',
        ]
        
        const foundTitles = new Set<string>()
        
        for (const selector of selectors) {
          $(selector).each((_, element) => {
            const $elem = $(element)
            let title = ''
            let paperUrl = ''
            
            // Extract title
            if ($elem.is('a')) {
              title = $elem.text().trim()
              paperUrl = $elem.attr('href') || ''
            } else {
              title = $elem.text().trim()
              paperUrl = $elem.find('a').first().attr('href') || 
                        $elem.closest('a').attr('href') || ''
            }
            
            // Check if this looks like a research paper for Anthropic
            if (title && 
                title.length > 5 && 
                title.length < 300 &&
                !foundTitles.has(title) &&
                // Exclude navigation elements
                !(/^(Research|Publications|News|About|API)$/i.test(title)) &&
                (
                  // Match Anthropic-specific models and research
                  /\b(Claude|Constitutional|Haiku|Sonnet|Opus)\b/i.test(title) ||
                  // Match research topics
                  /\b(Safety|Alignment|RLHF|Interpretability|Oversight)\b/i.test(title) ||
                  // Match paper-style titles
                  /\b(Training|Scaling|Measuring|Mapping|Many-Shot)\b/i.test(title) ||
                  // Research-related terms
                  /\b(paper|research|model|system|card|feedback)\b/i.test(title) ||
                  // Contains year
                  /202[0-9]/.test(title)
                )) {
              
              foundTitles.add(title)
              
              // Normalize URL
              if (paperUrl && !paperUrl.startsWith('http')) {
                paperUrl = `https://www.anthropic.com${paperUrl.startsWith('/') ? '' : '/'}${paperUrl}`
              } else if (!paperUrl) {
                // Generate URL from title as fallback (better than generic /research)
                const urlSlug = title.toLowerCase()
                  .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
                  .replace(/\s+/g, '-') // Convert spaces to hyphens
                  .replace(/-+/g, '-') // Collapse multiple hyphens
                  .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
                  .slice(0, 60) // Limit length
                
                paperUrl = `https://www.anthropic.com/research/${urlSlug}`
              }
              
              // Extract additional info
              const contextText = $elem.parent().text() + ' ' + $elem.siblings().text()
              
              // Extract date
              const dateMatch = contextText.match(/\b(202[0-9]|201[0-9])-(\d{2})-(\d{2})\b/) ||
                               contextText.match(/\b(202[0-9]|201[0-9])\b/)
              
              const publication_date = dateMatch ? 
                (dateMatch[0].length === 4 ? `${dateMatch[0]}-01-01` : dateMatch[0]) :
                new Date().toISOString().split('T')[0]
              
              // Extract abstract
              const abstract = $elem.siblings('p').first().text().trim() ||
                              $elem.parent().find('p').first().text().trim() ||
                              contextText.substring(0, 300) + '...'
              
              papers.push({
                title,
                authors: ['Anthropic'],
                publication_date,
                abstract,
                url: paperUrl,
                company: 'Anthropic',
                tags: generateTags(title + ' ' + abstract)
              })
              
              console.log(`📝 Found paper: ${title}`)
            }
          })
        }
        
        if (papers.length > 0) {
          console.log(`✅ Found ${papers.length} papers from ${url}`)
          break
        }
        
      } catch (pageError) {
        console.log(`⚠️ Error loading ${url}:`, pageError)
        continue
      }
    }
    
  } catch (error) {
    console.error('Error scraping Anthropic with Puppeteer:', error)
  }
}

async function fetchDeepMindPaperDetails(page: any, paperUrl: string): Promise<{ abstract?: string; authors?: string[]; venue?: string }> {
  try {
    console.log(`🔍 Fetching details for: ${paperUrl}`);
    await page.goto(paperUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    let abstract = '';
    let authors: string[] = [];
    let venue = '';
    
    // Extract abstract
    const abstractSelectors = [
      '.abstract',
      'section.abstract p',
      '[class*="abstract"]',
      'h2:contains("Abstract") + p',
      'h2:contains("abstract") + p',
      'h3:contains("Abstract") + p'
    ];
    
    for (const selector of abstractSelectors) {
      const abstractText = $(selector).text().trim();
      if (abstractText && abstractText.length > 50) {
        abstract = abstractText;
        break;
      }
    }
    
    // Extract authors
    const authorSelectors = [
      '.publication-authors li',
      '.authors li',
      '[class*="author"] li',
      '.publication-metadata li'
    ];
    
    for (const selector of authorSelectors) {
      const authorElements = $(selector);
      if (authorElements.length > 0) {
        authorElements.each((_, el) => {
          const author = $(el).text().trim();
          if (author && author.length > 2 && !author.includes('Published') && !author.includes('Venue')) {
            authors.push(author);
          }
        });
        if (authors.length > 0) break;
      }
    }
    
    // Extract venue
    const venueMatch = content.match(/Venue:\s*([^\n<]+)/i) || 
                      content.match(/(ICCV|CVPR|NeurIPS|ICML|ECCV|ICLR|AAAI|IJCAI|ACL|EMNLP|arXiv|Nature|Science)\s*\d{0,4}/i);
    if (venueMatch) {
      venue = venueMatch[1].trim();
    }
    
    return { abstract, authors: authors.length > 0 ? authors : undefined, venue };
    
  } catch (error) {
    console.error(`Error fetching paper details for ${paperUrl}:`, error);
    return {};
  }
}

async function scrapeDeepMindWithPuppeteer(page: any, papers: Paper[]): Promise<void> {
  try {
    console.log('🚀 Starting DeepMind papers scraping with pagination...');
    
    let currentPage = 1;
    let hasNextPage = true;
    let consecutiveEmptyPages = 0;
    const maxPages = 20; // Safety limit to prevent infinite loops
    const maxConsecutiveEmptyPages = 3;
    
    while (hasNextPage && currentPage <= maxPages && consecutiveEmptyPages < maxConsecutiveEmptyPages) {
      const url = currentPage === 1 
        ? 'https://deepmind.google/research/publications/'
        : `https://deepmind.google/research/publications/?page=${currentPage}`;
      
      console.log(`📄 Navigating to page ${currentPage}: ${url}...`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const content = await page.content();
      console.log(`📄 Page ${currentPage} content length: ${content.length}`);
      
      const $ = cheerio.load(content);
      
      // Track papers found on this page
      const papersBeforeThisPage = papers.length;
      
      // Look for publication items on this page
      // DeepMind uses a structured layout with publication-item divs or similar containers
      const publicationSelectors = [
        '.publication-item',
        '[class*="publication"]',
        'article',
        'div[data-testid*="publication"]',
        '.item',
        '.card'
      ];
      
      let publicationItems = $();
      for (const selector of publicationSelectors) {
        const items = $(selector);
        if (items.length > 0) {
          publicationItems = items;
          console.log(`📋 Found ${items.length} items using selector: ${selector}`);
          break;
        }
      }
      
      // If no structured items found, fall back to link-based extraction
      if (publicationItems.length === 0) {
        console.log('⚠️ No structured publication items found, using link-based extraction');
        publicationItems = $('a[href*="/research/publications/"]').parent();
      }
      
      publicationItems.each((_, element) => {
        const $item = $(element);
        const itemHtml = $item.html() || '';
        const itemText = $item.text();
        
        // Extract the publication link and title
        const $titleLink = $item.find('a[href*="/research/publications/"]').first();
        if ($titleLink.length === 0) {
          return;
        }
        
        const href = $titleLink.attr('href') || '';
        const title = $titleLink.text().trim();
        
        // Skip navigation links and empty titles
        if (!title || title.length < 10 || 
            href === '/research/publications/' || 
            href === '/research/publications' ||
            title.toLowerCase() === 'publications' ||
            title.toLowerCase() === 'research') {
          return;
        }
        
        const fullUrl = href.startsWith('http') ? href : `https://deepmind.google${href}`;
        
        // Check for duplicates
        const existingPaper = papers.find(p => p.url === fullUrl || p.title === title);
        if (existingPaper) {
          return;
        }
        
        // Extract structured data from the publication item
        let publicationDate = '2024-01-01';
        let authors: string[] = [];
        let venue = '';
        let abstract = '';
        
        // Extract date - look for date patterns in the item
        const datePatterns = [
          /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:uary|ruary|ch|il|y|e|y|ust|tember|ober|ember|ember)\s+(\d{4})/i,
          /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
          /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
          /\b(202[0-9])\b/
        ];
        
        for (const pattern of datePatterns) {
          const dateMatch = itemText.match(pattern);
          if (dateMatch) {
            if (dateMatch[0].match(/^\d{4}$/)) {
              publicationDate = `${dateMatch[0]}-01-01`;
            } else if (dateMatch[0].match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
              publicationDate = dateMatch[0].replace(/\//g, '-');
            } else {
              // Parse month-based dates
              const monthMap: Record<string, string> = {
                'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
                'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
                'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
                'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
                'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
                'dec': '12', 'december': '12'
              };
              const day = dateMatch[1].padStart(2, '0');
              const month = monthMap[dateMatch[2].toLowerCase().substring(0, 3)];
              const year = dateMatch[3];
              if (month) {
                publicationDate = `${year}-${month}-${day}`;
              }
            }
            break;
          }
        }
        
        // Extract authors - look for author patterns after the title
        const titleIndex = itemText.indexOf(title);
        if (titleIndex !== -1) {
          const afterTitle = itemText.substring(titleIndex + title.length);
          
          // Look for author patterns
          const authorPatterns = [
            /^[,\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)/,
            /Authors?:\s*([^,\n]+(?:,\s*[^,\n]+)*)/i,
            /by\s+([^,\n]+(?:,\s*[^,\n]+)*)/i
          ];
          
          for (const pattern of authorPatterns) {
            const authorMatch = afterTitle.match(pattern);
            if (authorMatch && authorMatch[1]) {
              const authorString = authorMatch[1].trim();
              // Split by comma and clean up
              authors = authorString.split(/,\s*/)
                .map(a => a.trim())
                .filter(a => a.length > 2 && !a.match(/^\d/) && !a.includes('Conference') && !a.includes('Journal'));
              
              if (authors.length > 0) {
                break;
              }
            }
          }
          
          // Look for venue information
          const venueMatch = afterTitle.match(/(ICCV|CVPR|NeurIPS|ICML|ECCV|ICLR|AAAI|IJCAI|ACL|EMNLP|arXiv|Nature|Science|PNAS|Cell|PLOS)\s*\d{0,4}/i);
          if (venueMatch) {
            venue = venueMatch[0];
          }
        }
        
        // If no authors found, use DeepMind as default
        if (authors.length === 0) {
          authors = ['DeepMind Research Team'];
        }
        
        // Generate abstract based on title and venue
        if (!abstract) {
          abstract = `${venue ? `Published at ${venue}. ` : ''}Research publication from DeepMind exploring ${title.toLowerCase()}.`;
        }
        
        papers.push({
          title: title.substring(0, 200),
          authors: authors,
          publication_date: publicationDate,
          abstract: abstract,
          url: fullUrl,
          company: 'DeepMind',
          tags: generateTags(title + ' ' + abstract + ' ' + venue),
          venue: venue || undefined
        });
        
        console.log(`📝 Page ${currentPage}: Added paper "${title.substring(0, 50)}..." by ${authors.slice(0, 2).join(', ')}${authors.length > 2 ? ' et al.' : ''} (${publicationDate})`);
      });
      
      const papersFoundOnThisPage = papers.length - papersBeforeThisPage;
      console.log(`📊 Page ${currentPage}: Found ${papersFoundOnThisPage} new papers`);
      
      if (papersFoundOnThisPage === 0) {
        consecutiveEmptyPages++;
        console.log(`⚠️ No new papers found on page ${currentPage} (${consecutiveEmptyPages} consecutive empty pages)`);
      } else {
        consecutiveEmptyPages = 0;
      }
      
      // Check if there's a next page by looking for pagination elements
      const hasNextPageElement = $('a[href*="page=' + (currentPage + 1) + '"]').length > 0 ||
                                 $('a').filter((_, el) => $(el).text().trim().toLowerCase().includes('next')).length > 0 ||
                                 $('[class*="next"]').length > 0 ||
                                 $('[aria-label*="next"]').length > 0;
      
      // Also check if current page returned a valid response (not 404)
      const pageTitle = $('title').text();
      const isValidPage = !pageTitle.includes('404') && !pageTitle.includes('Not Found') && content.length > 1000;
      
      if (!hasNextPageElement || !isValidPage || papersFoundOnThisPage === 0) {
        // Try one more page to be sure
        if (consecutiveEmptyPages < maxConsecutiveEmptyPages) {
          console.log(`🔍 Checking if page ${currentPage + 1} exists...`);
          currentPage++;
        } else {
          hasNextPage = false;
          console.log(`🏁 Stopping pagination: reached ${consecutiveEmptyPages} consecutive empty pages`);
        }
      } else {
        currentPage++;
        console.log(`➡️ Moving to page ${currentPage}`);
      }
      
      // Small delay between pages to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (currentPage > maxPages) {
      console.log(`🏁 Stopped at maximum page limit (${maxPages})`);
    }
    
    console.log(`✅ Pagination complete! Scraped ${currentPage - 1} pages and found ${papers.length} papers total from DeepMind`);
    
  } catch (error) {
    console.error('Error scraping DeepMind with Puppeteer:', error);
  }
}

function generateTags(text: string): string[] {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();
  
  // AI/ML keywords
  const keywords = [
    // Models
    'gpt-5', 'gpt-4', 'gpt-oss', 'chatgpt', 'dall-e', 'whisper', 'sora', 'clip', 'codex', 'o1', 'o3', 'o4',
    // Companies
    'openai', 'anthropic', 'deepmind', 'gemini', 'alphafold',
    // Technical terms
    'transformer', 'attention', 'llm', 'language model', 'neural network',
    // Safety and alignment
    'safety', 'alignment', 'rlhf', 'constitutional ai', 'robustness',
    // Training and optimization
    'scaling', 'fine-tuning', 'training', 'inference', 'optimization', 'reinforcement learning',
    // Capabilities
    'multimodal', 'vision', 'reasoning', 'benchmark', 'evaluation', 'generalization',
    // Research areas
    'interpretability', 'adversarial', 'few-shot', 'zero-shot', 'meta-learning',
    // Application areas
    'healthcare', 'clinical', 'copilot', 'agent', 'robotics', 'game playing'
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      tags.push(keyword.replace(/\s+/g, '-'));
    }
  });
  
  return Array.from(new Set(tags)); // Remove duplicates
}