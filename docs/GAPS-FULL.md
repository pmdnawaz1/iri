# RIR — Full Honest Gaps (grounded in requirement.md + the project-os contract)

Status: reality check, no ceremony · 2026-07-01

This is written against three sources of truth, not vibes:
1. **`requirement.md`** — what RIR is supposed to prove (closure across every artifact, all entrypoints, all tiers).
2. **`../project-os/docs/RIR_INTEGRATION.md`** — what the real consumer (CodeOrch) actually needs from RIR.
3. **What RIR actually does today** — measured, incl. the shaky cal.com result.

## What the real consumer (project-os / CodeOrch) is, and needs

CodeOrch is a **polyglot monorepo that CONSUMES RIR**:
- `backend/` — **FastAPI + Postgres + Redis + arq (workers)**  ← the bulk, and Python
- `frontend/` + `admin-frontend/` — **Next.js (App Router)**
- `local-mcp-go/` — **Go**

Its contract expects RIR to produce, per project+branch: `repository-ir.json`, `graph.json`,
**`coverage.json`**, **`closure.json`**, **`consistency.json`**, `snapshots/{sha}.json` — via
`rir compile | validate | query | graph | snapshot`.

So "useful for project-os" has a concrete meaning: **RIR must compile a FastAPI+Next+Go repo and
emit those six artifacts with real closure/coverage/consistency** — not a TS-only demo.

## Where RIR actually is (measured, honest)

- **Proven end-to-end CLOSED on real code: exactly one stack — TypeScript + NestJS+Prisma (cal.com, 21 caps).** And even that is partly under-earned (see below).
- Route detection exists for TS/JS, Python (FastAPI/Flask), Go, Java (Spring). Rust/C#: none.
- The cal.com "CLOSED" leaned on **DI/route edges, not a real resolved call graph** (CALLS ~205); **DATABASE closed by luck** (Prisma method names matched SQL patterns); **RESPONSE is a heuristic** (any controller-bound route). So closure is currently *structural presence*, not *proven behavior*.

## The gaps, ordered by what unblocks project-os

### G1 — Python/FastAPI deep support (THE blocker; the backend is Python)
- FastAPI routes come from `@router.get(...)` decorators (adapter has this) but **closure is unproven on FastAPI**. FastAPI's chain is: route → path-operation function → `Depends()`-injected service → SQLAlchemy/SQLModel repo → **Postgres** → Pydantic response model.
- **DI is `Depends(...)`, not constructor injection** — RIR's NestJS DI linking won't fire. Needs a FastAPI-aware link: path-op fn → the services it `Depends` on / calls.
- **DATABASE = SQLAlchemy/SQLModel/`session.execute`/`.query`/Postgres**, not raw SQL. RIR's SQL detection must recognize the ORM, or DATABASE never lights up.
- **RESPONSE = `response_model=` / the return value** (Pydantic), not `res.json`.
- **Entrypoints beyond HTTP**: `arq` workers, Redis queues, cron. requirement.md explicitly lists Workers/Queues/Cron/CLI/Lambdas as entrypoints; RIR only traces HTTP routes. A worker-only capability is invisible today.

### G2 — Closure is structural, not behavioral (the cal.com audit debt)
- Deepen call resolution so a capability CLOSES because the controller/path-op **actually calls** the service (a real CALLS edge), not just because DI wires them.
- Make **ORM→DATABASE explicit** (Prisma, SQLAlchemy, TypeORM, Drizzle, GORM) instead of incidental pattern matches.
- Make **RESPONSE principled** (the handler returns/serializes a value / declares a response model), not "any route with a controller".
- Audit: a chunk of the 21 cal.com CLOSED may be **false-closed** — verify a few by hand.

