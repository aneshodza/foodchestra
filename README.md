# Foodchestra

> Every food brings a rythm. Here is yours!

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Use Cases](#use-cases)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Data Sources](#data-sources)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Code Quality](#code-quality)

---

## Overview

### The Problem

There are some issues with supply chains currently:

- Fragmented data: Data is currently in many different places and doesn't allow for easy accessing. We found multiple APIs and some data we mock for the hackathon. More details below
- Missing data: There is tons of data missing (supply chains, cooling chains) that we are going to mock for the MVP
- Jungle of data: When there is data, there are large amounts of it, meaning a person cannot go through it all. That is where we use agents to help us comb through it
- Non-technical users: There should be a more "analytic" side of the application which allows users to go through complex supply chain analytics, even if they dont know SQL or something like that. We want to bridge that gap with AI (MCP servers that allow agents to query data as needed)

### Our Solution

We are creating "foodchestra", a food orchestration tool. It should be an agentic tool that helps the user see:

- Where their food is coming from
- The nutri score
- Ingredients
- Carbon footprint
- Cooling chain
- Supply chain
- If there are complaints about safety/quality from other users

## Features

### Scanning

- Barcode scanning (EAN-8, EAN-13, UPC-A)
- QR code scanning with GS1 Digital Link support (GS1-2027 standard - encodes barcode, batch number, expiry)
- OCR scanning for manual label reading
- Manual input fallback
- Every scan is logged anonymously for quality tracking

### Product Information

- Nutri score, ingredient list, quantity, and store availability (via OpenFoodFacts)
- Government recall warnings (Swiss RecallSwiss feed, synced hourly)
- User complaint count with warning threshold (triggered when >4 reports in 24h)
- Cooling chain anomaly alert when temperature deviations are detected

### Supply Chain Map

- Interactive map (OpenStreetMap) showing every stop a product took - from farmer to shelf
- Color-coded markers by party type (farmer, processor, distributor, warehouse, retailer)
- Directional transport routes between stops

### Cooling Chain

- Temperature readings over time for each transport leg
- Chart (time vs °C) accessible by clicking any route on the map
- Automatic anomaly detection: flags edges where temperature deviated >2°C from average

### Complaint Filing

- Anonymous report submission with category (damaged packaging, quality issue, foreign object, mislabeled, other)
- Optional free-text description

### AI Chat Agent

- Conversational assistant powered by Gemini via LangGraph
- Has access to all backend data via MCP tools: product lookup, recall search, supply chain queries, complaint history
- Floating chat modal with typing indicator; expands on first message

## Architecture

![System Architecture](docs/images/diagram.png)

## Use Cases

### Filing a Complaint

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    User->>FE: Clicks "Report Issue"
    FE-->>User: Report form (category + description)
    User->>FE: Submits form
    FE->>BE: POST /products/:barcode/reports
    BE->>DB: Insert report row
    DB-->>BE: Created report
    BE-->>FE: 201 Created
    FE-->>User: Confirmation message
    note over DB: If >4 reports in 24h,<br/>next product fetch sets hasWarning=true
```

### AI Chat Agent

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant Agent as Agent (LangGraph)
    participant MCP as MCP Server
    participant DB as PostgreSQL

    User->>FE: Types message in chat
    FE->>BE: POST /chat { message, history }
    BE->>Agent: POST /chat (proxy)
    Agent->>Agent: ReAct loop starts
    loop Tool calls (as needed)
        Agent->>MCP: Call tool (e.g. get_product_by_barcode)
        MCP->>BE: HTTP request via SDK
        BE->>DB: Query
        DB-->>BE: Result
        BE-->>MCP: JSON response
        MCP-->>Agent: Tool result
    end
    Agent-->>BE: { response, toolSteps }
    BE-->>FE: { response, toolSteps }
    FE-->>User: Agent reply
```

### Recall Sync (Background)

```mermaid
sequenceDiagram
    participant Cron as Cron (hourly)
    participant SDK as SDK (external/)
    participant RS as RecallSwiss API
    participant DB as PostgreSQL

    note over Cron: Fires on startup,<br/>then every hour
    Cron->>SDK: fetchAllRecalls()
    loop Paginated fetch (batches of 5)
        SDK->>RS: GET /recalls?page=N
        RS-->>SDK: Page of recalls
    end
    SDK-->>Cron: Deduplicated RecallSwissEntry[]
    Cron->>DB: Upsert all recalls (ON CONFLICT DO UPDATE)
    note over DB: Recalls ready for<br/>GET /recalls queries
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker](https://www.docker.com/) (for PostgreSQL)
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free tier is sufficient)

## Quick Start

```bash
# 1. Start the database
docker compose up -d

# 2. Install dependencies, copy .env files, build sdk + mcp
npm run setup

# 3. Add your Gemini API key
#    Open agent/.env and set GEMINI_API_KEY=<your-key>

# 4. Start everything
npm run dev
```

| Service     | URL                        |
| ----------- | -------------------------- |
| Frontend    | http://localhost:5173      |
| Backend API | http://localhost:3000      |
| Swagger UI  | http://localhost:3000/docs |
| Agent       | http://localhost:3001      |

To stop all processes: `npm run kill`

> **Demo product:** scan or enter barcode `7610807001024` (Jowa Ruchbrot) to see a fully seeded supply chain and cooling chain.

## Environment Variables

Each workspace has its own `.env` (gitignored). The `npm run setup` script copies `.env.example` → `.env` for each workspace automatically. Only the Gemini key needs to be filled in manually.

### `backend/.env`

| Variable                 | Default                                                           | Description                     |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------- |
| `PORT`                   | `3000`                                                            | HTTP port                       |
| `DATABASE_URL`           | `postgresql://foodchestra:foodchestra@localhost:5432/foodchestra` | PostgreSQL connection string    |
| `CORS_ORIGINS`           | `http://localhost:5173`                                           | Comma-separated allowed origins |
| `AGENT_URL`              | `http://localhost:3001`                                           | URL of the agent service        |
| `OPENFOODFACTS_BASE_URL` | `https://world.openfoodfacts.org/api/v0/product`                  | Override to use a mirror        |
| `RECALLSWISS_BASE_URL`   | _(upstream default)_                                              | Override to use a mirror        |

### `agent/.env`

| Variable              | Default                 | Description                              |
| --------------------- | ----------------------- | ---------------------------------------- |
| `GEMINI_API_KEY`      | -                       | **Required.** Your Google Gemini API key |
| `GEMINI_MODEL`        | `gemini-2.0-flash`      | Model to use                             |
| `FOODCHESTRA_API_URL` | `http://localhost:3000` | Backend URL the agent calls              |
| `PORT`                | `3001`                  | HTTP port                                |
| `CORS_ORIGINS`        | `http://localhost:5173` | Comma-separated allowed origins          |

### `frontend/.env`

| Variable                          | Default | Description                           |
| --------------------------------- | ------- | ------------------------------------- |
| `VITE_SCANNER_FPS`                | `10`    | Camera frames per second for scanning |
| `VITE_SCANNER_QR_BOX_WIDTH`       | `250`   | QR scan region width (px)             |
| `VITE_SCANNER_QR_BOX_HEIGHT`      | `250`   | QR scan region height (px)            |
| `VITE_SCANNER_BARCODE_BOX_WIDTH`  | `300`   | Barcode scan region width (px)        |
| `VITE_SCANNER_BARCODE_BOX_HEIGHT` | `150`   | Barcode scan region height (px)       |

## API Documentation

The backend auto-generates a Swagger UI from JSDoc annotations on every router.

**Open http://localhost:3000/docs after starting the backend.**

All endpoints are documented there, including request/response schemas and example values. No separate API reference is maintained - the Swagger spec is always in sync with the code.

## Database

PostgreSQL 16 running in Docker. The schema is managed via plain SQL migration files in `backend/src/migrations/` and applied automatically on every backend startup (idempotent).

| Migration                      | Description                                                      |
| ------------------------------ | ---------------------------------------------------------------- |
| `001_create_recalls.sql`       | Government recall entries                                        |
| `002_create_scans.sql`         | Anonymous scan log                                               |
| `003_create_products.sql`      | OpenFoodFacts cache (TTL 24h)                                    |
| `004_create_supply_chain.sql`  | Parties, locations, batches, DAG nodes + edges                   |
| `005_seed_supply_chain.sql`    | Demo data for barcode `7610807001024` (Swiss bread supply chain) |
| `006_create_reports.sql`       | User complaint reports                                           |
| `007_create_cooling_chain.sql` | Temperature readings per transport edge                          |
| `008_seed_cooling_chain.sql`   | 44 demo temperature readings with realistic cold-chain spikes    |

To reset the database to a clean state:

```bash
npm run db:reset
```

## Data Sources

| Source                                            | Type                                            | Auth | Sync strategy                                        |
| ------------------------------------------------- | ----------------------------------------------- | ---- | ---------------------------------------------------- |
| [OpenFoodFacts](https://world.openfoodfacts.org/) | Product info (nutri score, ingredients, stores) | None | Fetched on demand, cached in DB for 24h              |
| [RecallSwiss](https://www.recallswiss.admin.ch/)  | Swiss government food recalls                   | None | Fetched on startup + every hour via in-process cron  |
| Supply chain                                      | Product journey (farm → shelf)                  | N/A  | Seeded demo data; architecture supports real sources |
| Cooling chain                                     | Temperature readings per transport leg          | N/A  | Seeded demo data; architecture supports IoT feeds    |

## Project Structure

```
foodchestra/
├── backend/              # Express API (port 3000)
│   └── src/
│       ├── routers/      # HTTP route handlers (one file per concern)
│       ├── services/     # Business logic and orchestration
│       ├── repositories/ # All SQL queries; DB row → typed object mapping
│       ├── migrations/   # Plain SQL files, applied in order at startup
│       └── cron/         # In-process scheduled jobs (recalls sync)
├── frontend/             # React + Vite app (port 5173)
│   └── src/
│       ├── components/   # Pages and UI components
│       │   └── shared/   # Reusable primitives (Button, etc.)
│       └── styles/       # SCSS variables, BEM structure
├── sdk/                  # Typed fetch wrapper shared by frontend and MCP
│   └── src/
│       ├── routes/       # One file per route group
│       ├── types/        # Shared TypeScript interfaces
│       └── external/     # All third-party HTTP calls (OpenFoodFacts, RecallSwiss)
├── mcp/                  # MCP server - exposes backend as AI tools (stdio)
│   └── src/tools/        # One file per tool group
├── agent/                # LangGraph ReAct agent powered by Gemini (port 3001)
│   └── src/
│       ├── agent.ts      # FoodAgent class (StateGraph, MCP tool binding)
│       └── server.ts     # Express wrapper exposing POST /chat
└── docker-compose.yml    # PostgreSQL 16
```

## Testing

```bash
# Backend (Jest + supertest)
npm test --workspace=backend

# Frontend (Vitest + Testing Library)
npm test --workspace=frontend

# All tests + Cypress E2E
npm test
```

**Coverage reports** are generated on every run (no enforced minimum threshold - reports are for awareness).

**Test patterns:**

- Backend routers: mount router on a bare Express app, mock the repository with `jest.mock()`, assert via supertest
- Backend repositories: mock `pool.query`, call repository methods directly, assert on SQL args and mapped return values
- Frontend components: mock all SDK calls with `vi.mock('@foodchestra/sdk')`, wrap components using router hooks in `MemoryRouter`

**What is not tested:** `sdk/`, `mcp/`, and `agent/` have no test suites (SDK is covered by backend tests via mocks; MCP and agent are thin orchestration layers).

## Code Quality

```bash
# Lint all workspaces
npm run lint

# Lint + fix
npm run lint:fix

# SCSS lint (frontend only)
npm run lint:scss

# Full typecheck across all workspaces
npm run check
```

**Automated enforcement:**

- **Pre-commit** - `lint-staged` runs ESLint + Stylelint only on staged files (fast)
- **Pre-push** - full lint + `tsc --noEmit` across all workspaces
- **CI** - parallel lint and test jobs on every PR; Cypress runs last after all checks pass

**Key rules enforced:**

- No `any` types (`@typescript-eslint/no-explicit-any: error`)
- No magic numbers (named constants required)
- `import type` for type-only imports
- Strict equality (`===` only)
- SCSS: `@use` over `@import`, no inline styles, no magic colour values, mobile-first breakpoints
