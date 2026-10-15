# Deptrace

> Interactive file-level dependency visualization, circular dependency detection, and change impact analysis for JavaScript and TypeScript repositories.

Deptrace analyzes public GitHub repositories to build comprehensive internal module dependency graphs. It parses source files, maps TypeScript path aliases and module resolutions, identifies circular dependencies via strongly connected components, and provides interactive blast-radius impact analysis through an intuitive web canvas.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Interface Overview](#interface-overview)
- [Architecture Summary](#architecture-summary)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Using Deptrace](#using-deptrace)
- [Testing & Quality Verification](#testing--quality-verification)
- [Production & Deployment](#production--deployment)
- [Known Limitations & Safety Boundaries](#known-limitations--safety-boundaries)
- [Contributing](#contributing)

---

## Overview

Modern JavaScript and TypeScript projects often suffer from hidden architectural complexity: tightly coupled modules, accidental circular imports that cause runtime initialization errors or bundle bloat, and difficulty estimating the blast radius of refactoring a shared file.

Deptrace solves this by providing:
1. **Automated Repository Ingestion:** Shallow clones public GitHub repositories on demand and processes their source trees.
2. **Deterministic Module Resolution:** Analyzes Abstract Syntax Trees (ASTs) to extract static imports, dynamic imports, re-exports, and CommonJS requires, resolving them accurately against `tsconfig.json` path aliases and Node/ESM module conventions.
3. **Circular Dependency Detection:** Detects self-loops and complex multi-file dependency cycles using Strongly Connected Components (SCC).
4. **Impact Analysis:** Calculates direct and transitive dependencies and dependents, illustrating exactly which downstream files will be affected when a given file is modified.
5. **Interactive Exploration:** Renders an accessible, zoomable canvas with directory-level grouping, focus isolation, and a detailed file inspector.

---

## Key Features

- **Public GitHub Ingestion:** Clones public repositories with shallow depth (`--depth 1`) directly into ephemeral storage with best-effort cleanup.
- **AST Parsing with Babel:** Parses `.ts`, `.tsx`, `.js`, and `.jsx` using `@babel/parser` with full TypeScript, JSX, and Flow syntax compatibility. Extracts:
  - Static imports (`import ... from '...'`)
  - Dynamic imports (`import('...')`)
  - Export re-exports (`export ... from '...'` and `export * from '...'`)
  - CommonJS calls (`require('...')`)
- **Advanced Module & Alias Resolution:** Utilizes `enhanced-resolve` and `tsconfig-paths` to resolve:
  - TypeScript path aliases configured in `tsconfig.json` (`baseUrl` and `paths`)
  - ESM `.js`/`.mjs` extensions mapped back to `.ts`/`.tsx` source files
  - Directory imports resolved to `index` files
  - Rejection of external package imports and out-of-boundary paths
- **Cycle Detection:** Identifies circular dependency loops using `stronglyConnectedComponents(graph)` from `graphology-components` (a path-based strongly connected components algorithm), ranking cycles by size.
- **Dual Graph Layout Engine:**
  - `elkjs` layered layout organizes connected subgraphs and neatly packs isolated files.
  - `@dagrejs/dagre` layouts focused subgraphs when isolating cycles or inspecting directories.
- **Adaptive Canvas Modes:** Automatically aggregates files into directory clusters when the repository exceeds 60 source files to prevent visual clutter, with full drill-down capability.
- **Deep-Dive File Inspector:** Inspects any node to view:
  - Direct and transitive dependencies ("Depends on")
  - Direct and transitive dependents ("Used by")
  - Blast-radius impact ("Files affected by this module")
- **Production Guardrails:** Enforces IP rate limiting, concurrency caps, memory TTL pruning, request body size limits, clone disk limits, and a strict 300 source file cap.

---

## Interface Overview

```
+----------------------------------------------------------------------------------------------------+
|  Deptrace Canvas                                                                                   |
|                                                                                                    |
|  [ Top Controls: https://github.com/owner/repo | Analyze | Search files... ]                       |
|                                                                                                    |
|  +--------------------+   +--------------------------------------------------+   +---------------+ |
|  | Graph Controls     |   | Interactive Dependency Canvas                    |   | File          | |
|  | - Directory / File |   |                                                  |   | Inspector     | |
|  |   view toggle      |   |       [src/api.ts]                               |   |               | |
|  | - Connected / All  |   |            |                                     |   | [src/api.ts]  | |
|  |   isolated files   |   |            v                                     |   | Depends on: 2 | |
|  | - Cycle selector   |   |       [src/utils.ts] <=======> [src/helper.ts]   |   | Used by:    4 | |
|  |   & cycle focus    |   |            |                (Cycle detected)     |   | Impact:     6 | |
|  | - Stats summary    |   |            v                                     |   |               | |
|  |                    |   |       [src/db.ts]                                |   | [Transitive]  | |
|  +--------------------+   +--------------------------------------------------+   +---------------+ |
|                                                                                                    |
|  [ Bottom Controls: Zoom in / Zoom out / Fit view / Minimap ]                                      |
+----------------------------------------------------------------------------------------------------+
```

*(Screenshots can be added here once deployment environments generate visual artifacts.)*

---

## Architecture Summary

Deptrace is organized as a decoupled monorepo:

- **Frontend (`/frontend`):** Next.js 16 (React 19) App Router client providing an interactive canvas built on `@xyflow/react`, `elkjs`, and Tailwind CSS v4.
- **Backend (`/backend`):** Express 5 REST API written in TypeScript, managing repository lifecycle, AST parsing, module resolution, and in-memory graph operations with `graphology`.

The following diagram illustrates the internal architecture and request flow of Deptrace.

<p align="center">
  <img src="docs/architecture.png" alt="Deptrace Architecture Diagram" width="100%" />
</p>
For full architectural details, component breakdowns, and sequence flows, see [Architecture Documentation](docs/architecture.md).

---

## Prerequisites

Ensure you have the following installed locally:

- **Node.js:** `v20.x` or higher (`v22.x` LTS recommended).
- **npm:** `v10.x` or `v11.x` (monorepo relies on standard `package-lock.json`).
- **Git:** Available in system PATH (required by backend to run `git clone`).

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/owner/deptrace.git
cd deptrace
```

### 2. Install Dependencies

Install dependencies in both the backend and frontend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 3. Configure Environment Variables

Create environment configuration files for both applications (or run with defaults):

**Backend Configuration (`backend/.env` optional):**
The backend defaults to safe local development settings out of the box. To customize:

```bash
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

**Frontend Configuration (`frontend/.env.local` optional):**
If your backend is running on `http://localhost:3001`, no configuration is needed. To explicitly configure:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Run the Applications

Open two separate terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
*The backend server will start on [http://localhost:3001](http://localhost:3001).*

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
*The frontend web application will start on [http://localhost:3000](http://localhost:3000).*

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All environment variables include verified default fallbacks in code.

### Backend (`backend/src/config/runtime-config.ts`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Integer | `3001` | HTTP port the Express server listens on. |
| `CORS_ORIGIN` | String | `http://localhost:3000` | Allowed CORS `Access-Control-Allow-Origin` origin header. |
| `CLONE_TIMEOUT_MS` | Integer | `60000` (60s) | Maximum duration before aborting `git clone`. |
| `MAX_CLONE_SIZE_BYTES` | Integer | `524288000` (500MB) | Maximum total disk size allowed for cloned repo directory. |
| `ANALYSIS_TIMEOUT_MS` | Integer | `300000` (5 min) | Maximum execution duration before timing out an entire repository analysis. |
| `MAX_CONCURRENT_ANALYSES`| Integer | `2` | Maximum concurrent repository analyses allowed across all users. |
| `RATE_LIMIT_WINDOW_MS` | Integer | `60000` (60s) | Sliding window duration for client IP rate limiting. |
| `MAX_ANALYSES_PER_WINDOW`| Integer | `10` | Maximum `/api/analyze` requests per IP per window. |
| `MAX_STORED_ANALYSES` | Integer | `100` | Maximum number of active graph analyses retained in-memory before pruning oldest. |
| `ANALYSIS_TTL_MS` | Integer | `1800000` (30 min) | Time-to-live before an in-memory analysis graph is expired and deleted. |
| `MAX_SOURCE_FILES` | Integer | `300` | Maximum allowed source files (`.js,.jsx,.ts,.tsx`). **Hard-capped at 300**. |
| `MAX_SOURCE_SIZE_BYTES` | Integer | `104857600` (100MB) | Maximum cumulative size of all discovered source code files. |

### Frontend (`frontend/src/lib/api.ts`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | String | `http://localhost:3001` | Base URL used by the client to communicate with the backend API. |

---

## Development Workflow

### Available Scripts

#### Backend (`/backend`)
- `npm run dev`: Starts the development server using `tsx watch src/server.ts` with auto-reloading.
- `npm run build`: Compiles TypeScript source to CommonJS in `dist/` via `tsc -p tsconfig.json`.
- `npm start`: Runs the compiled server from `dist/server.js`.
- `npm test`: Runs the test suite via Node.js native test runner (`tsx --test src/tests/analysis-pipeline.test.ts src/tests/module-resolver.test.ts`).

#### Frontend (`/frontend`)
- `npm run dev`: Starts Next.js development server on `http://localhost:3000`.
- `npm run build`: Compiles the production Next.js application.
- `npm start`: Starts the Next.js production server.
- `npm run lint`: Runs ESLint 9 checks.
- `npm test`: Runs unit and component tests via `vitest run`.

---

## Using Deptrace

### 1. Triggering an Analysis
1. Open the web interface at `http://localhost:3000`.
2. In the top input bar, paste any public GitHub repository URL, for example:
   ```text
   https://github.com/owner/repository
   ```
3. Click **Analyze**.
4. The system will shallow clone the repository, discover and parse JS/TS source files, construct the dependency graph, and render the canvas.

### 2. Exploring the Graph Canvas
- **Zoom & Pan:** Use the mouse wheel or trackpad to zoom in and pan across the codebase.
- **Directory Overview:** If the repository has more than 60 source files, Deptrace groups files into directory clusters to maintain readability. Click any group or use the toggle to view individual files.
- **Search:** Use the search box to find specific modules; matching files or directory groups are centered and highlighted.
- **Toggle Disconnected Modules:** Toggle between connected files and isolated files (files that do not import or get imported by any internal modules).

### 3. Analyzing Dependency Cycles
- When one or more circular dependencies exist, a cycle indicator displays the count and list of cycles.
- Select a cycle from the dropdown or panel to highlight the participating files and directed edges.
- Click **Focus this cycle** to isolate the cycle sub-graph.

### 4. Deep-Diving via File Inspector
- Click any file node in the canvas.
- The **File Inspector** drawer opens on the right, displaying:
  - **Depends on:** Direct and transitive internal modules this file imports.
  - **Used by:** Direct and transitive internal modules that import this file.
  - **Impact:** Downstream blast radius (every file directly or transitively affected if this file changes).
- Click any related file inside the inspector to navigate directly to it on the canvas.

---

## Testing & Quality Verification

All tests run locally without external service mocks or network calls:

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd ../frontend
npm test

# Run frontend linter
npm run lint
```

### Verified Test Coverage
- **Backend (`src/tests/`):**
  - GitHub URL parsing and validation (rejection of non-GitHub URLs)
  - AST import extraction (ESM static imports, dynamic `import()`, CommonJS `require()`, and `export ... from`)
  - Dependency graph construction and internal/external edge separation
  - Transitive dependent resolution and impact blast-radius calculation
  - Multi-node cycle and self-loop detection
  - TypeScript path alias resolution (`tsconfig.json`)
  - Extension resolution (implicit extensions, directory index files, ESM `.js` imports to `.ts` files)
  - Fault tolerance (malformed files counted as failed while continuing analysis)
- **Frontend (`src/tests/`):**
  - `FileInspector`: Correct rendering of metrics, direct/transitive relationships, and impact lists
  - `GraphCanvas`: State updates, cycle selection, and race-condition prevention for concurrent file queries

---

## Production & Deployment

### Backend Deployment
1. Build the TypeScript codebase:
   ```bash
   cd backend
   npm run build
   ```
2. Start the production Node server:
   ```bash
   PORT=3001 node dist/server.js
   ```
3. Ensure Git is installed in the runtime environment (e.g. in the Docker container: `apt-get install -y git`).
4. Ensure adequate temporary disk space (`/tmp` or OS temp directory) for ephemeral clones.
5. In production environments behind a reverse proxy (e.g., NGINX, Cloudflare), set `trust proxy` if IP rate limiting needs client IP forwarding, and configure `CORS_ORIGIN` to match your production frontend domain.

### Frontend Deployment
1. Build the Next.js bundle:
   ```bash
   cd frontend
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
   ```
2. Run with `npm start` or deploy directly to Vercel, AWS Amplify, or a containerized Node runner.

---

## Known Limitations & Safety Boundaries

Deptrace is intentionally architected with strict safety boundaries because public repositories represent untrusted input:

- **Public GitHub Only:** Only repository URLs matching `https://github.com/<owner>/<repo>` are accepted. Private repositories requiring authentication, SSH cloning, and other git providers (GitLab, Bitbucket) are not supported.
- **Source File Cap (300 Files):** To guarantee responsive graph layouts and low memory utilization in the browser, repositories with more than 300 source files are rejected with a `413 SOURCE_FILE_LIMIT_EXCEEDED` error.
- **Supported Languages:** Only JavaScript and TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`) source files are parsed. CSS, HTML, WebAssembly, Vue SFCs, Svelte files, and other languages are not tracked.
- **Ephemeral Clones & Best-Effort Cleanup:** Repositories are shallow cloned into an OS temp folder with `--depth 1`. Cleanup is attempted immediately in clone failure handlers and in the analysis route's `finally` block. However, cleanup is best-effort: filesystem errors (such as file-lock contention) or ungraceful process terminations can leave temporary directories behind, and no background orphan-cleanup mechanism exists.
- **In-Memory Graph Session Store:** Analysis graphs are kept in Node server memory for 30 minutes (`ANALYSIS_TTL_MS`) to power the file inspector. If the backend restarts, previously analyzed graph sessions expire and return `404 Analysis not found`.
- **Untrusted Input Precautions:** Git commands are executed with argument vectors (`execFile`) to prevent shell injection. Repository clones are subject to strict timeout limits (60s) and disk size limits (500MB). Source trees are capped at 100MB cumulative source size.

---

## Contributing

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Ensure all changes strictly maintain existing tests and pass lint checks:
   ```bash
   cd backend && npm test && npm run build
   cd ../frontend && npm test && npm run lint && npm run build
   ```
3. Commit focused changes with conventional commit messages (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
4. Submit a Pull Request describing the problem, changes made, and verification steps.
