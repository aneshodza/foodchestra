# Context
We are part of Hack Baden 2026 and we are creating a food supply chain management tool in the challenge from Autexis.

## The challenge
Food travels through complex supply chains – but transparency is lacking. Recalls come too late, risks remain invisible.

Your mission: Build a smart food tracker with AI that makes lives safer and makes the entire supply chain visible.

❗ What problem do you solve?

    🔍 No transparency: Consumers do not know where their product comes from
    ⏱️ Too slow recalls: Dangerous products remain in circulation
    🧩 Fragmented data: Merchants & producers see only parts of the supply chain
    ⚠️ Invisible risks: cold chain breaks or quality problems remain undiscovered

👉 Your solution decides in case of emergency whether people are warned in time.

🧭 Core Features

    Tracking of the entire product journey
    Live Risk & Recall Warnings
    QR code / OCR Scan Experience
    Direct user interaction

🤖 AI Features

    Predicting Risks & Corruption
    Anomaly detection (e.g. Cold chain)
    Conversational Food Assistant
    CO2 & sustainability analysis

🔥 Bonus Features

    📊 Digital Nutri score
    🌱 Ecological footprint
    🔄 Alternative product recommendations (better / sustainable)
    🧠 AI-based quality prediction (Shelf Life Prediction)
    📡 Real-time IoT data (temperature, humidity)
    🧾 Transparent price breakdown along the supply chain
    🎮 Gamification: Trust Scores, Achievements, Leaderboards & Crowd Intelligence

💡 You are free: Think beyond the requirements and develop your own features that create real added value. 🚀 

🍫 Example: A bar of chocolate

A user scans a chocolate bar in the supermarket. Your app shows:

    🌱 Cocoa from Ghana (Harvest: Jan 2026)
    🏭 Processing in Belgium
    🚢 Transport to Germany
    🏬 Delivery to the shelf

⚠️ Live event: During transport, the cold chain was interrupted → AI detects risk and immediately warns.
"This batch has a 72% risk for quality loss based on temperature deviations." 

## The grading criteria

The project will be graded according to certain criteria:
- Reifegrad der Umsetzung: It should ideally be ready for PROD
- Reifegrad der Architektur: The architecture should be secure, expandable, follow data-security and protection standards, be well documented, and have high code quality
- UI/UX Usability: The FE should be very usable, mobile-friendly, ready for production and look nice
- Technical documentaiton: The project should be well-documented and shipable to customers. A comprehensive README is sufficient
- Code-Quality: The project should follow strict quality guidelines: TypeScript, Linting, Quality Checks and static code analyzers

----

# Solution

We are creating "foodchestra", a food orchestration tool. It should be an agentic tool that helps the user see:
- Where their food is coming from
- The nutri score
- Ingredients
- Carbon footprint
- Cooling chain
- Supply chain
- If there are complaints about safety/quality from other users

## Issues we are trying to solve
There are some issues with supply chains currently:
- Fragmented data: Data is currently in many different places and doesn't allow for easy accessing. We found multiple APIs and some data we mock for the hackathon. More details below
- Missing data: There is tons of data missing (supply chains, cooling chains) that we are going to mock for the MVP
- Jungle of data: When there is data, there are large amounts of it, meaning a person cannot go through it all. That is where we use agents to help us comb through it
- Non-technical users: There should be a more "analytic" side of the application which allows users to go through complex supply chain analytics, even if they dont know SQL or something like that. We want to bridge that gap with AI (MCP servers that allow agents to query data as needed)

## Data sources
There are a few sources of data that we want to embed and some that we want to mock.
The data sources used should be cached if there was a request recently so there aren't too many api requests. cache invalidates after 24h. That cache is a simple SQL table with a "validated_at" stamp

### openfoodfacts.org
They expose an API where a simple barcode can be used (without keys or auth) to get some data.  
Some of the offered data (more comes from there, so use accordingly):
- Nutri score
- ingridients
- brands
- stores
- maybe country of origin

### Recallswiss
There is a recall feed for swiss people on what their government is recalling  
The feed exposes an API that is paginated, so multiple requests will be needed: https://www.recallswiss.admin.ch/customer-access-backend/resources/recalls?page=N
The idea here is: We don't want to fetch this all the time; the API should ideally be fetched at some intervall (e.g. 1 hour) where the data is then loaded into the database, ready to use.

### Mocked data
We have to mock some data, as a lot of it is hidden behind private APIs, etc. For that we ideally create some sort of factories to produce the random numbers (with faker.js)
Following data is to be mocked:
- The supply chain
- The cooling chain (which is attached to the supply chain)

#### Supply chain data
It should form a linkedlist to track every single stop that was taken by the food: from the farmers up to the shelves and anyone that has used those ingredients in between.

#### Cooling chain data
The cooling chain should be attached to each link in those lists that shows a graph of time to degrees celcius on how cold the thing was. We need to create sql structured data and the rendering into a graph is done in the FE

## User inputs
The user has multiple ways to interact with our application:
- QR-Code scanning
- Barcode scanning
- OCR scanning
- Manual input

### What data there is to scan
Each product has a barcode which identifies it and often also a batch number to specifcy further; thats what the OCR and barcode are for  
Additionally every product is going to have a GS1 2027 code soon, which is a QR code that encodes more data: barcode, batch number and expiry

