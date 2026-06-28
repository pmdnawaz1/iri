# IR Output — Medusa (E-commerce)

> Generated 2026-06-27 · Branch `code-ontology`  
> Source: [`https://github.com/medusajs/medusa`](https://github.com/medusajs/medusa)  
> Compiled subdir: `packages/medusa/src/api`

---

## Graph Stats

| Metric | Value |
|---|---|
| **Artifacts** (files parsed) | 613 |
| **Nodes** | 1979 |
| **Edges** | 4301 |
| **Capabilities bound** | 0 |
| **Mapped to ontology** | 0 |
| **Unmapped (ORPHAN)** | 0 |

---

## Node Kind Breakdown

| Kind | Count |
|---|---|
| `VARIABLE` | 800 |
| `MODULE` | 791 |
| `TYPE` | 353 |
| `FUNCTION` | 19 |
| `EVENT_CONSUMER` | 6 |
| `SQL_QUERY` | 5 |
| `EVENT` | 4 |
| `INTERFACE` | 1 |

---

## Routes Discovered (0)

_None detected by current adapters — see notes below._

---

## Mapped Capabilities (0)

> These routes resolved to an existing ontology capability via the discovery cascade.

| Capability | Closure | Participating Nodes |
|---|---|---|
_None mapped._

---

## Unmapped / ORPHAN Routes (0)

> These routes resolved to **no** ontology id. They are the **candidate worklist** for ontology proposals.
> Cross-reference against `docs/ontology-candidates/` for proposed features.

| Unmapped Capability | Notes |
|---|---|
_All routes mapped — no gaps._

---

## Adapter Notes

> **File-based routing detected.** This repo uses Next.js App Router / Medusa v2 style — `route.ts` files export `GET`/`POST`/`DELETE` functions.
> The current `TypeScriptAdapter` only detects `app.get()` / `router.post()` patterns, so **rir compile** found 0 routes from standard detection.
> Routes above were extracted via a secondary directory-walk scan of `route.ts` exported verbs.
> **TSPEC-A017 fix needed**: add exported-verb detection to `TypeScriptAdapter`.


