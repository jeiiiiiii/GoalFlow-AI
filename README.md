# 🎯 GoalFlow-AI

An AI-powered study planning application that uses multi-agent architecture to analyze goals, decompose tasks, prioritize work, and generate personalized study schedules.

## Features

- **Intelligent Goal Analysis** - AI analyzes your learning goals and extracts key information
- **Automatic Task Breakdown** - Decomposes complex goals into manageable tasks
- **Smart Prioritization** - Scores and orders tasks based on dependencies and complexity
- **Dynamic Scheduling** - Creates realistic daily schedules based on your availability
- **Adaptive Reflection** - Adjusts plans based on your progress and feedback
- **Memory System** - Learns your patterns and preferences over time

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB (Mongoose)
- JWT Authentication
- Multi-Agent AI System (Google Generative AI, Hugging Face)
- Upstash Redis (Rate Limiting)

**AI Agents:**
- Goal Analyzer - Parses and analyzes study goals
- Task Decomposer - Breaks goals into actionable tasks
- Priority Scorer - Prioritizes tasks intelligently
- Scheduler - Creates optimized study schedules
- Reflector - Adapts plans based on progress

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Upstash Redis account
- Google Gemini API key

### Installation

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd GoalFlow-AI
\`\`\`

2. Install dependencies
\`\`\`bash
cd backend
npm install
\`\`\`

3. Configure environment variables
\`\`\`bash
# Create .env file in backend directory
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
\`\`\`

4. Start the server
\`\`\`bash
npm run dev
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login

### Study Planning
- `POST /api/study/goals` - Create study plan (runs all agents)
- `GET /api/study/goals/:id` - Get goal details
- `GET /api/study/goals/:id/tasks` - Get tasks for goal
- `GET /api/study/plans/:goalId` - Get schedule
- `PATCH /api/study/tasks/:id` - Update task status
- `POST /api/study/reflect/:goalId` - Trigger plan adjustment
- `GET /api/study/next-task` - Get AI task recommendation
- `GET /api/study/insights` - Get learning patterns

See [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) for detailed API reference.

## Project Structure

\`\`\`
backend/
├── src/
│   ├── agents/          # AI agent implementations
│   ├── config/          # Database and service configs
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth and rate limiting
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Agent orchestration
│   └── server.js        # Entry point
└── package.json
\`\`\`

## License

ISC
EOF