Each scan should be logged anonymously so we can check and improve potential issues

### Manual inputs
If the scanners don't work the user should be able to manually input it

### Filing a complaint
The user should be able to file a complaint if the food is bad. There he can enter:
- Where he got it from
- QR-Code data (again same readers as before)
- What the issue is

## What the user sees
There is a workflow on what the user should see:
- A window for inputting the data (QR, manually, barcode, OCR as before; reuse components)
- After an input the food gets searched for and the user gets the available details:
	- Nutri score
	- ingredient list
	- open recalls from the government
	- user complaints (shows as a % of all scans of the product)
- A button that encourages the user to file a complaint

### Additional data
There should be buttons that link to additional data: Supply chain and cooling chain

#### Supply chain
A simple map, integrating a GIS or google maps to put markers on the map of where it was and where it travelled

#### Cooling chain
The markers should have a cool or heat emoji depending on if the cooling chain was intact. That is also based on the data from the DB

## Tech Stack
It will be a Frontend/Backend arichtecture with a JSON api

### FE
The FE should be in react and not use too many libraries (ideally just react and router dom). **IMPORTANT**: We need TS with vite.
styling should be done with scss and no inline styling. The framework to choose is bootstrap
icons should come from the `material-icons` npm package (webfont approach) using CSS class spans: `<span className="material-icons">icon_name</span>`

The scss should be made cleanly:
- No magic numbers, use a separate file for constants (e.g. colours.scss, breakpoints.scss)
- There should be a lot of scss files, dont just put everything in one place
- Breakpoints should be used in the scss to ensure mobile-first approach

And the components:
- There should be a shared/ folder for buttons etc. to ensure consistent styling
- The components should be cohesive to ensure we aren't building giant things

### BE
The backend is expressjs and relies heavily on middlewares to handle business login. **IMPORTANT**: We need TS
It should also follow clean code practices so dividing by concerns into routers is important.
There should also be a repository layer for making the BE communicate with DB, so there aren't sql queries everywhere  

The recall fetch can be triggered in any standard way, like with a cron library for express. It shouldn't rely on e.g. systemctl or actual cron to ensure deployment wont be a pain, independent of what OS we have

The env vars should be in a gitignored .env file with a .env.example that just shows KEY=<empty> so the user knows what to add.

#### API Specification
There should be an auto generated swagger so that the backend always documents interactions; for maintainability and ease of work.

### Auth strategy
The BE should use CASL and Passportjs with jtw to ensure that most of the work is abstracted away.

### SDK
There should be a thin typed fetch wrapper (sdk/src/index.ts) that the FE and MCP use to communicate with the BE. It should expose every route that exists as a typed function. No auto-generation — just write it by hand as routes are built.

### MCP
The SDK is wrapped in an MCP server so agents can communicate with the backend via MCP tools. If not finished by ship time, it gets removed — but build it in parallel.

### MCP
The entire SDK should be wrapped in an MCP so the agents can communicate with the backend.

### Maps
Use OpenStreetMap for the maps integration, it's easy to implement. Ideally use some sdk from nmp so we dont build everything ourselves

### DB Schema
The schema will be specified as we are programming.

### Agent setup
Agents are built with LangGraph (TypeScript). The architecture should be clean and expandable even though we start with a single agent:

- Each agent is a class (e.g. `FoodAgent`) that encapsulates its `StateGraph`, node definitions, and tool bindings. New agents can be added by creating new classes.
- Tools are defined as separate typed functions (one per SDK call) and injected into the agent — not hardcoded inline.
- The single agent handles all current use cases: product lookup, recall checking, supply chain queries, complaint history.
- State is typed with a `GraphState` interface; keep it flat for now but structured so fields can be added without refactoring.
- Tools call the SDK functions directly, but the SDK is also wrapped in an MCP server so the agent can optionally use it via MCP. If MCP isn't ready by ship time, tools fall back to direct SDK calls.

The user interacts with it using a simple input field that expands into fullscreen (as a floating modal) when the user sends his first message.
There should also be an "agent is working" indicator that is animated so the user knows it isn't hanging.

### Docker
The PostgreSQL database that will be used should be dockerized

## Testing
Everything should be tested: The frontend should have component tests and the backend unit tests. Everything that isn't class under test should be mocked.
There should also be E2E tests with cypress, but only for the most critical and easily testable workflows (e.g. scan → product display, filing a complaint)
There should be coverage reports (no minimum threshold)

### Linting
There should be tslint/eslint and scss checks to make sure we follow code quality guidelines.

----

# CLAUDE NOTES
These notes exist so a fresh context can orient quickly without re-reading the whole conversation.

## Project state
- Monorepo root scaffolded with npm workspaces
- `backend/` is fully scaffolded and running — see details below
- `sdk/` is scaffolded — see details below
- `frontend/` is scaffolded — see details below
- `mcp/` is scaffolded — see details below
- `agent/` is scaffolded and running — see details below
- `docker-compose.yml` — Postgres 16-alpine; `docker compose up -d` to start
- Cooling chain is fully implemented — DB, BE router, SDK, MCP, FE chart — see section below
- Next step: auth hardening (CASL + Passport + JWT), Cypress E2E tests, coverage reports

