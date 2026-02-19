# Lorance - AI Agent Instructions

This file provides guidance to AI assistants (Claude Code, GitHub Copilot, Gemini CLI, Codex/Agents) when working with code in this repository.

## Commands

### Backend (`backend/`)
```bash
npm run dev              # Start with nodemon + ts-node (port 3001)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled version from dist/
npx tsc --noEmit         # Type check only
```

### Frontend (`frontend/`)
```bash
npm run dev              # Next.js dev server with Turbopack (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit         # Type check only
```

### AI Instruction Sync
```bash
npm run ai:sync          # Regenerate all AI instruction files from .ai/INSTRUCTIONS.md
npm run ai:check         # Verify all files are in sync (CI-safe, no writes)
npm run ai:watch         # Auto-sync on source file changes
```

### Docker
```bash
docker-compose up        # Start both services
```

### Setup
```bash
cp .env.example backend/.env                    # Fill in: ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, Firebase credentials
cp frontend/.env.local.example frontend/.env.local  # Fill in Firebase client SDK credentials
git config core.hooksPath .githooks             # Enable pre-commit secret detection + AI sync
cd backend && npm install
cd frontend && npm install
```

No tests are currently configured.

## Architecture

**Lorance** is an AI-powered project intelligence tool that converts unstructured documents (PRDs, meeting notes, emails) into grounded answers and actionable tickets.

- **Frontend**: Next.js 16 App Router (React 19) with Tailwind CSS v4
- **Backend**: Express 5 + ts-node (runtime TypeScript compilation, no build step in dev)
- **Search/Storage**: Algolia (primary data store, not a traditional DB) with two indices: `lorance_documents` and `lorance_tickets`
- **Auth**: Firebase (Admin SDK on backend, client SDK on frontend) — **all routes require auth**
- **LLM**: Algolia Agent Studio for ticket generation and structured Q&A answers

### Two Main UIs
- **DocumentIntel** (`/`) — document upload, search, Q&A with structured answers
- **ArchitectPanel** (`/architect`) — ticket generation and management with export to Linear/Jira/GitHub

### Communication Flow
Frontend proxies `/api/*` to `http://localhost:3001` via Next.js rewrites in `next.config.ts`. Auth tokens sent as `Authorization: Bearer <token>` header. Workspace scoping via `X-Workspace-ID` header.

### Workspace Isolation
Every operation is scoped to a `workspace_id` (default: `user_${uid}`). Backend enforces this on all Algolia queries via `facetFilters: ["workspace_id:${workspaceId}"]`. Frontend derives workspace_id from the authenticated user's profile; falls back to `localStorage` when unauthenticated.

### Key Backend Files
- `src/index.ts` — server setup, Architect panel routes, input validation, error handling
- `src/routes/documentIntel.ts` — DocumentIntel route declarations
- `src/controllers/documentIntel.ts` — DocumentIntel route handlers
- `src/agents/documentIntelAgent.ts` — `DocumentIntelAgent`: builds prompts, calls Agent Studio, parses/validates AI responses
- `src/ticketValidator.ts` — single validation/repair pipeline for all AI-generated tickets (called by both Agent Studio and DocumentIntelAgent)
- `src/algolia.ts` — `AlgoliaService` (search, indexing)
- `src/security.ts` — `AlgoliaSecurityService` (secured key generation, ownership field injection)
- `src/auth.ts` — `FirebaseAuthService` (token verification, `requireAuth` middleware)
- `src/agent-studio.ts` — `AgentStudioService` (LLM ticket generation)
- `src/exports/` — Linear, Jira, GitHub export integrations
- `src/types/express.d.ts` — Express Request augmentation for `req.user`

### Key Frontend Files
- `src/components/DocumentIntel.tsx` — main Q&A UI with multi-panel layout
- `src/components/ArchitectPanel.tsx` — ticket management UI
- `src/services/documentIntelService.ts` — API client for `/api/intel/*` (DocumentIntel panel)
- `src/services/api.ts` — `ApiClient` for Architect panel (`/api/docs`, `/api/generate-tickets`, `/api/export/*`)
- `src/services/authService.ts` — observable auth state management
- `src/services/auth.ts` — `FirebaseAuthService` (client-side token retrieval)
- `src/services/workspaceService.ts` — localStorage workspace_id

### Shared Types
`shared/types.ts` contains shared types used by both frontend and backend. Each side also has its own `src/types/` directory for UI-specific or server-specific types.

