// This is a temporary file to test the fixed function
async function scrapeDeepMindWithPuppeteer(page: any, papers: Paper[]): Promise<void> {
  try {
    console.log('🚀 Starting DeepMind papers scraping...');
    
    const url = 'https://deepmind.google/research/publications/';
    console.log(`📄 Navigating to ${url}...`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const content = await page.content();
    console.log(`📄 Page content length: ${content.length}`);
    
    const $ = cheerio.load(content);
    
    // Look for publication links
    $('a[href*="/research/publications/"]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href') || '';
      const title = $link.text().trim();
      
      if (title && title.length > 10 && href.includes('/research/publications/')) {
        const fullUrl = href.startsWith('http') ? href : `https://deepmind.google${href}`;
        
        papers.push({
          title: title.substring(0, 200),
          authors: ['DeepMind'],
          publication_date: '2024-01-01',
          abstract: 'Research publication from DeepMind.',
          url: fullUrl,
          company: 'DeepMind',
          tags: generateTags(title)
        });
        
        console.log(`📝 Added paper: "${title.substring(0, 50)}..."`);
      }
    });
    
    console.log(`✅ Found ${papers.length} papers total from DeepMind`);
    
  } catch (error) {
    console.error('Error scraping DeepMind with Puppeteer:', error);
  }
}