## What exists in backend/
- `src/server.ts` — runs migrations, fires initial recall sync, starts hourly cron, then starts Express on `PORT` (default 3000)
- `src/app.ts` — mounts all routers and swagger UI
- `src/swagger.ts` — swagger-jsdoc config; auto-picks up `@openapi` JSDoc from `src/routers/*.ts` at startup
- `src/routers/alive.router.ts` — `GET /alive` → `200 { status: 'ok' }`, swagger-documented
- `src/routers/products.router.ts` — `GET /products/:barcode` → fetches OpenFoodFacts, returns normalised product or `{ found: false }`
- `src/routers/recalls.router.ts` — `GET /recalls?page=&pageSize=` → paginated list of recalls from DB
- `src/repositories/recalls.repository.ts` — `upsertRecalls()` (bulk ON CONFLICT upsert) + `getRecalls()` (paginated)
- `src/services/recalls.service.ts` — calls `fetchAllRecalls()` from SDK, maps entries to DB rows, upserts
- `src/cron/recalls.cron.ts` — `node-cron` hourly schedule (`0 * * * *`), calls `fetchAndStoreRecalls()`
- `src/db.ts` — pg `Pool` singleton using `DATABASE_URL`
- `src/migrate.ts` — reads `src/migrations/*.sql` in order and runs them at startup
- `src/migrations/001_create_recalls.sql` — `recalls` table schema
- `src/migrations/002_create_scans.sql` — `scans` table (uuid PK, scan_result, scan_type enum, scanned_at, metadata JSONB); indexes on result + type
- `src/routers/scans.router.ts` — `POST /scans` → logs a scan anonymously; requires `scanResult` + `scanType`, optional `metadata`; returns created `Scan` row
- `src/repositories/scans.repository.ts` — `ScansRepository.create()` + `findRecent(limit)`; types re-exported from `@foodchestra/sdk`
- `src/migrations/004_create_supply_chain.sql` — `party_type` enum, `parties`, `party_locations`, `batches`, `supply_chains`, `supply_chain_nodes`, `supply_chain_edges` tables
- `src/migrations/005_seed_supply_chain.sql` — realistic Swiss seed data: 5 parties, 6 locations, 1 batch (Jowa Ruchbrot `7610807001024`), 5 nodes, 4 edges (two farmers merging into Jowa → Coop Pratteln → Coop Zürich HB)
- `src/routers/parties.router.ts` — `GET /parties` (all parties) + `GET /parties/:id/locations` (locations for a party, 404 if missing)
- `src/routers/batches.router.ts` — `POST /batches`, `GET /batches/:id`, `GET /batches/by-number/:batchNumber?barcode=` (optional barcode filter, array, 404 if none), `GET /batches/:id/supply-chain` (full DAG with nodes+edges, party+location embedded)
- `src/repositories/supply-chain.repository.ts` — `SupplyChainRepository` with all DB queries; `findByBatchNumber(batchNumber, barcode?)` accepts optional barcode to narrow to one product
- `src/migrations/007_create_cooling_chain.sql` — adds UUID `id` column to `supply_chain_edges` (with UNIQUE constraint, idempotent via `DO $$ BEGIN ... EXCEPTION WHEN duplicate_table THEN NULL; END $$;`); creates `cooling_chain_readings` table (UUID PK, `edge_id` FK → `supply_chain_edges(id)`, `recorded_at TIMESTAMPTZ`, `celsius NUMERIC(5,2)`); index on `(edge_id, recorded_at)`
- `src/migrations/008_seed_cooling_chain.sql` — seeds 44 temperature readings across the 4 seeded edges using `SELECT e.id FROM supply_chain_edges WHERE from_node_id = ... AND to_node_id = ...` (avoids hardcoding generated UUIDs); realistic cold-chain data with deliberate spikes on edges A and B
- `src/routers/cooling-chain.router.ts` — `GET /batches/by-number/:batchNumber/supply-chain/cooling?barcode=` → looks up batch by number (optional barcode to disambiguate), 400 if multiple match without barcode, fetches supply chain, returns `CoolingChainEdgeData[]`; swagger-documented
- `src/repositories/cooling-chain.repository.ts` — `CoolingChainRepository` with `findByEdge(edgeId)`, `findBySupplyChain(supplyChainId)` (JOINs through edges→nodes, groups by edgeId in JS using a Map), `bulkCreate(readings[])` (dynamic placeholder generation)
- Test files: `parties.router.test.ts` (7 tests) + `batches.router.test.ts` (17 tests) + `cooling-chain.router.test.ts` (9 tests) + `cooling-chain.repository.test.ts` (13 tests)
- Swagger UI live at `http://localhost:3000/docs`
- `nodemon.json` — watch mode via `tsx --env-file .env`, run with `npm run dev`
- `.eslintrc.json` — TypeScript ESLint configured
- `npm run lint` / `npm run lint:fix` — work from both `backend/` and repo root
- Tests: Jest + ts-jest + supertest; run with `npm test` (from `backend/`)
- Test files in `src/__tests__/`: `alive.router.test.ts`, `barcode.test.ts`, `products.router.test.ts`, `recalls.router.test.ts`, `recalls.service.test.ts`, `scans.router.test.ts`, `parties.router.test.ts`, `batches.router.test.ts`, `cooling-chain.router.test.ts`, `cooling-chain.repository.test.ts`
- Test pattern (routers): mount router on a bare express app, mock the repository with `jest.mock()`, use `supertest` to fire requests
- Test pattern (repositories): mock `pool` via `jest.mock('../db', () => ({ pool: { query: jest.fn() } }))`, call repository methods directly, assert on `pool.query` call args and mapped return values

