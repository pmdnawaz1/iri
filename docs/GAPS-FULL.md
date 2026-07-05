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
1. **Blow up the ontology** to cover project-os's domains (+ general breadth) — pure data, deterministic, immediately useful. (This session.)
2. **Make FastAPI close** the way NestJS does — the #1 real need (Python backend). Prove one FastAPI capability CLOSES on a real repo. (This session, best-effort.)
3. **Make ORM→DATABASE and RESPONSE explicit** (G2) so closure is earned, not lucky. (This session.)
4. Everything else (Next App-Router DAG, Go/MCP model, cross-tier stitch, the artifact-file split, worker entrypoints) is **grind a low-reasoning agent can do** against this doc — each is a localized, testable change with a clear acceptance ("capability X in repo Y reaches the next stage").

The rest of this session executes 1–3 and leaves 4 as a concrete, per-item checklist.
