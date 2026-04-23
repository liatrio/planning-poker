# Planning Poker

## TL;DR

Real-time collaborative Planning Poker application with AI-powered story analysis, Jira and Azure DevOps integration, vote modifiers, and persistent sessions. Built with React, Node.js, WebSocket, and PostgreSQL.

```bash
# Quick start (requires PostgreSQL and Node.js 18+)
npm install
cp server/.env.example server/.env
# Configure DATABASE_URL in server/.env
npm run dev
# Open http://localhost:5173
```

---

## Overview

Planning Poker is a collaborative estimation tool designed for agile teams to estimate story points in real-time. Teams can create sessions, add multiple stories, vote simultaneously, and receive AI-powered recommendations for story breakdown when estimates are too large.

### Key Features

- **Real-time Collaboration**: WebSocket-based instant updates across all participants
- **Multi-Story Management**: Queue multiple stories, focus on one at a time
- **Vote Modifiers**: Soft up/down adjustments and question markers
- **AI Story Analysis**: Automatic recommendations to break down complex stories
- **Tracker Integration**: Auto-import titles and descriptions from Jira and Azure DevOps work items, and publish story points back
- **Rich Text Editor**: TipTap-based editor with Markdown/JSON import support
- **Persistent Sessions**: PostgreSQL-backed storage with automatic user reconnection
- **Dark Mode**: System-wide dark theme support
- **Collapsible Stories**: Minimize completed or pending stories for better focus

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **React Router** for navigation
- **TipTap** rich text editor with extensions
- **WebSocket** for real-time communication

### Backend
- **Node.js** with Express
- **WebSocket (ws)** for real-time updates
- **PostgreSQL** with Prisma ORM
- **Axios** for HTTP requests
- **TypeScript** for type safety

### AI Providers (Optional)
- Anthropic Claude (default)
- OpenAI GPT
- AWS Bedrock

### Integrations
- **Jira Cloud API** for ticket import

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (local or cloud instance)
- *(Optional)* AI Provider API key (Anthropic, OpenAI, or AWS)
- *(Optional)* Jira API token for ticket integration

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd planning-poker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   cd server
   cp .env.example .env
   ```

4. **Configure environment variables**

   Edit `server/.env` with your settings:

   ```env
   # Database (REQUIRED)
   DATABASE_URL="postgresql://user:password@localhost:5432/planning_poker"

   # AI Provider (OPTIONAL - defaults to 'none')
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_key_here

   # Jira Integration (OPTIONAL)
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=your_token_here
   JIRA_COMPANY=yourcompany

   # Azure DevOps Integration (OPTIONAL)
   AZURE_DEVOPS_ORG=yourorg
   AZURE_DEVOPS_PAT=your_pat_here
   AZURE_DEVOPS_PROJECT=yourproject
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

6. **Start the application**
   ```bash
   cd ..
   npm run dev
   ```

   The app will be available at:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

---

## Configuration

### Database

The application uses PostgreSQL with Prisma ORM. The schema includes:
- **Sessions**: Planning poker sessions with custom IDs
- **Users**: Participants with reconnection support
- **Stories**: Estimation items with focus management
- **Votes**: Individual user votes with optional modifiers
- **AI Recommendations**: Cached analysis results

### AI Providers

Configure in `server/.env`:

```env
# Anthropic Claude (Recommended)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI GPT
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# AWS Bedrock
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Disable AI
AI_PROVIDER=none
```

See [server/AI_PROVIDER_SETUP.md](server/AI_PROVIDER_SETUP.md) for detailed setup instructions.

### Jira Integration

1. Generate an API token: https://id.atlassian.com/manage-profile/security/api-tokens
2. Configure in `server/.env`:
   ```env
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=ATATT3xFfGF0...
   JIRA_COMPANY=yourcompany
   ```
3. When creating stories, paste a Jira URL and the title/description will auto-populate

### Azure DevOps Integration

1. Create a Personal Access Token with **Work Items: Read & Write** scope: https://dev.azure.com/{org}/_usersSettings/tokens
2. Configure in `server/.env`:
   ```env
   AZURE_DEVOPS_ORG=yourorg
   AZURE_DEVOPS_PAT=your_pat_here
   # Optional: default project when omitted from the URL
   AZURE_DEVOPS_PROJECT=yourproject
   ```
3. Paste a work item URL — `https://dev.azure.com/{org}/{project}/_workitems/edit/{id}` — and the title/description will auto-populate. Story points publish back to the `Microsoft.VSTS.Scheduling.StoryPoints` field.

---

## Features Deep Dive

### Vote Modifiers

- **Soft Up** (⬆): "I'll defer to the majority if they vote higher"
- **Soft Down** (⬇): "I'll defer to the majority if they vote lower"
- **Question** (?): "I have concerns about this story"

Modifiers adjust displayed votes to the consensus (mode) value while preserving original votes in the database.

### AI Story Breakdown

When votes are revealed with an average > 1 and a description exists:
1. AI analyzes the story complexity
2. If deemed too large, provides a breakdown recommendation
3. Suggests smaller sub-stories
4. Results are cached per story

### Story Focus Management

- **Focus**: Brings a story to the top for all users (⭐ badge)
- **Collapse**: Minimizes a story card to save space
- **Past Stories**: Revealed stories move to a separate section when unfocused

### Rich Text Editing

The TipTap editor supports:
- Bold, italic, strikethrough, inline code
- Headings (H1, H2, H3)
- Bullet and numbered lists
- Blockquotes, code blocks, horizontal rules
- Import from Markdown or TipTap JSON format

Content is stored as JSON with backward compatibility for legacy HTML.

### User Reconnection

