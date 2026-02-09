# Lorance - Action Clarity Agent

Turn messy conversations into clear next steps.

---

## Overview

Lorance is an AI-powered agent that extracts actionable work items from unstructured text like meeting notes, emails, and chat conversations. It helps teams answer: "What do I actually need to do?"

## Features

- **Document Indexing** - Add meeting notes, emails, chats with metadata
- **Action Extraction** - Identifies explicit and implied actions
- **Confidence Scoring** - Visual indicators for action reliability
- **Owner Inference** - Suggests who should own each action
- **Source Citation** - Every action references its source material

---

## Quick Start

### 1. Configure Environment

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your Algolia credentials

# Frontend
cp .env.example frontend/.env.local
# Edit frontend/.env.local with your API URL
```

### 2. Install Dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### 3. Start Development

```bash
# Start backend (Terminal 1)
cd backend && npm run dev

# Start frontend (Terminal 2)
cd frontend && npm run dev
```

### 4. Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

## Demo Data

Use the `demo-data.md` file to test the system:

1. Open the frontend and click **Add document**
2. Select a source type (Meeting Notes, Email, Chat, Ticket)
3. Paste content from `demo-data.md`
4. Click **Index Document**
5. Search with queries like "what needs to be done"

---

## Architecture

```
Lorance/
├── backend/           # Express + TypeScript API
│   └── src/
│       ├── index.ts   # Server, routes, validation
│       ├── algolia.ts # Algolia service (v5 API)
│       └── agent.ts   # Action extraction logic
├── frontend/          # Next.js 16 + TypeScript
│   └── src/
│       ├── components/  # React components
│       ├── services/    # API client
│       └── types/       # TypeScript interfaces
└── .env.example       # Environment template
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/documents` | Index a new document |
| POST | `/api/extract-actions` | Extract actions from indexed docs |
| GET | `/api/documents/search?q=` | Search indexed documents |

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# Required
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_KEY=your_admin_key

# Optional
ALGOLIA_INDEX_NAME=lorance_actions  # defaults to lorance_actions
PORT=3001                            # defaults to 3001
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Action Types

| Type | Description | Example |
|------|-------------|---------|
| **Explicit** | Clearly stated tasks | "I will update the docs" |
| **Implied** | Inferred obligations | "We need better filtering" |

---

## Security

- CORS restricted to configured origins
- Input validation on all endpoints
- Content length limits (50KB max)
- Query length limits (500 chars)
- Cryptographically secure document IDs
- Environment validation on startup

---

## Challenge Compliance

See `CHALLENGE_CHECKLIST.md` for detailed steps to meet the Algolia Agent Studio Challenge requirements.

**Current Status:**
- Algolia Search Integration
- Custom Action Extraction Agent
- Input Validation & Security Hardening

**Remaining:**
- Agent Studio Integration
- Deployment
- Challenge Submission

---

## Development

### Type Checking

```bash
# Backend
cd backend && npx tsc --noEmit

# Frontend
cd frontend && npx tsc --noEmit
```

### Building for Production

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

---

## License

ISC
