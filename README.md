# AI Job Search Assistant
<img width="1900" height="3590" alt="localhost" src="https://github.com/user-attachments/assets/f58cf97b-0629-4410-9666-b7a350325382" />

A comprehensive AI-powered job search assistant that helps you systematically prepare for job applications, from skill analysis to research paper exploration, serving as your intelligent companion in the job search journey.

## ✨ Core Features

### 📊 Job Analysis
- 🔗 Automatically scrape latest positions from OpenAI and Anthropic
- 💰 Salary range analysis and sorting
- 🛠 Skill requirement statistics and trends
- 🏢 Company comparison analysis

### 🎓 Research Center (Core Feature)
- 📚 **Research Papers**: One-click scraping of latest papers from OpenAI/Anthropic to understand cutting-edge technology
- 🔗 **Job Linking**: Connect papers with job positions to prepare interview talking points
- 💡 **Personal Insights**: Record thoughts, experiences, and learning notes for each position
- 🎯 **Skill Gap Analysis**: AI analyzes the gap between your skills and job requirements, providing learning suggestions
- 🛠 **Job Resource Library**: Collect and manage videos, articles, tools, and other job-related resources

### 🎯 Intelligent Analysis
- 🤖 GPT-4 powered skill gap analysis
- 📈 Personalized learning path recommendations
- 🎪 Skill matching score

## Quick Start

### 1. Clone the Project

```bash
git clone https://github.com/yourusername/job-analyzer.git
cd job-analyzer
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your API keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url (optional)
SUPABASE_ANON_KEY=your_supabase_anon_key (optional)
```

### 4. Setup Database (Optional)

If you want to use database functionality:

1. Register for a [Supabase](https://supabase.com) account
2. Create a new project
3. Run the following SQL files in order in the `SQL Editor`:
   - `database/schema.sql` (basic table structure)
   - `database/research-schema.sql` (research feature tables)
   - `database/job-resources-schema.sql` (job resource tables)
4. Add your Supabase URL and keys to `.env.local`

### 5. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Deploy to Vercel

1. Push code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Configure environment variables
4. Click deploy

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-3.5
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Project Structure

```
job-analyzer/
├── pages/
│   ├── api/
│   │   └── analyze.ts    # Job analysis API
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx         # Main page
├── lib/
│   └── supabase.ts       # Database connection
├── database/
│   └── schema.sql        # Database schema
├── styles/
│   └── globals.css       # Global styles
└── package.json
```

## Cost Estimation

- Vercel: Free tier
- Supabase: Free tier
- OpenAI API: ~$10-50/month (depending on usage)
- Domain: $12/year

**Total: < $50/month**

## 🎯 Use Cases

### Preparing for Top AI Companies
1. **Research Company Direction**: Scrape latest papers to understand company research focus
2. **Analyze Job Requirements**: Use AI to analyze skill gaps and create learning plans
3. **Collect Learning Resources**: Build personal job search resource library
4. **Record Learning Insights**: Systematically document interview preparation process

### Systematic Skill Enhancement
1. **Skill Inventory**: Comprehensive analysis of current capability level
2. **Comparative Analysis**: Understand different companies' requirements for the same skills
3. **Resource Integration**: Collect highest quality learning resources
4. **Progress Tracking**: Record learning progress and effectiveness

## 🆕 Latest Features

### Research Center
- ✅ Paper scraping and management
- ✅ Job-paper linking
- ✅ Personal insights and notes
- ✅ AI skill gap analysis
- ✅ Job resource bookmarks

### Data Management
- ✅ Supabase cloud storage
- ✅ Local data caching
- ✅ User data isolation

## 🚀 Future Plans

### Near-term Features
- Interview question bank and answer preparation
- Job application progress tracking and reminders
- Resume keyword optimization suggestions
- LeetCode practice progress management

### Future Vision
- Job search community and experience sharing
- AI mock interviews and feedback
- Salary negotiation strategy advice
- Career development path planning

## Contributing

Welcome to submit Pull Requests or create Issues!

## License

MIT