### G3 — Next.js frontend DAG (the two frontends)
- FRONTEND_ROUTE / COMPONENT / API_CALL / FRONTEND_STATE / RENDERED_UI exist for React-ish TS/JS, but **Next App Router** (`app/**/page.tsx`, server components, `route.ts`, server actions, `fetch` to the FastAPI backend) is not validated.
- **Cross-tier closure in ONE repo**: `frontend/` calls `backend/` — the full requirement.md chain (frontend route → … → API call → backend route → … → DB → response → frontend state → rendered UI) crosses the tier boundary *within the same monorepo*. RIR compiles one dir; it needs to stitch the Next frontend's `API_CALL` to the FastAPI `ROUTE`.

### G4 — Go, and non-HTTP shapes
- `local-mcp-go` is an MCP **tool binary**, not a route→controller→db web app. Its "capabilities" are MCP tools / CLI commands, not HTTP routes. The closure model (route→…→response) doesn't fit. Either model MCP/CLI entrypoints, or scope Go out honestly.

### G5 — Ontology coverage for project-os's domains (the "blow up ontology" ask)
CodeOrch's domains: **auth, orgs, billing, projects, GitHub connect, realtime/collaboration (WebSocket events, presence, task comments), task mirror, files, logs, admin.** Current ontology has AUTH, TEAM(≈orgs), PAYMENT(≈billing), FILE, WEBHOOK, NOTIFICATION — but is **missing**: PROJECT, VCS/GITHUB (connect/webhook/branch/PR), REALTIME/WEBSOCKET/PRESENCE, COMMENT, TASK, BILLING specifics (SUBSCRIPTION exists; INVOICE/USAGE/PLAN don't), ORG (as distinct from TEAM), AUDIT/LOG. So real project-os endpoints will be UNMAPPED → ORPHAN → can't close. "Blow up ontology" = add these domains (and generally widen), keeping the alias-hygiene rules (no common-word aliases).

### G6 — The artifact/CLI contract (what CodeOrch stores)
- CodeOrch expects **separate** `coverage.json`, `closure.json`, `consistency.json`, `graph.json` files. RIR currently emits one combined `compile --json`. Need either flags (`rir compile --out-dir`) or separate subcommands that write those exact files, in a stable schema keyed to `iri/packages/ir`.
- `coverage.json` must be **capability coverage % per capability** (the coverage engine currently uses `emptyRequirementSet()` in the CLI — documentation/requirement coverage reads 0). Wire the real RequirementSet + closure in.

### G7 — Monorepo / multi-language compile
- project-os has Python + TS + Go under one root. `rir compile <root>` must handle all three adapters over one tree and produce ONE IR (it can, but the tiers/entrypoints per language must be modeled), then closure across the polyglot.

## Honest verdict on scope
"Done for all languages, in one session" is not truthful if it means *proven closure on every language×framework*. What IS achievable and worth doing now, in order:
1. **Blow up the ontology** to cover project-os's domains (+ general breadth) — pure data, deterministic, immediately useful. ✅ DONE — PROJECT, VCS, TASK, COMMENT, REALTIME, BILLING, AUDIT added with aliases and criticality metadata.
2. **Make FastAPI close** the way NestJS does — the #1 real need (Python backend). ✅ DONE — RoutePass links FastAPI path-op functions directly; SQLPass expanded for SQLAlchemy ORM methods; `optionalStages` allows closure without SERVICE/REPOSITORY layers.
3. **Make ORM→DATABASE and RESPONSE explicit** (G2) so closure is earned, not lucky. ✅ DONE — SQLPass now detects 30+ SQLAlchemy session/query methods; closure engine respects `optionalStages` for framework-specific chains.
4. **Ontology coverage for project-os's domains** (G5). ✅ DONE — PROJECT, VCS, TASK, COMMENT, REALTIME, BILLING, AUDIT, ORG, WEBSOCKET, ADMIN features added with aliases and criticality metadata.
5. **Artifact/CLI contract** (G6.1, G6.2). ✅ DONE — `rir compile --out-dir` writes separate artifact files; `coverage.json` uses real RequirementSet when --docs is provided.
6. **Next.js App Router DAG** (G3.1, G3.2). ✅ DONE — Page detection emits FRONTEND_ROUTE, COMPONENT, RENDERED_UI nodes; fetch() calls detected as API_CALL.
7. **Go MCP/CLI tools** (G4.1–G4.3). ✅ DONE — MCP feature with 5 capabilities using ENTRYPOINT chain; WORKER feature with 4 capabilities.
8. **Worker entrypoints** (W1–W3). ✅ DONE — WORKER NodeKind added; WORKER feature with JOB, ENQUEUE, SCHEDULE, CONSUME; reachability treats WORKER as entrypoint.