## What exists in sdk/
- `src/index.ts` — exports `createClient(config)` factory + default `client` (reads `FOODCHESTRA_API_URL`, falls back to `http://localhost:3000`)
- `src/client.ts` — `makeHttpHelpers(baseUrl)` returns typed `get(path, options?)` / `post` helpers. `get` accepts optional `{ cache?: RequestCache }` to override browser caching per-call.
- `src/routes/health.ts` — `AliveResponse` type + `healthRoutes(get)` factory → `{ getAlive }`. Uses `cache: 'no-store'` — health polls must always hit the server (Express ETags cause 304 otherwise, which `res.ok` treats as failure).
- `src/routes/recalls.ts` — `recallRoutes(get)` factory → `{ getRecalls({ page?, pageSize? }) }`
- `src/routes/scans.ts` — `scanRoutes(post)` factory → `{ logScan(CreateScanInput) }`
- `src/routes/parties.ts` — `partyRoutes(get)` factory → `{ getAll(), getLocations(partyId) }`
- `src/routes/batches.ts` — `batchRoutes(get, post)` factory → `{ create(input), getById(id), getByBatchNumber(batchNumber, barcode?), getSupplyChain(id) }`
- `src/routes/cooling-chain.ts` — `coolingChainRoutes(get)` factory → `{ getCoolingChain(batchNumber, barcode?) }` → `GET /batches/by-number/:batchNumber/supply-chain/cooling?barcode=`
- `src/types/cooling-chain.ts` — `CoolingChainReading`, `CoolingChainEdgeData`, `CreateReadingInput` interfaces
- `src/types/recalls.ts` — `Recall` + `RecallsResponse` interfaces
- `src/types/scans.ts` — `Scan`, `CreateScanInput`, `ScanType` interfaces
- `src/types/parties.ts` — `PartyType`, `Party`, `PartyLocation` interfaces
- `src/types/batches.ts` — `Batch`, `CreateBatchInput`, `SupplyChainEdge`, `SupplyChainNode`, `SupplyChain` interfaces
- **Backend now depends on `@foodchestra/sdk`** for shared types — repositories import types from there instead of defining them locally
- `src/external/recallswiss.ts` — `fetchAllRecalls(baseUrl?)`: fetches all pages of the RecallSwiss government API concurrently (batches of 5), deduplicates by `id`, returns `RecallSwissEntry[]`. This is where ALL RecallSwiss HTTP calls live. `RECALLSWISS_DEFAULT_BASE` exported for override.
- Pattern: all external API HTTP calls go in `src/external/<source>.ts` — centralised fetch layer
- Adding new route group: create `src/routes/<concern>.ts`, wire into `createClient` in `index.ts`
- Dual build: `npm run build` runs two `tsc` passes → `dist/cjs/` (CommonJS, for Node/MCP) and `dist/esm/` (ESM, for Vite/FE). `package.json` `exports` field picks the right one automatically.
- FE uses it as a workspace dep: `"@foodchestra/sdk": "*"` in `frontend/package.json` — npm workspaces symlinks it. Vite picks up the ESM build via `exports["import"]`.
- **SDK is not tested** — only FE and BE have test suites; SDK logic is covered by BE tests via mocks.

## What exists in mcp/
- Uses `@modelcontextprotocol/sdk` (official Anthropic npm package) with `McpServer` + `StdioServerTransport`
- `src/index.ts` — creates `McpServer`, instantiates the SDK client via `createClient`, registers all tools, connects stdio transport
- `src/tools/health.ts` — wraps `client.health.getAlive()` as `get_alive` tool
- `src/tools/products.ts` — wraps `client.products.getByBarcode()` as `get_product_by_barcode` tool
- `src/tools/recalls.ts` — wraps `client.recalls.getRecalls()` as `get_recalls` tool (optional `page`, `pageSize`)
- `src/tools/parties.ts` — `get_parties` + `get_party_locations` tools
- `src/tools/batches.ts` — `get_batch_by_id`, `get_batch_by_number` (optional `barcode` param), `get_supply_chain`, `create_batch` tools
- `src/tools/cooling-chain.ts` — `get_cooling_chain(batchNumber, barcode?)` tool; wraps `client.coolingChain.getCoolingChain`
- Pattern for adding tools: create `src/tools/<concern>.ts` exporting `registerXxxTools(server, client)`, call it in `index.ts`
- `npm run build` (from `mcp/`) — compiles to `dist/` (ESM, NodeNext)
- `npm run start` — runs the compiled server (stdio, for use with Claude Desktop / agent)
- Reads `FOODCHESTRA_API_URL` env var, falls back to `http://localhost:3000`
- To wire into Claude Desktop: `{ "command": "node", "args": ["<path>/mcp/dist/index.js"], "env": { "FOODCHESTRA_API_URL": "..." } }`

