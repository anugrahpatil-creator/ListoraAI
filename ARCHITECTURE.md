# Business Listing Consistency Agent: Architecture Document

> **Scope:** End-to-end system design covering data flow, component responsibilities, the complete monorepo directory structure, and per-module breakdowns for every layer of the stack.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Flow Architecture](#2-data-flow-architecture)
3. [Full Directory Structure](#3-full-directory-structure)
4. [Module Breakdowns](#4-module-breakdowns)
   - 4.1 [Backend: Express API](#41-backend-express-api)
   - 4.2 [AI Agent Layer](#42-ai-agent-layer)
   - 4.3 [Normalization and Detection](#43-normalization-and-detection)
   - 4.4 [Mock Listing Platforms](#44-mock-listing-platforms)
   - 4.5 [Frontend: React on Vercel](#45-frontend-react-on-vercel)
   - 4.6 [Database Layer](#46-database-layer)
   - 4.7 [Auth and Permissions](#47-auth-and-permissions)
   - 4.8 [Background Jobs](#48-background-jobs)
5. [Inter-Service Communication](#5-inter-service-communication)
6. [Security Architecture](#6-security-architecture)
7. [Deployment Architecture](#7-deployment-architecture)

---

## 1. System Overview

The Business Listing Consistency Agent is a **monorepo** with three deployable apps and one shared package:

| Domain | Stack | Hosting | Responsibility |
|---|---|---|---|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, TanStack Query | Vercel | Owner dashboard: profile editor, mismatch review, approvals, simulator, reports, audit log, alerts |
| **Backend API** | Node.js 20, Express, TypeScript, Prisma, Zod | Render (Web Service) | REST endpoints, business logic, agent orchestration, scheduled re-checks |
| **Mock Platforms** | Express, TypeScript, seeded JSON | Render (Web Service) | Simulated listing sites with their own permission rules |
| **Shared Package** | TypeScript, Zod | Built into api and web | Shared types, schemas, and status constants |

Supporting services:
- **PostgreSQL** (Render Managed PostgreSQL) stores profiles, listings, mismatches, proposals, update results, verifications, and the audit log.
- **Claude API** (Anthropic SDK) powers the conflict investigator, holiday reasoning, and correction proposals through tool use.
- **Render Cron Job** runs scheduled re-checks.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                               OWNER (Browser)                                 │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │  HTTPS (REST, cookie auth)
┌───────────────────────────────────────▼──────────────────────────────────────┐
│                     FRONTEND · Vercel                                         │
│        React · TypeScript · Vite · Tailwind · TanStack Query                  │
│        Pages: Profile · Dashboard · Approvals · Simulator · Report · Audit    │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │  HTTPS REST (VITE_API_BASE_URL)
┌───────────────────────────────────────▼──────────────────────────────────────┐
│                     BACKEND API · Render (Web Service)                        │
│        Express · TypeScript · Zod validation · Auth middleware · CORS         │
│                                                                              │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│   │  Profile &  │  │  Mismatch &  │  │  Proposal &  │  │  Score, Audit,  │   │
│   │  Listings   │  │  Normalize   │  │  Approval    │  │  Alerts         │   │
│   │  Services   │  │  Services    │  │  Services    │  │  Services       │   │
│   └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│          └────────────────┴─────────┬───────┴───────────────────┘            │
│                                     │                                        │
│                     ┌───────────────▼────────────────┐                       │
│                     │      AI Agent Layer            │                       │
│                     │  Claude API · Tool use ·       │                       │
│                     │  Guardrails · Structured output│                       │
│                     └───────────────┬────────────────┘                       │
│                                     │                                        │
│   ┌─────────────────────────────────┴───────────────────────────────┐        │
│   │  Background Jobs (Render Cron): scheduled re-checks             │        │
│   └─────────────────────────────────────────────────────────────────┘        │
└───────┬──────────────────────────────────────────────────┬───────────────────┘
        │ Prisma (TCP)                                     │ HTTP (fetch / PATCH)
┌───────▼──────────────────────────┐        ┌──────────────▼───────────────────┐
│  PostgreSQL · Render Managed     │        │  MOCK PLATFORMS · Render          │
│  profiles · listings · mismatches│        │  mock-maps-a (read-write)         │
│  proposals · updates · audit     │        │  mock-maps-b (read-only)          │
└──────────────────────────────────┘        │  mock-directory-c (holiday block) │
                                            └──────────────────────────────────┘
```

---

## 2. Data Flow Architecture

```
Step 1: PROFILE
  Owner saves approved profile (name, address, phone, regular hours, holiday hours)
    ──► Zod validation ──► profile.service ──► BusinessProfile (PostgreSQL)
    ──► audit.service records the change

Step 2: LISTING COLLECTION
  listing.service ──► mockPlatform.client ──► GET /listing/:id on each platform
    ──► raw payload stored in Listing (platform, listing_id, fetched_at, values)

Step 3: NORMALIZATION AND DETECTION
  Approved profile + stored listing values
    ──► phone.ts (E.164 normalization)
    ──► text.ts (case, spacing, punctuation, abbreviation normalization)
    ──► hours.ts (regular and holiday hours comparison)
    ──► mismatch.service ──► Mismatch records (missing | outdated | conflicting | ok)
    ──► Conflicts with no clear source are marked "needs review", never auto-resolved

Step 4: AI INVESTIGATION
  agent.ts receives open mismatches
    ──► tool: getProfile, fetchListing, compareFields
    ──► conflict investigator explains why each mismatch matters
    ──► holiday agent checks temporary closures and special schedules
    ──► proposeUpdate creates Proposal records (status: pending_approval)
    ──► Structured JSON output validated with Zod before saving

Step 5: OWNER APPROVAL
  Frontend Approvals page lists Proposals
    ──► What-if simulator previews the change on each affected listing
    ──► Owner approves or rejects
    ──► Approved proposals are the only input allowed to reach Step 6

Step 6: UPDATE
  update.service checks: proposal approved? platform permits update? listing not blocked?
    ──► PATCH /listing/:id on permitted mock platforms
    ──► UpdateResult stored (success | failed | blocked)

Step 7: VERIFICATION
  verify.service reloads each updated listing via GET /listing/:id
    ──► Compares re-read value with approved value
    ──► Verification stored (verified | pending | failed)
    ──► Status becomes "verified" only after a successful re-check

Step 8: REPORTING
  Frontend Report page: before-and-after values, statuses, consistency score
    ──► score.service: matching eligible fields / total eligible fields × 100
  Audit page: full change history
  Alerts page: unresolved mismatches, pending approvals, blocked listings, failed updates
```

---

## 3. Full Directory Structure

```
business-listing-consistency-agent/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                         # Lint, test, build on pull requests
│   │   └── deploy-check.yml               # Verifies build output before deployment
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── apps/
│   │
│   ├── web/                               # Frontend (Vercel, root: apps/web)
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   └── robots.txt
│   │   ├── src/
│   │   │   ├── main.tsx                   # App entry point
│   │   │   ├── App.tsx                    # Root component and router
│   │   │   ├── routes/
│   │   │   │   ├── ProfilePage.tsx        # Approved business profile editor
│   │   │   │   ├── DashboardPage.tsx      # Listing comparison dashboard
│   │   │   │   ├── ApprovalsPage.tsx      # Approval queue
│   │   │   │   ├── SimulatorPage.tsx      # What-if correction simulator
│   │   │   │   ├── ReportPage.tsx         # Before-and-after report
│   │   │   │   ├── ScorePage.tsx          # Consistency score
│   │   │   │   ├── AuditPage.tsx          # Change history and audit log
│   │   │   │   ├── AlertsPage.tsx         # Smart alerts and reminders
│   │   │   │   └── LoginPage.tsx          # Owner login
│   │   │   ├── components/
│   │   │   │   ├── ui/                    # Primitives: Button, Badge, Card, Modal
│   │   │   │   ├── layout/                # Header, Sidebar, PageShell
│   │   │   │   ├── mismatch/              # MismatchCard, ConflictExplanation
│   │   │   │   ├── proposal/              # ProposalRow, ApproveButton, DiffView
│   │   │   │   └── status/                # StatusBadge (verified, pending, failed, blocked)
│   │   │   ├── features/
│   │   │   │   ├── holidays/              # Holiday and temporary-hours UI logic
│   │   │   │   ├── simulator/             # What-if preview logic
│   │   │   │   └── scoring/               # Score display and breakdown
│   │   │   ├── hooks/                     # Shared React hooks
│   │   │   ├── lib/
│   │   │   │   ├── api.ts                 # API client (VITE_API_BASE_URL, credentials)
│   │   │   │   ├── queryClient.ts         # TanStack Query setup
│   │   │   │   └── format.ts              # Date, time, phone display helpers
│   │   │   ├── styles/
│   │   │   │   └── index.css              # Tailwind entry and global styles
│   │   │   └── vite-env.d.ts
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── postcss.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── vercel.json                    # SPA rewrites for deep links
│   │   └── vite.config.ts
│   │
│   ├── api/                               # Backend (Render, root: apps/api)
│   │   ├── prisma/
│   │   │   ├── schema.prisma              # Data models
│   │   │   ├── migrations/                # Migration history
│   │   │   └── seed.ts                    # Sample business and listing data
│   │   ├── src/
│   │   │   ├── server.ts                  # Starts the HTTP server
│   │   │   ├── app.ts                     # Express setup, middleware, routes
│   │   │   ├── config/
│   │   │   │   ├── env.ts                 # Validated environment variables (Zod)
│   │   │   │   └── cors.ts                # CORS allow-list from CORS_ORIGINS
│   │   │   ├── routes/
│   │   │   │   ├── health.routes.ts       # GET /health
│   │   │   │   ├── auth.routes.ts         # POST /auth/login, /auth/logout, GET /auth/me
│   │   │   │   ├── profile.routes.ts      # /profile
│   │   │   │   ├── listings.routes.ts     # /listings
│   │   │   │   ├── mismatches.routes.ts   # /mismatches
│   │   │   │   ├── proposals.routes.ts    # /proposals (create, approve, reject)
│   │   │   │   ├── updates.routes.ts      # /updates
│   │   │   │   ├── verify.routes.ts       # /verify
│   │   │   │   ├── score.routes.ts        # /score
│   │   │   │   ├── audit.routes.ts        # /audit
│   │   │   │   └── alerts.routes.ts       # /alerts
│   │   │   ├── controllers/               # Request handling, one per route file
│   │   │   ├── services/
│   │   │   │   ├── profile.service.ts
│   │   │   │   ├── listing.service.ts     # Fetches listings from mock platforms
│   │   │   │   ├── mismatch.service.ts    # Detection rules
│   │   │   │   ├── proposal.service.ts    # Creates and approves proposals
│   │   │   │   ├── update.service.ts      # Applies approved changes
│   │   │   │   ├── verify.service.ts      # Re-checks and confirms updates
│   │   │   │   ├── score.service.ts       # Consistency score calculation
│   │   │   │   ├── audit.service.ts       # Writes audit log entries
│   │   │   │   └── alert.service.ts       # Builds alerts and reminders
│   │   │   ├── agent/
│   │   │   │   ├── agent.ts               # Agent loop and orchestration
│   │   │   │   ├── tools/
│   │   │   │   │   ├── getProfile.ts
│   │   │   │   │   ├── fetchListing.ts
│   │   │   │   │   ├── compareFields.ts
│   │   │   │   │   ├── proposeUpdate.ts
│   │   │   │   │   ├── applyUpdate.ts
│   │   │   │   │   └── verifyListing.ts
│   │   │   │   ├── prompts/               # Versioned system and task prompts
│   │   │   │   ├── schemas/               # JSON output schemas
│   │   │   │   └── guardrails.ts          # Approval and conflict rules
│   │   │   ├── features/
│   │   │   │   ├── investigator/          # AI listing conflict investigator
│   │   │   │   ├── holidays/              # Holiday and temporary-hours agent
│   │   │   │   └── simulator/             # What-if correction simulator
│   │   │   ├── normalization/
│   │   │   │   ├── phone.ts               # libphonenumber-js wrapper
│   │   │   │   ├── text.ts                # Text normalization
│   │   │   │   └── hours.ts               # Opening-hours comparison
│   │   │   ├── clients/
│   │   │   │   ├── anthropic.client.ts    # Claude API client
│   │   │   │   └── mockPlatform.client.ts # HTTP client for mock platforms
│   │   │   ├── jobs/
│   │   │   │   └── scheduledRecheck.ts    # Cron entry point
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts                # Owner-only route protection
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── validate.ts            # Zod request validation
│   │   │   ├── db/
│   │   │   │   └── prisma.ts              # Prisma client singleton
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   └── dates.ts
│   │   │   └── types/
│   │   │       └── express.d.ts
│   │   ├── test/
│   │   │   ├── unit/                      # Normalization, scoring, mismatch rules
│   │   │   ├── api/                       # Supertest route tests
│   │   │   └── fixtures/                  # Sample profiles and listing payloads
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── e2e/                               # Playwright end-to-end demo flow tests
│   │   ├── demo-flow.spec.ts
│   │   └── playwright.config.ts
│   │
│   └── mock-platforms/                    # Mock listing sites (Render, root: apps/mock-platforms)
│       ├── src/
│       │   ├── server.ts                  # Starts all mock platforms
│       │   ├── platforms/
│       │   │   ├── mockMapsA/
│       │   │   │   ├── index.ts           # Read-write platform
│       │   │   │   ├── permissions.ts
│       │   │   │   └── data.json
│       │   │   ├── mockMapsB/
│       │   │   │   ├── index.ts           # Read-only platform
│       │   │   │   ├── permissions.ts
│       │   │   │   └── data.json
│       │   │   └── mockDirectoryC/
│       │   │       ├── index.ts           # Blocks updates during holiday hours
│       │   │       ├── permissions.ts
│       │   │       └── data.json
│       │   └── shared/
│       │       ├── routes.ts              # GET and PATCH /listing/:id
│       │       └── store.ts               # In-memory state, reset on restart
│       ├── .env.example
│       ├── package.json
│       └── t   sconfig.json
│
├── packages/
│   └── shared/                            # Code shared by web and api (@bizlisting/shared)
│       ├── src/
│       │   ├── index.ts
│       │   ├── types/
│       │   │   ├── profile.ts
│       │   │   ├── listing.ts
│       │   │   ├── mismatch.ts
│       │   │   ├── proposal.ts
│       │   │   └── audit.ts
│       │   ├── schemas/                   # Zod schemas used by api and web
│       │   └── constants/
│       │       └── statuses.ts            # verified, pending, failed, blocked
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── architecture.md                    # This document
│   ├── api.md                             # Endpoint reference
│   ├── agent-design.md                    # Tools, guardrails, prompts
│   └── demo-script.md                     # Step-by-step demo guide
│
├── scripts/
│   ├── setup.sh                           # First-time local setup
│   └── check-env.ts                       # Validates required env variables
│
├── .gitignore
├── .editorconfig
├── .prettierrc
├── .eslintrc.cjs
├── package.json                           # Root workspace config
├── tsconfig.base.json
├── LICENSE
├── README.md
├── CONTRIBUTING.md
└── ARCHITECTURE.md                        # This file
```

---

## 4. Module Breakdowns

### 4.1 Backend: Express API

**Entry point: `apps/api/src/app.ts`**

Responsibilities:
- Creates the Express app and applies JSON parsing, CORS (from `config/cors.ts`), cookie parsing, and the error handler.
- Registers routers under `/api/v1/` (except `/health` and `/auth`).
- Starts the HTTP server from `server.ts`, which reads and validates env variables first.

```
app.ts
 ├─ app.use(cors(corsOptions))           // CORS_ORIGINS allow-list, credentials: true
 ├─ app.use(express.json())
 ├─ app.use(cookieParser())
 ├─ app.use("/health", healthRouter)
 ├─ app.use("/auth", authRouter)
 ├─ app.use("/api/v1/profile",   requireAuth, profileRouter)
 ├─ app.use("/api/v1/listings",  requireAuth, listingsRouter)
 ├─ app.use("/api/v1/mismatches",requireAuth, mismatchesRouter)
 ├─ app.use("/api/v1/proposals", requireAuth, proposalsRouter)
 ├─ app.use("/api/v1/updates",   requireAuth, updatesRouter)
 ├─ app.use("/api/v1/verify",    requireAuth, verifyRouter)
 ├─ app.use("/api/v1/score",     requireAuth, scoreRouter)
 ├─ app.use("/api/v1/audit",     requireAuth, auditRouter)
 ├─ app.use("/api/v1/alerts",    requireAuth, alertsRouter)
 ├─ app.use("/api/v1/platforms", requireAuth, platformRouter)
 ├─ app.use("/api/v1/reputation",reputationRouter)
 ├─ app.use("/api/v1/ratings",   ratingsRouter)
 └─ app.use(errorHandler)
```

**Key routes**

| Route file | Endpoints | Notes |
|---|---|---|
| `auth.routes.ts` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Sets the session cookie (see 4.7) |
| `ratings.routes.ts` | `GET /ratings`, `POST /ratings`, `GET /ratings/publicity` | Public reviews, live score delta impact, and owner publicity kit |
| `reputation.routes.ts` | `GET /reputation/summary`, `GET /reputation/reviews`, `POST /reputation/respond` | Cross-platform sentiment monitoring & AI response drafts |
| `platform.routes.ts` | `GET /platforms`, `POST /platforms/connect`, `POST /platforms/sync` | Platform connection status and direct integrations |
| `profile.routes.ts` | `GET /profile`, `PUT /profile` | Every write is audited |
| `listings.routes.ts` | `GET /listings`, `POST /listings/refresh` | Refresh fetches from mock platforms |
| `mismatches.routes.ts` | `GET /mismatches`, `GET /mismatches/:id` | Includes AI explanation when available |
| `proposals.routes.ts` | `GET /proposals`, `POST /proposals/:id/approve`, `POST /proposals/:id/reject` | Approval is the only path to updates |
| `updates.routes.ts` | `POST /updates` | Applies approved proposals only |
| `verify.routes.ts` | `POST /verify` | Re-checks listings and sets verification status |
| `score.routes.ts` | `GET /score` | Returns score and the calculation breakdown |
| `audit.routes.ts` | `GET /audit` | Paginated, filterable history |
| `alerts.routes.ts` | `GET /alerts` | Unresolved mismatches, pending approvals, blocked, failed |

**Route handler pattern (every route follows this)**

```
route  →  validate (Zod)  →  controller  →  service  →  Prisma / agent / mock client
                                             │
                                             └─ audit.service.record(...) on any write
```

**Environment variables (validated in `config/env.ts`)**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `CORS_ORIGINS` | Allowed frontend origins (Vercel production and preview domains) |
| `SESSION_SECRET` | Signs session tokens |
| `OWNER_EMAIL` / `OWNER_PASSWORD_HASH` | Single-owner login for the prototype |
| `MOCK_PLATFORM_URLS` | Base URLs for the mock platforms |
| `NODE_ENV` | Environment mode |

---

### 4.2 AI Agent Layer

The agent lives in `apps/api/src/agent/`. It is an orchestrator. It calls defined tools, and every write goes through a service that checks approval.

**Agent loop (`agent.ts`)**

```
runAgent(task)
  1. Build context: approved profile + open mismatches (from DB)
  2. Send to Claude with tool definitions and the system prompt
  3. While Claude requests tools:
       execute tool → validate input with Zod → return result to Claude
  4. Parse final structured output with the JSON schema (Zod)
  5. Save explanations and proposals; never save an update here
  6. Record every tool call in the audit log
```

**Tools (`agent/tools/`)**

| Tool | Purpose | Writes? |
|---|---|---|
| `getProfile` | Reads the approved profile | No |
| `fetchListing` | Reads a listing from a mock platform | No |
| `compareFields` | Runs the normalization and comparison for one field | No |
| `proposeUpdate` | Creates a Proposal with status `pending_approval` | Proposal only |
| `applyUpdate` | Calls update.service; refuses unless the proposal is approved | Listing (guarded) |
| `verifyListing` | Re-reads a listing and compares with the approved value | No |

**Models**
- A faster Claude model (for example, Claude Haiku) handles routine field comparison and explanations.
- A stronger model (for example, Claude Sonnet) handles conflict investigation and holiday reasoning.

**Guardrails (`guardrails.ts`)**

```
Rule 1: No listing write without an approved Proposal.
Rule 2: When two sources disagree and the profile does not decide it, mark "needs review". Never pick a value.
Rule 3: A listing may be marked "verified" only after verifyListing confirms the applied value.
Rule 4: Never bypass a platform permission. Blocked listings stay blocked.
Rule 5: Agent output that fails schema validation is discarded and retried once, then flagged.
```

**Prompts (`agent/prompts/`)**
- Each prompt file has a version number in its header. Changing a prompt means bumping the version, so audit records can show which prompt produced a result.

---

### 4.3 Normalization and Detection

These pure functions are the most heavily tested part of the backend.

| File | Responsibility | Example |
|---|---|---|
| `phone.ts` | Parses to E.164 with libphonenumber-js | `(555) 010-2234` and `+1 555 010 2234` match |
| `text.ts` | Lowercases, trims, collapses spaces, normalizes common abbreviations | `St.` and `Street` match |
| `hours.ts` | Compares regular and holiday hours as structured time ranges | `9:00 AM` and `09:00` match |

**`mismatch.service.ts` classification**

```
for each eligible field (name, address, phone, regular hours, holiday hours):
  if listing value is empty            → MISSING
  if normalized values are equal       → OK
  if listing is older than profile update → OUTDATED
  if values differ and profile is the source of truth → CONFLICTING
  if values differ and no clear source → NEEDS_REVIEW (no auto-fix)
```

Only fields that exist on a listing count toward the consistency score. Unsupported fields are excluded from both the numerator and the denominator, and the report says so.

---

### 4.4 Mock Listing Platforms

`apps/mock-platforms/` runs three small Express apps in one service. Each has its own seeded data and permission rules, so the demo covers every status.

| Platform | Permission | Demo purpose |
|---|---|---|
| `mockMapsA` | Full read and write | Shows the verified path |
| `mockMapsB` | Read only | Shows `blocked` for every update |
| `mockDirectoryC` | Blocks updates on holiday dates | Shows `blocked` by schedule and the holiday agent |

**Endpoints (same shape on every platform)**

```
GET   /listing/:id    → returns the listing's current values
PATCH /listing/:id    → updates permitted fields, or returns 403 with a reason
```

**Store behavior:** `store.ts` keeps state in memory and resets on restart. For the demo, the seed data is reloaded on startup so every run starts from the same state.

---

### 4.5 Frontend: React on Vercel

**Pages (`apps/web/src/routes/`)**

| Page | Shows | Data source |
|---|---|---|
| `ProfilePage` | Approved profile editor | `GET/PUT /profile` |
| `DashboardPage` | Listing comparison across platforms | `GET /listings` |
| `ApprovalsPage` | Pending proposals with approve and reject | `GET /proposals` |
| `SimulatorPage` | What-if preview for a proposal | `GET /proposals/:id` plus local preview |
| `ReportPage` | Before-and-after values and statuses | `GET /updates`, `GET /verify` |
| `ScorePage` | Consistency score and calculation | `GET /score` |
| `AuditPage` | Change history | `GET /audit` |
| `AlertsPage` | Unresolved issues | `GET /alerts` |
| `LoginPage` | Owner login | `POST /auth/login` |

**Status display**

`StatusBadge` takes one of four values from `@bizlisting/shared`: `verified`, `pending`, `failed`, `blocked`. The UI never displays a status the backend did not return.

**API client (`lib/api.ts`)**

```ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,   // sends the session cookie to the Render backend
});
```

**Routing on Vercel:** `vercel.json` rewrites all paths to `index.html` so deep links such as `/approvals` load correctly.

---

### 4.6 Database Layer

**Engine:** PostgreSQL on Render (Managed). Prisma is the ORM. Schema changes go through `prisma migrate`.

**Core models**

```prisma
model BusinessProfile {
  id           String   @id @default(uuid())
  name         String
  address      String
  phone        String           // stored as E.164
  regularHours Json
  holidayHours Json
  updatedAt    DateTime @updatedAt
}

model Listing {
  id          String   @id @default(uuid())
  platform    String
  externalId  String
  values      Json
  fetchedAt   DateTime
  @@unique([platform, externalId])
}

model Mismatch {
  id          String   @id @default(uuid())
  listingId   String
  field       String
  profileValue Json
  listingValue Json?
  kind        MismatchKind      // MISSING | OUTDATED | CONFLICTING | NEEDS_REVIEW
  explanation String?
  createdAt   DateTime @default(now())
}

model Proposal {
  id            String         @id @default(uuid())
  mismatchId    String
  platform      String
  field         String
  oldValue      Json?
  newValue      Json
  status        ProposalStatus // PENDING_APPROVAL | APPROVED | REJECTED
  approvedAt    DateTime?
  approvedBy    String?
  createdAt     DateTime       @default(now())
}

model UpdateResult {
  id          String       @id @default(uuid())
  proposalId  String
  outcome     UpdateOutcome // SUCCESS | FAILED | BLOCKED
  response    Json?
  createdAt   DateTime     @default(now())
}

model Verification {
  id           String             @id @default(uuid())
  proposalId   String
  observedValue Json?
  status       VerificationStatus // VERIFIED | PENDING | FAILED | BLOCKED
  checkedAt    DateTime           @default(now())
}

model AuditLog {
  id        String   @id @default(uuid())
  eventType String
  actor     String           // "owner" or "agent"
  payload   Json
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

**Relationships:** `Mismatch` → `Proposal` → `UpdateResult` and `Verification`. Following one chain shows the full history of a single correction.

**Indexes:** `AuditLog.createdAt` for the audit page, and `Listing(platform, externalId)` for lookups.

---

### 4.7 Auth and Permissions

The prototype has one owner account. Multi-user roles are listed as a future step.

**Flow**

```
Owner → POST /auth/login (email + password)
      → Backend checks the password against OWNER_PASSWORD_HASH (bcrypt)
      → Issues a signed session token (JWT, 8-hour expiry)
      → Sets it as an HttpOnly, Secure cookie with SameSite=None
      → Frontend sends requests with credentials: "include"

Protected route:
      → requireAuth middleware verifies the token
      → 401 if missing or invalid
```

**Cross-domain cookie note:** The frontend (Vercel) and backend (Render) are on different domains, so the cookie must use `SameSite=None; Secure`. Both sides must use HTTPS. The CORS allow-list must list the exact Vercel origin, not a wildcard, because credentialed requests do not accept `*`.

**Owner-only actions:** every route in section 4.1 requires login. There is no read-only public view.

---

### 4.8 Background Jobs

**Scheduled re-check** (`jobs/scheduledRecheck.ts`)

```
Render Cron Job (for example, every 6 hours):
  1. Re-fetch all listings from mock platforms
  2. Re-run mismatch detection
  3. Update alert status (new, resolved, still open)
  4. Mark any proposal whose listing changed outside the app as "needs review"
```

The cron job calls the same services as the API, so it does not duplicate logic. It runs as a separate Render service with the same environment variables.

---

## 5. Inter-Service Communication

| Path | Protocol | Direction | Payload |
|---|---|---|---|
| Frontend → Backend | HTTPS REST with cookies | Request and response | JSON |
| Backend → Mock platforms | HTTPS REST | Outbound | `GET` and `PATCH /listing/:id` |
| Backend → Claude API | HTTPS | Outbound | Messages with tool definitions |
| Backend → PostgreSQL | TCP (Prisma) | Read and write | SQL |
| Render Cron → Backend | Shared code and DB | Internal | None (runs the job directly) |

No WebSockets are used. Owners refresh the page or use the "Refresh" button to pull new data. Live streaming can be added later if needed.

---

## 6. Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Security Layers                        │
│                                                          │
│  1. Transport    → HTTPS on Vercel and Render (managed)  │
│                                                          │
│  2. Auth         → Single owner login                    │
│                    Signed session token, 8-hour expiry   │
│                    HttpOnly · Secure · SameSite=None     │
│                                                          │
│  3. CORS         → Explicit allow-list (no wildcard)     │
│                    credentials: true                     │
│                                                          │
│  4. Write        → Every listing write needs an approved │
│     Control        Proposal (enforced in update.service) │
│                                                          │
│  5. Validation   → Zod on all request bodies, params,    │
│                    and LLM output before it is saved     │
│                                                          │
│  6. Permissions  → Platform rules respected; blocked     │
│                    listings are never written to         │
│                                                          │
│  7. Audit        → Every write and agent action logged   │
│                                                          │
│  8. Secrets      → Env vars only; .env files gitignored  │
│                    Rotate ANTHROPIC_API_KEY if exposed   │
└──────────────────────────────────────────────────────────┘
```

**Prompt safety:** Listing content comes from external sites, so it is treated as data, not instructions. Before listing text goes to Claude, it is wrapped in a labeled data block, and the system prompt tells the agent to ignore instructions found inside it.

---

## 7. Deployment Architecture

**Local development**

```
npm run dev (from the repository root)
  → Vite dev server      http://localhost:5173   (apps/web)
  → Express API          http://localhost:4000   (apps/api, tsx watch)
  → Mock platforms       http://localhost:4100   (apps/mock-platforms)
  → PostgreSQL           local instance or Docker container
```

Docker is optional for local PostgreSQL only, for example:

```bash
docker run --name bizlisting-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:15
```

**Production (hackathon demo)**

```
┌────────────────────┐         ┌─────────────────────────────┐
│  Vercel            │  HTTPS  │  Render: Web Service        │
│  apps/web          │────────►│  apps/api                   │
│  (static Vite app) │         │  Express + Prisma + agent   │
└────────────────────┘         └──────┬──────────────┬───────┘
                                      │              │
                       ┌──────────────▼──┐    ┌──────▼──────────────┐
                       │ Render: Managed │    │ Render: Web Service │
                       │ PostgreSQL      │    │ apps/mock-platforms │
                       └─────────────────┘    └─────────────────────┘
                                      │
                       ┌──────────────▼──────────────┐
                       │ Render: Cron Job            │
                       │ jobs/scheduledRecheck.ts    │
                       └─────────────────────────────┘
```

**Service settings**

| Service | Platform | Root directory | Build | Start |
|---|---|---|---|---|
| Frontend | Vercel | `apps/web` | `vite build` | Static |
| API | Render Web Service | `apps/api` | `npm install && npx prisma migrate deploy && npm run build` | `npm start` |
| Mock platforms | Render Web Service | `apps/mock-platforms` | `npm install && npm run build` | `npm start` |
| Re-check job | Render Cron Job | `apps/api` | Same as API | `npm run job:recheck` |
| Database | Render Managed PostgreSQL | n/a | n/a | n/a |

**Environment configuration**

| Where | Variables |
|---|---|
| Vercel | `VITE_API_BASE_URL` (Render API URL) |
| Render API | `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CORS_ORIGINS`, `SESSION_SECRET`, `OWNER_EMAIL`, `OWNER_PASSWORD_HASH`, `MOCK_PLATFORM_URLS`, `NODE_ENV` |
| Render Mock platforms | `NODE_ENV` |
| Render Cron Job | Same as Render API |

**Operational notes**
- Render's free tier sleeps after inactivity. Warm up the API and mock platforms before a live demo.
- Use the internal database URL for services on Render. Use the external URL only for local development.
- Health check path: `/health` on the API.
- Deploy previews on Vercel use separate domains. Add each one to `CORS_ORIGINS` if you test against them.

---

*Last updated: 2026-10-20*