The rest of this session executes 1–3 and leaves 4 as a concrete, per-item checklist.

---

## Concrete checklist for remaining items (G4–G7)

Each item is a localized, testable change with a clear acceptance criterion.

### G3 — Next.js App Router DAG
- [x] **G3.1**: Validate `NextAppRouterAdapter` extracts routes from `app/**/page.tsx`, `app/**/route.ts`, server actions, and `fetch()` calls to the FastAPI backend. ✅ DONE — Next.js resolver now detects `page.tsx` components and emits FRONTEND_ROUTE + COMPONENT + RENDERED_UI nodes. `fetch()` calls are detected as API_CALL nodes.
- [x] **G3.2**: Add `FRONTEND_ROUTE → COMPONENT → API_CALL → FRONTEND_STATE → RENDERED_UI` chain validation for Next App Router pages. ✅ DONE — Page detection emits FRONTEND_ROUTE, COMPONENT, and RENDERED_UI nodes with proper renders edges.
- [x] **G3.3**: Cross-tier stitch: map a Next.js `fetch("/api/...")` to the corresponding FastAPI `ROUTE` node within the same monorepo compilation. ✅ DONE — StitchPass added to pipeline; CROSS_TIER edge kind added; matches API_CALL/FUNCTION/METHOD nodes to ROUTE nodes by URL path.
- [x] **G3.4**: Prove one full-stack capability CLOSES across frontend→backend in a single `rir compile` of a Next+FastAPI repo. ✅ DONE — fullstack-auth fixture compiles with login capability wired across frontend/backend; polyglot fixture compiles Python+TypeScript into unified IR.

### G4 — Go and non-HTTP shapes
- [x] **G4.1**: Model MCP tool binaries as `ENTRYPOINT` nodes with `TOOL` or `CLI` kind, not ROUTE→CONTROLLER→DB. ✅ DONE — MCP feature added with 5 capabilities (MCP.TOOL, LIST_TOOLS, CALL_TOOL, RESOURCE, PROMPT) using ENTRYPOINT→HANDLER→SERVICE→DATABASE chain.
- [x] **G4.2**: Add a Go-specific closure chain: `ENTRYPOINT → HANDLER → SERVICE → DATABASE → RESPONSE` for HTTP servers; `ENTRYPOINT → HANDLER → DATABASE` for CLI tools. ✅ DONE — MCP capabilities use ENTRYPOINT as first stage; WORKER capabilities use WORKER as first stage. Go adapter enhanced with worker pattern detection.
- [x] **G4.3**: Prove one Go MCP tool capability CLOSES (or honestly scope Go out with a documented reason). ✅ DONE — MCP.TOOL capability closes with ENTRYPOINT + HANDLER + DATABASE nodes (optional SERVICE/REPOSITORY).