Users are identified by `(sessionId, userName)`. If a user disconnects and rejoins with the same username:
- Previous votes are preserved
- Story history is maintained
- Session state is restored

---

## Development

### Project Structure

```
planning-poker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.tsx        # Main app component
│   │   ├── Session.tsx    # Session page
│   │   └── useWebSocket.ts # WebSocket hook
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── ai/           # AI provider implementations
│   │   ├── jira/         # Jira integration
│   │   ├── index.ts      # Express + WebSocket server
│   │   ├── sessionManager.ts # Business logic
│   │   └── types.ts      # Shared types
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── package.json
├── package.json           # Root package with workspaces
├── Dockerfile             # Production container
└── README.md              # This file
```

### Running in Development

```bash
# Run both frontend and backend with hot reload
npm run dev

# Or run separately:
npm run dev:server  # Backend on port 3001
npm run dev:client  # Frontend on port 5173
```

### Database Commands

```bash
cd server

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate
```

### Building for Production

```bash
# Build both client and server
npm run build

# Start production server
npm start

# Or use Docker (local build)
docker build -t planning-poker .
docker run -p 3001:3001 -e DATABASE_URL="..." planning-poker

# Or use pre-built images from GitHub Container Registry
docker pull ghcr.io/liatrio/planning-poker:latest
docker run -p 80:80 -e DATABASE_URL="..." ghcr.io/liatrio/planning-poker:latest
```

### Docker Images

Pre-built Docker images are available from GitHub Container Registry:

```bash
docker pull ghcr.io/liatrio/planning-poker:latest
docker pull ghcr.io/liatrio/planning-poker:1.0.0
```

Images are tagged with:
- `latest` - Most recent main build
- `<version>` - Semantic version (e.g., `1.2.3`)
- `<major>.<minor>` - Major + minor version (e.g., `1.2`)
- `<major>` - Major version only (e.g., `1`)
- `main-<sha>` - Git commit SHA

Images are tagged with:
- `latest` - Most recent build from main branch
- `<version>` - Semantic version (e.g., `1.0.0`)
- `<major>.<minor>` - Partial version (e.g., `1.0`)
- `<major>` - Major version only (e.g., `1`)
- `main-<sha>` - Specific commit SHA

---

## API Reference

### REST Endpoints

#### `POST /api/session`
Create a new planning poker session.

**Request Body:**
```json
{
  "sessionId": "optional-custom-id"
}
```

**Response:**
```json
{
  "sessionId": "uuid-or-custom-id"
}
```

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-30T12:00:00.000Z"
}
```

### WebSocket Messages

All messages follow the format:
```typescript
{
  type: MessageType,
  ...payload
}
```

#### Client → Server

- `JOIN`: Join a session
- `CREATE_STORY`: Create a new story
- `EDIT_STORY`: Edit an existing story
- `VOTE`: Submit a vote
- `SET_MODIFIER`: Set vote modifier
- `REVEAL_VOTES`: Reveal votes for a story
- `RESET_VOTES`: Clear votes and reset story
- `SET_FOCUSED_STORY`: Focus on a story
- `UNFOCUS_STORY`: Remove focus

#### Server → Client

- `SESSION_STATE`: Full session state
- `USER_JOINED`: New user joined
- `USER_LEFT`: User disconnected
- `STORY_CREATED`: New story added
- `STORY_UPDATED`: Story edited
- `VOTE_UPDATE`: User voted
- `VOTES_REVEALED`: Votes revealed with results
- `VOTES_RESET`: Votes cleared
- `STORY_FOCUSED`: Story focused
- `STORY_UNFOCUSED`: Focus removed
- `AI_ANALYSIS_STARTED`: AI processing started
- `AI_RECOMMENDATION`: AI results available
- `ERROR`: Error occurred

---

## Deployment

### Environment Variables

Ensure all required environment variables are set:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: (Optional) Server port (default: 3001)
- AI provider credentials (if using AI features)
- Jira credentials (if using Jira integration)

### Docker Deployment

```bash
docker build -t planning-poker .
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e ANTHROPIC_API_KEY="..." \
  planning-poker
```

### Database Migrations

Run migrations before deploying new versions:
```bash
cd server
npx prisma migrate deploy
```

---

## Troubleshooting

### WebSocket Connection Issues

- Check firewall rules allow WebSocket connections
- Ensure `ws://` or `wss://` protocol is used correctly
- Verify CORS settings in `server/src/index.ts`

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check PostgreSQL server is running
- Ensure database exists: `createdb planning_poker`
- Run migrations: `npx prisma migrate deploy`

### AI Provider Errors

- Verify API keys are valid
- Check account has sufficient credits
- Review provider-specific rate limits
- Check logs for detailed error messages

### Jira Import Failures

- Verify Jira credentials are correct
- Ensure Jira URL matches pattern: `https://{JIRA_COMPANY}.atlassian.net/browse/{KEY}`
- Check API token has required permissions
- Review server logs for API error details

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/) based on [Conventional Commits](https://www.conventionalcommits.org/).

Versions are automatically determined from commit messages:
- `feat:` → MINOR version bump (0.1.0)
- `fix:` → PATCH version bump (0.0.1)
- `BREAKING CHANGE:` or `!` → MAJOR version bump (1.0.0)

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Contributing

We welcome contributions! Please follow these guidelines:

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:**
- `feat:` New feature (MINOR version)
- `fix:` Bug fix (PATCH version)
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

**Examples:**
```bash
feat(jira): add automatic ticket import
fix(voting): correct soft up/down calculation
docs: update README with Docker instructions
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit using conventional commits
4. Push to your fork (`git push origin feat/amazing-feature`)
5. Open a Pull Request

For detailed contributing guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For issues, questions, or feature requests, please contact the development team or open an issue in the repository.