## What exists in agent/
- LangGraph ReAct agent powered by Gemini (`@langchain/google-genai` + `@langchain/langgraph`)
- Tools come entirely from the MCP server (`mcp/`) via `@langchain/mcp-adapters` — no duplicate tool definitions in this package
- `src/index.ts` — entry point; loads `.env`, awaits `FoodAgent.create()`, starts Express on `PORT` (default 3001), closes MCP on SIGTERM/SIGINT
- `src/server.ts` — `createApp(agent)` factory; `GET /alive` + `POST /chat` (`{ message }` → `{ response }`)
- `src/agent.ts` — `FoodAgent` class with private constructor and static async `create()` factory; spawns the MCP server as a stdio subprocess via `MultiServerMCPClient`, calls `initializeConnections()`, then passes tools to `createReactAgent`
- `src/state.ts` — `GraphState` annotation (messages array reducer); extend here when state grows
- Adding new tools: add them to the MCP server (`mcp/src/tools/`) — the agent picks them up automatically on next start
- `.env.example` — `GEMINI_API_KEY=`, `GEMINI_MODEL=gemini-2.0-flash-lite`, `FOODCHESTRA_API_URL=http://localhost:3000`, `CORS_ORIGINS=`, `PORT=3001`
- Model defaults to `gemini-2.0-flash-lite`; override with `GEMINI_MODEL=` in `.env`
- **Requires MCP to be built first** (`npm run build -w mcp`) — agent spawns `mcp/dist/index.js` at startup
- `npm run dev` (from `agent/`) — runs with `tsx watch` (hot reload)
- `npm run dev:agent` (from root) — same, via workspace script

## What exists in frontend/
- Vite + React 18 + TypeScript (ES2022, `react-jsx` — no React import needed in components)
- Bootstrap 5 + Material Icons loaded globally via `src/App.scss`
- `src/components/shared/` — reusable components: Button (variant prop), HomeIcon, BackendStatus, ScannerView; all new shared UI goes here
- `src/components/ScannerPage.tsx` — scan entry point: QR / Barcode buttons → `ScannerView` → navigates to ProductView on barcode scan; `?scanned=` fallback for non-barcode results; QR mode is a TODO stub
- `src/components/ProductView.tsx` — product detail page at `/products/:barcode`; fetches product + reports in parallel; shows nutri-score, image, ingredients, quantity, stores, report warning/count; Trace Journey section with batch number input + navigate button
- `src/components/SupplyChainMap.tsx` — OpenStreetMap component (react-leaflet v4 + leaflet-arrowheads + recharts); props `{ barcode, batchNumber }`; fetches supply chain + cooling chain in parallel (`Promise.allSettled` — map renders even if cooling fails); renders custom pin markers (color-coded by party type, dim non-final/hover/active opacity) + red clickable directional polylines; clicking an edge opens a `<Popup>` at the midpoint with a recharts `LineChart` of time vs celsius; "No temperature data available" shown when edge has no readings; auto-fits bounds
- `src/components/SupplyChainMapPage.tsx` — page wrapper at `/products/:barcode/maps/:batchNumber`; back link preserves `?batchNumber=` on return to ProductView
- `src/utils/barcode.ts` — `looksLikeBarcode(text)`: 7+ digit guard used to validate scan results before navigation
- `src/styles/variables/_colours.scss` — brand/neutral/semantic colour tokens; `_breakpoints.scss` — BS5-compatible breakpoints + `respond-up()` mixin
- SCSS convention: BEM class names, no inline styles, no magic numbers — always use variables
- `src/types/index.ts` — barrel re-export; `src/types/scanner.ts` — `ScanMode = 'qr' | 'barcode'`
- Scanner: uses `html5-qrcode`. Configuration (FPS, ROI dimensions) managed via `.env` (`VITE_SCANNER_FPS`, `VITE_SCANNER_QR_BOX_*`, `VITE_SCANNER_BARCODE_BOX_*`). Instance must be stopped on unmount.
- `App.tsx` — pure router shell: `BrowserRouter` with routes for `/` (ScannerPage), `/products/:barcode` (ProductView), `/products/:barcode/maps/:batchNumber` (SupplyChainMapPage), `/products/:barcode/report` (ReportIssuePage), and catch-all redirect
- `.stylelintrc.json` — enforces SCSS variable/mixin/class naming; run with `npm run lint:scss`
- `.eslintrc.json` — TS + React + react-hooks rules; `npm run lint` / `npm run lint:fix`
- Dev server: `npm run dev` (from `frontend/`) — Vite on port 5173
- Build: `npm run build` (type-check + Vite prod build)
- Tests: Vitest + jsdom + `@testing-library/react`; run with `npm test` (from `frontend/`)
- `src/setupTests.ts` — imports `@testing-library/jest-dom`; wired into `vite.config.ts` via `setupFiles`
- Test pattern: mock all external deps with `vi.mock`; use `vi.hoisted()` when mocks are needed inside the factory (e.g. class constructor mocks like `html5-qrcode`); wrap components that use router hooks in `MemoryRouter` + `Routes`
- Test files in `src/__tests__/`: `barcode.test.ts`, `Button.test.tsx`, `BackendStatus.test.tsx`, `ScannerView.test.tsx`, `ScannerPage.test.tsx`, `ProductView.test.tsx`, `App.test.tsx`, `SupplyChainMap.test.tsx`, `SupplyChainMapPage.test.tsx`, `ReportIssuePage.test.tsx`