### API Endpoints

All routes require Firebase auth (`Authorization: Bearer <token>`).

#### DocumentIntel Panel (`/api/intel/*`) — all require `X-Workspace-ID` header
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intel/search?q=` | Search documents/tickets |
| POST | `/api/intel/answer` | Generate structured answer via DocumentIntelAgent |
| POST | `/api/intel/documents` | Index document chunks |
| PUT | `/api/intel/document` | Update a document |
| DELETE | `/api/intel/document` | Delete a document |
| POST | `/api/intel/tickets` | Index tickets |
| DELETE | `/api/intel/ticket` | Delete a ticket |
| GET | `/api/intel/filters` | Filter options |
| POST | `/api/intel/clear` | Clear workspace |

#### Architect Panel (`/api/docs`, `/api/generate-tickets`, `/api/export/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/docs` | Index a project document |
| GET | `/api/docs` | Get all documents (workspace-scoped) |
| GET | `/api/docs/search?q=` | Search documents |
| POST | `/api/generate-tickets` | Generate tickets via Agent Studio |
| POST | `/api/export/linear` | Export tickets to Linear |
| POST | `/api/export/jira` | Export tickets to Jira |
| POST | `/api/export/github` | Export tickets to GitHub |

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (no auth) |
| GET | `/api/auth/algolia-key` | Secured Algolia key |
| GET | `/api/auth/me` | Current user info |

### Input Validation
- Content length: 10–100,000 characters
- Query length: max 1,000 characters
- Valid doc types: `prd`, `meeting`, `architecture`, `tech_stack`, `requirements`

### Ticket Validation Pipeline
`src/ticketValidator.ts` is the single hard gate for AI-generated ticket quality. It:
1. Validates all required canonical fields (title, type, acceptance_criteria, citations, etc.)
2. Repairs missing fields with safe defaults (never drops keys)
3. Normalizes enums via fuzzy matching
4. Promotes weak tickets to `decision` type when `acceptance_criteria < 2`
5. Enforces grounding: requires ≥1 citation when source documents exist
6. Reduces confidence scores when fields are inferred

## Adding a Backend Route
1. Add route to `src/routes/documentIntel.ts` (DocumentIntel) or `src/index.ts` (Architect panel) with `FirebaseAuthService.requireAuth` middleware
2. Implement handler in `src/controllers/documentIntel.ts` or inline in `src/index.ts`
3. Add input validation in `index.ts` if accepting a new body shape
4. Use `AlgoliaSecurityService.addOwnershipFields(record, req.user)` when writing new Algolia records

## AI Instruction Files

> **Never edit generated files directly** — changes will be overwritten on next sync.
> Edit only `.ai/INSTRUCTIONS.md`, then run `npm run ai:sync`.

The following files are auto-generated from this source:
- `CLAUDE.md` — Claude Code
- `GEMINI.md` — Google Gemini CLI
- `AGENTS.md` — Codex / Agents / Warp
- `.github/copilot-instructions.md` — GitHub Copilot

## Critical Gotchas

### ts-node requires explicit .d.ts inclusion
`ts-node` doesn't auto-include `.d.ts` files. The `"files": ["src/types/express.d.ts"]` entry in `backend/tsconfig.json` is required for `req.user` typing to work. Note: `tsc --noEmit` passing does NOT guarantee ts-node will work.

### Firebase Admin SDK crashes without credentials
Calling `admin.auth()` without configured credentials crashes the process. Always wrap in try/catch with nullable auth and guard all methods.

### Algolia v5 API
- Import: `import { algoliasearch } from 'algoliasearch'` (no named `search` export)
- `generateSecuredApiKey()` is on the client instance, not standalone
- Search result types often need `as unknown as T` casts

### Port conflicts
Next.js Turbopack can spawn `next-server` on port 3001. Always check `lsof -i :3001` before assuming the backend owns that port.

### Pre-commit hook
`.githooks/pre-commit` blocks commits containing secret patterns and auto-syncs AI instruction files. Must run `git config core.hooksPath .githooks` to enable.

### Two separate API clients in the frontend
`documentIntelService.ts` is for the DocumentIntel panel (`/api/intel/*`). `api.ts` (`ApiClient`) is for the Architect panel (`/api/docs`, `/api/generate-tickets`, `/api/export/*`). They handle auth and workspace headers differently — don't conflate them.
