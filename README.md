# Lorance - Project Intelligence Agent

Turn messy project docs into grounded answers and actionable tickets.

---

## Overview

Lorance is an AI-powered project intelligence assistant that reads unstructured project documents (PRDs, meeting notes, emails, chat) and returns grounded answers, decisions, and ticket-ready work items.

## Features

- **Document Indexing** - Upload and index project documents with metadata
- **Question Answering** - Ask questions grounded in your documents
- **Ticket Generation** - Create structured tickets with acceptance criteria
- **Editing** - Edit documents and tickets in-place
- **Workspace Isolation** - Each doc/ticket is scoped to a user workspace

---

## Quick Start

### 1. Configure Environment

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your Algolia + Firebase credentials

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

## Architecture

```
Lorance/
├── backend/           # Express + TypeScript API
│   └── src/
│       ├── index.ts   # Server, routes, validation
│       ├── algolia.ts # Algolia service (v5 API)
│       └── agents/    # Agent Studio prompt + parsing
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
| GET | `/api/intel/search?q=` | Search documents/tickets |
| POST | `/api/intel/answer` | Generate structured answer |
| POST | `/api/intel/documents` | Index document chunks |
| PUT | `/api/intel/document` | Update a document |
| DELETE | `/api/intel/document` | Delete a document |
| POST | `/api/intel/tickets` | Index tickets |
| DELETE | `/api/intel/ticket` | Delete a ticket |
| GET | `/api/intel/filters` | Filter options |
| GET | `/api/auth/algolia-key` | Secured Algolia key (auth) |

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# Required
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_KEY=your_admin_key
ALGOLIA_SEARCH_KEY=your_search_only_key
ALGOLIA_AGENT_ID=your_agent_id

# Optional
ALGOLIA_DOCS_INDEX_NAME=lorance_documents
ALGOLIA_TICKETS_INDEX_NAME=lorance_tickets
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
NODE_ENV=development

# Firebase Admin (choose ONE option)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
# OR
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Security

- CORS restricted to configured origins
- Input validation on all endpoints
- Content length limits
- Query length limits
- Environment validation on startup
- Workspace isolation via `workspace_id` (scopes docs/tickets)

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
