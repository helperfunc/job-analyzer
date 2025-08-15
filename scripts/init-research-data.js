// Initialize sample data for Research module
// Run: node scripts/init-research-data.js

const samplePapers = [
  {
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
    publication_date: "2017-06-12",
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder...",
    url: "https://arxiv.org/abs/1706.03762",
    arxiv_id: "1706.03762",
    github_url: "https://github.com/tensorflow/tensor2tensor",
    company: "Google",
    tags: ["transformer", "attention", "nlp", "deep-learning"]
  },
  {
    title: "Language Models are Few-Shot Learners",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder"],
    publication_date: "2020-05-28",
    abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning...",
    url: "https://arxiv.org/abs/2005.14165",
    arxiv_id: "2005.14165",
    company: "OpenAI",
    tags: ["gpt-3", "language-models", "few-shot", "nlp"]
  },
  {
    title: "Constitutional AI: Harmlessness from AI Feedback",
    authors: ["Yuntao Bai", "Saurav Kadavath", "Sandipan Kundu"],
    publication_date: "2022-12-15",
    abstract: "We propose a method for training harmless AI assistants without human labels...",
    url: "https://arxiv.org/abs/2212.08073",
    arxiv_id: "2212.08073",
    company: "Anthropic",
    tags: ["constitutional-ai", "safety", "alignment", "rlhf"]
  },
  {
    title: "Scaling Laws for Neural Language Models",
    authors: ["Jared Kaplan", "Sam McCandlish", "Tom Henighan"],
    publication_date: "2020-01-23",
    abstract: "We study empirical scaling laws for language model performance on the cross-entropy loss...",
    url: "https://arxiv.org/abs/2001.08361",
    arxiv_id: "2001.08361",
    company: "OpenAI",
    tags: ["scaling-laws", "language-models", "empirical-study"]
  },
  {
    title: "Training Compute-Optimal Large Language Models",
    authors: ["Jordan Hoffmann", "Sebastian Borgeaud", "Arthur Mensch"],
    publication_date: "2022-03-29",
    abstract: "We investigate the optimal model size and number of tokens for training a transformer language model...",
    url: "https://arxiv.org/abs/2203.15556",
    arxiv_id: "2203.15556",
    company: "DeepMind",
    tags: ["chinchilla", "scaling", "compute-optimal", "llm"]
  }
];

console.log('Sample research papers data prepared.');
console.log('To insert into database, use the /api/research/papers endpoint with POST requests.');
console.log('\nExample papers:');
samplePapers.forEach(paper => {
  console.log(`- ${paper.title} (${paper.company})`);
});

// Export for use by other scripts
module.exports = { samplePapers };