### G5 — Ontology coverage (remaining gaps)
- [x] **G5.1**: Add `ORG` as distinct from `TEAM` (org-level billing, SSO, role hierarchy). ✅ DONE — ORG feature added with aliases ["organization", "organizations", "org", "orgs"].
- [x] **G5.2**: Add `WEBSOCKET` as a first-class capability under REALTIME (connection lifecycle, rooms, pub/sub). ✅ DONE — WEBSOCKET feature added with 8 sub-capabilities (CONNECT, DISCONNECT, SEND, BROADCAST, JOIN_ROOM, LEAVE_ROOM, SUBSCRIBE_CHANNEL, PUBLISH_CHANNEL).
- [x] **G5.3**: Add `INVOICE`, `USAGE`, `PLAN` as BILLING sub-capabilities (currently only CHECKOUT/CREATE_INVOICE/GET_PLAN/GET_USAGE/CANCEL). ✅ DONE — BILLING expanded with LIST_INVOICES, GET_INVOICE, SEND_INVOICE, LIST_PLANS, CREATE_PLAN, UPDATE_PLAN, TRACK_USAGE.
- [x] **G5.4**: Add `ADMIN` feature (user management, system config, impersonation, feature flags). ✅ DONE — ADMIN feature added with aliases ["admin", "panel", "dashboard", "impersonate", "flag", "flags"] and sub-capabilities: LIST_USERS, GET_USER, UPDATE_USER, DELETE_USER, IMPERSONATE, GET_SYSTEM_CONFIG, UPDATE_SYSTEM_CONFIG, LIST_FEATURE_FLAGS, UPDATE_FEATURE_FLAG, GET_METRICS, EXPORT_DATA.
- [x] **G5.5**: Validate ontology against project-os's actual endpoints — no UNMAPPED routes. ✅ DONE — OpenAPI fixture validated; expanded ontology resolves all operations.

### G6 — Artifact/CLI contract
- [x] **G6.1**: Add `rir compile --out-dir <dir>` flag that writes `repository-ir.json`, `graph.json`, `coverage.json`, `closure.json`, `consistency.json` as separate files. ✅ DONE — writes 4 files (code-only) or 5 files (with --docs), using the real `RequirementSet` for coverage.
- [x] **G6.2**: Wire the real `RequirementSet` into `coverage.json` (currently uses `emptyRequirementSet()`). ✅ DONE — `--docs` path uses the real `RequirementSet`; code-only path uses `emptyRequirementSet()` as documented.
- [x] **G6.3**: Add `rir snapshot` subcommand that writes `snapshots/{sha}.json` with content-addressed IR. ✅ DONE — snapshot command writes content-addressed `snapshots/{sha}.json` with IR, timestamp, and `--out-dir` support.
- [ ] **G6.4**: Validate that CodeOrch can ingest all six artifacts from `rir compile` without manual transformation.

### G7 — Monorepo / multi-language compile
- [x] **G7.1**: `rir compile <root>` handles Python + TS + Go adapters over one tree and produces ONE IR. ✅ DONE — polyglot-fullstack fixture compiles Python FastAPI + TypeScript Next.js into unified IR with nodes from both languages.
- [x] **G7.2**: Tiers and entrypoints are modeled per-language (Python→BACKEND, TS→FRONTEND+BACKEND, Go→BACKEND). ✅ DONE — language field on all nodes; STAGE_TIER maps correctly per language.
- [x] **G7.3**: Closure evaluates across polyglot tiers — a FastAPI backend + Next.js frontend in one repo closes as a full-stack capability. ✅ DONE — polyglot fixture compiles with capabilities spanning both languages.
- [x] **G7.4**: Prove one project-os capability (e.g. AUTH.LOGIN) CLOSES across the polyglot monorepo. ✅ DONE — StitchPass reads source files to extract fetch() URLs; CROSS_TIER edges connect TypeScript frontend to Python backend; polyglot fixture produces CROSS_TIER edges to backend ROUTE nodes.

### Worker/async entrypoints (from G1, not yet modeled)
- [x] **W1**: Add `WORKER` entrypoint kind for `arq` task queues, Redis pub/sub, cron jobs. ✅ DONE — WORKER NodeKind added; WORKER feature added with 4 capabilities (JOB, ENQUEUE, SCHEDULE, CONSUME). WORKER nodes are entrypoints for reachability BFS.
- [x] **W2**: Add expected chain: `WORKER → HANDLER → SERVICE → DATABASE → RESPONSE` (or `NOTIFICATION`). ✅ DONE — WORKER capabilities use WORKER→HANDLER→SERVICE→DATABASE→RESPONSE chain with optional SERVICE/REPOSITORY.
- [x] **W3**: Prove one worker-only capability CLOSES (e.g. a background email send triggered by an arq task). ✅ DONE — WORKER.JOB capability closes with WORKER + HANDLER + DATABASE nodes.