## npm scripts
- `npm run setup` (from root) — first-time setup: installs deps, copies `.env.example` → `.env` (skips if exists), installs git hooks, builds SDK + MCP
- `npm run dev` (from `backend/`) — starts BE dev server with hot reload (port 3000)
- `npm run dev` (from `frontend/`) — starts FE dev server (port 5173)
- `npm run dev` (from root) — starts backend, frontend, and agent in parallel
- `npm run lint` (from root) — ESLints all 5 workspaces in parallel
- `npm run lint:scss` (from root or `frontend/`) — Stylelint SCSS check
- `npm run lint` / `npm run lint:fix` (from any workspace) — scoped to that workspace only
- `npm run check` (from root) — full lint + `tsc --noEmit` across all workspaces; runs automatically on `git push` via pre-push hook
- `npm run typecheck` (from any workspace) — `tsc --noEmit` scoped to that workspace
- `npm run db:reset` (from root) — drops + recreates local dev DB schema (asks for confirmation); migrations re-run on next backend start
- `npm test` (from `backend/`) — Jest; `npm test` (from `frontend/`) — Vitest
- Adding new BE routers: create `src/routers/<name>.router.ts`, mount in `app.ts`, add `@openapi` JSDoc — swagger picks it up automatically, no other config needed

## Git hooks (Husky)
- `.husky/` is **committed to git** — that's intentional. All team members get the same hooks automatically via `"prepare": "husky"` which runs on every `npm install`.
- **pre-commit** — runs `lint-staged`: only lints/fixes files that are actually staged (fast). ESLint on `.ts`/`.tsx`, Stylelint on `.scss`.
- **pre-push** — runs `scripts/check.sh`: full lint + typecheck across all workspaces. Catches issues that pre-commit misses (e.g. type errors in unstaged files).
- `lint-staged` config lives in root `package.json` under `"lint-staged"`.
- To bypass a hook in an emergency: `git commit --no-verify` / `git push --no-verify` (use sparingly).

## Conventions established
- All routers go in `src/routers/<name>.router.ts`
- All routers are mounted in `src/app.ts` only — never in `server.ts`
- `server.ts` only starts the listener, nothing else
- `.env.example` tracks all required env vars with empty values; actual `.env` is gitignored
- CORS configured in `app.ts` via `cors` middleware; allowed origins read from `CORS_ORIGINS` env var (comma-separated). Defaults to `http://localhost:5173`. Set `CORS_ORIGINS=https://yourapp.com` in prod.

## Agreed shortcuts (intentional, don't revert)
- README instead of LaTeX docs
- Hand-written SDK wrapper — no auto-generation
- Coverage reports only, no 80% threshold
- Cypress for 2-3 critical flows only (scan→result, file complaint)
- MCP is scaffolded and builds cleanly — extend as SDK routes grow
- Auth (CASL + Passport + JWT) can be stubbed initially, filled in after core loop works
- LangGraph: single `FoodAgent` class now, clean enough to add more agents later
- **Only FE and BE are tested** — SDK, MCP, and agent have no test suites (intentional)

## CI
- `.github/workflows/tests.yml` — runs on push to `main` and on PRs (not on every branch push, to avoid double-runs)
- Parallel jobs: `lint-backend`, `lint-frontend`, `lint-sdk`, `lint-agent`, `lint-mcp`, `test-backend`, `test-frontend`
- Frontend lint job runs both ESLint and Stylelint
- `test-backend` runs Jest (`npm run test --workspace=backend`)
- `test-frontend` runs Vitest (`npm run test --workspace=frontend`)
- `cypress` job runs last, only after all lint + unit test jobs pass (`needs: [...]`) — it starts backend + frontend, waits via `wait-on`, then runs Cypress
- `npm run test` from root runs backend tests, frontend tests, then Cypress in sequence

## Key architectural decisions
- Monorepo: `backend/`, `frontend/`, `sdk/`, `agent/`, `mcp/`
- Agent tools call SDK functions directly (MCP is an optional layer on top)
- Supply chain is a DAG stored as `supply_chain_nodes` + `supply_chain_edges` (adjacency list). Nodes reference `party_locations`; locations reference `parties`. A `batches` table ties a product barcode + batch number to a supply chain. Traverse with recursive CTE from leaf nodes (sources) to the final shelf node.
- Cooling chain: `cooling_chain_readings` table with FK to `supply_chain_edges(id)` (edges got a surrogate UUID `id` column in migration 007). Route: `GET /batches/by-number/:batchNumber/supply-chain/cooling?barcode=`. FE renders a recharts LineChart in a Leaflet popup when an edge is clicked on the supply chain map
- RecallSwiss: fetched once on startup + every 1h via in-process `node-cron`, stored in the `recalls` DB table. All HTTP fetch logic lives in `sdk/src/external/recallswiss.ts`
- All external API HTTP calls go in `sdk/src/external/<source>.ts` — centralised fetch layer; BE services import from there
- DB migrations: plain SQL files in `backend/src/migrations/*.sql`, applied in filename order at server startup via `runMigrations()`
- Use `||` not `??` for env var fallbacks — `??` doesn't catch empty-string values from `.env`
- `nodemon.json` uses `tsx --env-file .env` to load env vars in dev

## Priority order
1. Core happy path: scan barcode → fetch OpenFoodFacts → show nutri score + ingredients + recalls + complaints
2. Supply chain map (OpenStreetMap) + cooling chain chart
3. Complaint filing
4. AI agent chat (LangGraph)
5. MCP, auth hardening, Cypress, coverage reports

