# ADR-0022 — Adapter route detection: decorators & file-based routing

Status: Proposed · Owner: ROLE_ARCHITECT · TSPEC: A021 (builds on ADR-0016, A017)

## Context

The first self-evolution run (`docs/ontology-candidates/DISCOVERY-MISSES.md`) showed the
`TypeScriptAdapter` only detects **imperative** route registration — `app.get()`, `router.post()`.
It misses the two dominant patterns in modern TS backends:

1. **NestJS decorators** — `@Get()`, `@Post()`, `@Patch()`, `@Delete()` on controller methods,
   with the base path from `@Controller("...")`. This is why **cal.com** compiled to mostly
   env-var noise instead of routes.
2. **File-based routing** — a `route.ts` that `export`s `GET`/`POST`/`DELETE` functions, with the
   HTTP path derived from the file's directory relative to the API root. This is **medusa** (and
   Next.js App Router `route.ts`), so Medusa's ORDER/PAYMENT/WEBHOOK/API_KEY surface was invisible.

Consequence: the cross-repo evidence behind several candidate features (`SCHEDULE`, `WORKFLOW`,
`SUBSCRIPTION`, `OAUTH`, `PRODUCT`) is biased by what the adapter could see. ADR-0021 therefore
held those candidates pending this fix.

## Decision

Extend `TypeScriptAdapter` route extraction with two additional, deterministic detectors (emitting
the same `RouteFact` shape the pipeline already consumes — purely additive to ADR-0016):

- **Decorator detector:** for a class with `@Controller(base?)`, each method decorated with an HTTP
  verb decorator emits a route `"<VERB> <base + decorator path>"`. Method/class names also feed the
  existing capability discovery cascade (A017).
- **File-based detector:** for a file named `route.ts`/`route.js` that exports a function named
  `GET`/`POST`/`PUT`/`PATCH`/`DELETE`, emit `"<VERB> <dir-relative-path>"`, mapping bracket
  segments `[id]`/`[...slug]` to `:id`/`*` path params.

Both are detection-only (no semantics): they feed `RoutePass`/`CapabilityPass` like any other route.

## Consequences

- cal.com and medusa (and Next.js App Router apps) yield real routes; coverage rises and the held
  candidates can be re-evaluated on trustworthy evidence (graduation #2).
- No IR or ontology change; closure and consistency are unaffected except by seeing more routes.
- Fixtures: add a NestJS-style controller fixture and a `route.ts` file-based fixture asserting the
  routes resolve to existing capabilities.
