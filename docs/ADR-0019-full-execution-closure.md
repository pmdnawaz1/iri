# ADR-0019 — Full Execution Closure (stage producers)

Status: Proposed · Owner: ROLE_ARCHITECT · TSPEC: A019 (amends A009/ADR-0002)

## Context

No capability reaches `CLOSED` today, even when its backend is fully wired. `AUTH.LOGIN`'s
`expectedChain` has 12 stages (FRONTEND_ROUTE, COMPONENT, HANDLER, API_CALL, BACKEND_ROUTE,
CONTROLLER, SERVICE, REPOSITORY, DATABASE, RESPONSE, FRONTEND_STATE, RENDERED_UI), but the
passes only ever produce nodes that map to BACKEND_ROUTE / CONTROLLER / SERVICE / REPOSITORY
(and DATABASE via the new SQLPass). There is **no producer** for HANDLER, API_CALL, RESPONSE,
or the three frontend stages. So a perfect backend is permanently `BROKEN`.

## Decision

### 1. A capability closes only the tiers present in the compiled repo

A single backend repository can never satisfy frontend stages — and that is *correct*. So:
- annotate each ontology `ExecutionStage` with a **tier**: `FRONTEND`, `EDGE`, or `BACKEND`.
- closure computes a verdict per compiled tier-set: a backend-only repo is evaluated against
  the BACKEND+EDGE subchain; a full-stack repo (frontend + backend compiled together) against
  the whole chain. A `CLOSED` verdict means "every expected stage *for the tiers present* is
  wired"; missing a tier that isn't in the repo is reported as `PARTIAL (tier absent)`, not
  `BROKEN`. `BROKEN` is reserved for an *interrupted* chain within a present tier.

### 2. Producers for the currently-missing backend/edge stages

- **RESPONSE** — a `ResponsePass` (or RoutePass extension) emits a `RESPONSE` node + edge when
  a route's controller returns a value / calls a response sink (`res.json`, `return`, `reply.send`).
- **API_CALL** — emit an `API_CALL` node when a CallFact callee matches an HTTP client
  (`fetch`, `axios`, `.get/.post` on an http client, `httpClient`). Maps the EDGE tier.
- **HANDLER** — backend route handler functions already exist as nodes; map the handler symbol
  to the HANDLER stage.

### 3. Frontend stages require frontend frontends

FRONTEND_ROUTE (router config), COMPONENT (P04), HANDLER (event handlers), FRONTEND_STATE
(state hooks/stores), RENDERED_UI (JSX/template return) are produced only when the FRONTEND
source is compiled. Full closure therefore requires compiling frontend + backend together
(monorepo or two roots merged into one IR). The frontend producers are a later frontend-adapter
workstream; until then, full-stack capabilities report `PARTIAL (frontend tier absent)`.

## Invariants

1. `CLOSED` is honest: it never claims stages the repo cannot contain.
2. Stage producers are deterministic heuristics, architect-owned (this ADR), implementer-applied.
3. The stage→tier annotation is an ontology addition (versioned).

## Consequences

After A019, a fully-wired backend service reaches `CLOSED (backend tier)` instead of `BROKEN`,
which is the result users expect. Full-stack `CLOSED` awaits the frontend frontends.