## Product Details View (feature/product-details)
- `react-router-dom` added to the frontend; `App.tsx` is now a pure router shell (`BrowserRouter` + `Routes`).
- `src/components/ScannerPage.tsx` — extracted from `App.tsx`; owns all scan state, navigation logic, and the `?scanned=` fallback display.
- `src/components/ProductView.tsx` — new page at `/products/:barcode`; calls `client.products.getByBarcode()` on mount; shows nutri-score, image, ingredients, quantity, stores; handles loading/not-found/error states; has stub buttons for "Report Issue" and "Trace Journey".
- `src/utils/barcode.ts` — `looksLikeBarcode(text)`: accepts 7+ digit strings (EAN-8/13, UPC-A); used to guard navigation in `ScannerPage`.
- Scan routing rules: barcode mode → navigate to `/products/:barcode` if `looksLikeBarcode`, else show inline via `?scanned=`; QR mode → `alert('TODO: IMPLEMENT')` (stub).
- `ScannerView` refactored: extracted `stopScanner()` helper used consistently on success, on unmount, and when unmounted mid-start; removed the old 500 ms artificial delay.
- SDK rebuilt after `scans` route was missing from the ESM dist — always run `npm run build --workspace=sdk` after changing `sdk/src/`.
- Test count: 27 → 61 (7 test files). New files: `barcode.test.ts` (11 tests), `ScannerPage.test.tsx` (12 tests). Expanded: `ProductView.test.tsx` (13 tests), `ScannerView.test.tsx` (9 tests), `App.test.tsx` trimmed to 2 routing smoke tests.
- LSP shows false-positive TS errors for `toBeInTheDocument` / module paths — all 61 tests pass; these are a tsconfig path resolution artefact in the language server, not real errors.

## GS1-2027 QR Code Support (feature/gs1-2027-support)
- QR scanning now handles GS1 Digital Link codes (the standard rolling out for food products by 2027).
- `frontend/src/utils/gs1.ts` — pure parser `parseGs1QrCode(input): Gs1ScanData | null`; supports URL format (`https://id.gs1.org/01/.../10/.../17/...`) and bracket element string format (`(01)...(10)...(17)...`); strips leading zeros from 14-digit GTIN to produce a standard EAN barcode.
- `Gs1ScanData` interface: `{ barcode, batchNumber, expiryDate }` — all three AIs extracted (01=GTIN, 10=batch, 17=expiry).
- `ScannerPage`: QR flow now mirrors barcode flow — `parseGs1QrCode` → `navigate('/products/:barcode?batchNumber=...&expiryDate=...')`. Invalid GS1 shows inline `alert-danger` instead of the old `alert()` stub.
- `ProductView`: `batchNumber` and `expiryDate` arrive as query params — reading them is deferred to when the complaint form is built.
- `ScannerView`: fixed double-stop race condition — `stopScanner` now nulls `scannerRef.current` immediately on entry, so the React cleanup callback is always a no-op after a successful scan.
- Tests: `frontend/src/__tests__/gs1.test.ts` (11 tests, parser unit tests); `ScannerPage.test.tsx` updated — old TODO-alert tests replaced with GS1 navigate + error tests.

## Product Caching
- OpenFoodFacts product data is now cached in the PostgreSQL `products` table.
- `GET /products/:barcode` checks the database before fetching from OpenFoodFacts.
- Cache TTL is set to 24 hours (`CACHE_TTL_MS = 24 * 60 * 60 * 1000`).
- If a product is not found or is older than 24 hours, it is fetched from OpenFoodFacts and updated in the database via `upsertProduct()`.
- Migration `003_create_products.sql` added the `products` table with a numeric `id` (SERIAL), `barcode` (UNIQUE), and JSONB for `ingredients`.
- `products.repository.ts` handles DB interaction, returning the internal `id` on upserts.

## User Reports (feature/user-reports)
- `GET /products/:barcode/reports` — returns `{ count, recentCount24h, hasWarning, reports[] }`. Warning triggers when `recentCount24h > 4`. Only reports from last 30 days are counted/returned. Auto-resolves (no warning) when 30-day window is empty.
- `POST /products/:barcode/reports` — anonymous report; requires `category` (enum), optional `description` (max 500 chars in UI). Product must already be cached.
- Migration `006_create_reports.sql` — `report_category` enum (`damaged_packaging`, `quality_issue`, `foreign_object`, `mislabeled`, `other`), `reports` table with UUID PK + `product_id` FK + composite index `(product_id, created_at DESC)`. Enum is guarded with `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` (same pattern as `party_type` in 004). `expired` was intentionally excluded — a product being past its date is a manufacturer/retailer concern, not a quality report.
- `reports.repository.ts` — `createReport()`, `getReportSummaryByProductId()` (single conditional-aggregation query), `getReportsByProductId()`.
- `reports.router.ts` — `Router({ mergeParams: true })` mounted under `/products` in `app.ts` — critical for param inheritance.
- SDK: `sdk/src/types/reports.ts` + `sdk/src/routes/reports.ts`; `client.reports.getReports(barcode)` + `client.reports.createReport(barcode, input)`.
- Frontend: `ReportIssuePage.tsx` at `/products/:barcode/report` — category dropdown + description textarea + confirmation on success.
- `ProductView.tsx` fetches product + reports in parallel via `Promise.allSettled` (reports failure degrades gracefully). Shows red alert if `hasWarning`, social proof text if `count > 0`, navigates to ReportIssuePage on "Report Issue" click.
- `Button.tsx` `variant` type extended with `'outline-danger'` (fixes pre-existing type gap).
- Test counts: backend 71 tests (9 suites), frontend 85 tests (9 files).
- **Stretch goals (not yet implemented):** image upload on reports; agent-based spam detection (cross-checks reports, flags fakes before showing warning).

