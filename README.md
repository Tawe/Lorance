# Lorance - Project Intelligence Agent

Turn messy project docs into grounded answers and actionable tickets.

---

## Overview

Lorance is an AI-powered project intelligence assistant that reads unstructured project documents (PRDs, meeting notes, emails, chat) and returns grounded answers, decisions, and ticket-ready work items — all scoped to your workspace.

## Features

- **Document Indexing** — Upload and index project documents with metadata
- **Question Answering** — Ask questions grounded in your documents via Algolia Agent Studio
- **Ticket Generation** — Create structured tickets with acceptance criteria, citations, and effort estimates
- **Ticket Validation** — AI-generated tickets are automatically validated and repaired before being surfaced
- **Export** — Push tickets to Linear, Jira, or GitHub Issues
- **Firebase Authentication** — User sign-in with workspace isolation per user
- **Workspace Isolation** — Every doc and ticket is scoped to a `workspace_id`

---

## Two UIs

- **DocumentIntel** (`/`) — Document upload, search, and Q&A with structured answers
- **ArchitectPanel** (`/architect`) — Ticket generation and management with export integrations

---

## Quick Start

### 1. Configure Environment

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env — fill in Algolia + Firebase Admin credentials

# Frontend
cp frontend/.env.local.example frontend/.env.local
# Edit frontend/.env.local — fill in Firebase client SDK credentials
```

### 2. Install Dependencies

```bash
cd backend && npm install
cd frontend && npm install
```

### 3. Enable Pre-commit Hook

```bash
git config core.hooksPath .githooks
```

### 4. Start Development

```bash
# Backend (Terminal 1)
cd backend && npm run dev     # http://localhost:3001

# Frontend (Terminal 2)
cd frontend && npm run dev    # http://localhost:3000
```

Or with Docker:

```bash
docker-compose up
```

---

## Architecture

```
Lorance/
├── backend/                   # Express 5 + ts-node API
│   └── src/
│       ├── index.ts           # Server, Architect panel routes, validation
│       ├── routes/            # DocumentIntel route declarations
│       ├── controllers/       # DocumentIntel route handlers
│       ├── agents/            # DocumentIntelAgent (prompt, parse, validate)
│       ├── ticketValidator.ts # Ticket quality gate (validate + repair)
│       ├── algolia.ts         # AlgoliaService (search, indexing)
│       ├── security.ts        # AlgoliaSecurityService (secured keys, ownership)
│       ├── auth.ts            # FirebaseAuthService (token verification)
│       ├── agent-studio.ts    # AgentStudioService (LLM completions)
│       ├── exports/           # Linear, Jira, GitHub export integrations
│       └── types/             # Server-side TypeScript types
├── frontend/                  # Next.js 16 + React 19 + Tailwind CSS v4
│   └── src/
│       ├── components/        # DocumentIntel, ArchitectPanel, modals, panels
│       ├── services/          # API clients, auth, workspace management
│       └── types/             # Client-side TypeScript types
├── shared/
│   └── types.ts               # Shared types used by frontend and backend
└── .env.example               # Backend environment template
```

**Frontend proxies** `/api/*` to `http://localhost:3001` via Next.js rewrites.

---

## API Endpoints

All endpoints require Firebase auth (`Authorization: Bearer <token>`).

### DocumentIntel (`/api/intel/*`) — also require `X-Workspace-ID` header

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intel/search?q=` | Search documents and tickets |
| POST | `/api/intel/answer` | Generate structured answer via Agent Studio |
| POST | `/api/intel/documents` | Index document chunks |
| PUT | `/api/intel/document` | Update a document |
| DELETE | `/api/intel/document` | Delete a document |
| POST | `/api/intel/tickets` | Index tickets |
| DELETE | `/api/intel/ticket` | Delete a ticket |
| GET | `/api/intel/filters` | Filter options |
| POST | `/api/intel/clear` | Clear workspace |

### Architect Panel

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/docs` | Index a project document |
| GET | `/api/docs` | Get all documents (workspace-scoped) |
| GET | `/api/docs/search?q=` | Search documents |
| POST | `/api/generate-tickets` | Generate tickets via Agent Studio |
| POST | `/api/export/linear` | Export tickets to Linear |
| POST | `/api/export/jira` | Export tickets to Jira |
| POST | `/api/export/github` | Export tickets to GitHub Issues |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (no auth required) |
| GET | `/api/auth/algolia-key` | Get secured Algolia key for client-side search |
| GET | `/api/auth/me` | Get current user info and workspace_id |

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# Required
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_KEY=your_admin_key

# Optional
ALGOLIA_DOCS_INDEX_NAME=lorance_documents
ALGOLIA_TICKETS_INDEX_NAME=lorance_tickets
ALGOLIA_AGENT_ID=your_agent_id        # Enables Agent Studio AI features
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
NODE_ENV=development

# Firebase Admin (choose ONE option)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
# OR inline credentials:
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001

# Firebase client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

---

## Development

```bash
# Type check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Lint
cd frontend && npm run lint

# Production build
cd backend && npm run build
cd frontend && npm run build
```

---

## License

ISC