## Supply Chain Map (feature/openmap-integration)
- `GET /batches/by-number/:batchNumber?barcode=` — new optional `barcode` query param filters results to a single product. Backend `findByBatchNumber(batchNumber, barcode?)` branches SQL accordingly. Swagger doc updated.
- SDK `getByBatchNumber(batchNumber, barcode?)` appends `?barcode=` to the URL when provided.
- MCP `get_batch_by_number` tool updated with optional `barcode` field.
- `SupplyChainMap` component (`react-leaflet` v4 + `leaflet-arrowheads`): fetches batch via barcode+batchNumber filter, then supply chain; renders OpenStreetMap with one `Marker` per node and `Polyline` per edge.
- Marker styling: `L.divIcon` with rotated-square pin shape; color-coded by party type (farmer=green, processor=blue, distributor=orange, warehouse=purple, retailer=red); Material Icon inside; final stop at full opacity, intermediate stops at 0.75 opacity with hover and popup-open bringing to 1.
- Polylines are red (`#dc3545`) with arrowheads at end via `leaflet-arrowheads`.
- `SupplyChainMapPage` at `/products/:barcode/maps/:batchNumber` wraps the map; back link returns to `/products/:barcode?batchNumber=...` preserving the batch number.
- `ProductView` updated: fetches product + reports via `Promise.allSettled`; Trace Journey section has a batch number input (pre-filled + disabled from `?batchNumber=` URL param) and a route button that navigates to the map page. "Report Issue" navigates to `ReportIssuePage`.
- Leaflet CSS imported globally in `App.scss`.
- Test counts: backend 70 → 72 (2 new barcode-filter tests in `batches.router.test.ts`), frontend 111 tests across 10 files (added `SupplyChainMap.test.tsx` 27 tests, `SupplyChainMapPage.test.tsx` 8 tests, +12 Trace Journey tests in `ProductView.test.tsx`).
- Leaflet/react-leaflet mocking pattern: `vi.hoisted()` for polyline instance + fitBounds spy; mock `MapContainer`/`Marker`/`Popup` as plain divs; mock `useMap` returning the hoisted spy; mock `leaflet-arrowheads` as empty module.

## Cooling Chain (feature/cooling-chain)
- DB: `supply_chain_edges` got a surrogate UUID `id` column (migration 007); `cooling_chain_readings` table (migration 007) has FK to that id; 44 seed readings across 4 edges (migration 008) with realistic cold-chain spikes
- BE: `GET /batches/by-number/:batchNumber/supply-chain/cooling?barcode=` — 400 if multiple batches match without barcode, 404 if no batch/supply chain, returns `CoolingChainEdgeData[]`
- Repository: `CoolingChainRepository.findBySupplyChain` JOINs readings→edges→nodes, groups by edgeId in JS using a Map; `bulkCreate` uses dynamic `$N` placeholder generation; `celsius` is always `Number(r.celsius)` (pg returns NUMERIC as string)
- SDK: `client.coolingChain.getCoolingChain(batchNumber, barcode?)` at `sdk/src/routes/cooling-chain.ts`; types at `sdk/src/types/cooling-chain.ts`
- MCP: `get_cooling_chain(batchNumber, barcode?)` tool at `mcp/src/tools/cooling-chain.ts`
- FE: `SupplyChainMap` fetches cooling chain in parallel with supply chain; polylines now accept an `onClick` prop (handler stored in a `useRef` to avoid recreating polylines on state changes); clicking an edge opens a standalone `<Popup position={midpoint}>` (react-leaflet) with a recharts `LineChart`; gracefully degrades to "No temperature data available" if cooling fetch fails or edge has no readings
- recharts (`recharts` npm package) added to frontend — used only for the `LineChart` in the edge popup
- Tests: backend 91 → 105 (9 new in `cooling-chain.router.test.ts`, 13 new in `cooling-chain.repository.test.ts`); frontend 111 → 132 (7 new edge popup + cooling chain tests in `SupplyChainMap.test.tsx`, recharts mocked as `vi.mock('recharts', ...)`)

## Supply Chain Map Legend
- `SupplyChainMap` now wraps the `MapContainer` in a `supply-chain-map__wrapper` div and renders a `MapLegend` component below the map
- Legend has two sections separated by a left border divider: party type pins (5 items) + transport route arrow
- Party type pins are mini versions of the map pin shape (rotated-square), colour-coded via existing `supply-chain-map__marker--<type>` BEM modifier classes — no colour duplication in JS
- Transport route entry shows a red CSS arrow and the label "Transport route — click for temperature chart"
- `LEGEND_ITEMS` constant defined at module level (outside the component) — avoids re-creation on render
- Tests: 2 new tests in `SupplyChainMap.test.tsx` `legend` describe block (all five party labels + route label); frontend 132 → 134
