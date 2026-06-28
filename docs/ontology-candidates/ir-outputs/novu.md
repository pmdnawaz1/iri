# IR Output — Novu (Notifications)

> Generated 2026-06-27 · Branch `code-ontology`  
> Source: [`https://github.com/novuhq/novu`](https://github.com/novuhq/novu)  
> Compiled subdir: `apps/api/src`

---

## Graph Stats

| Metric | Value |
|---|---|
| **Artifacts** (files parsed) | 1991 |
| **Nodes** | 12311 |
| **Edges** | 21477 |
| **Capabilities bound** | 3 |
| **Mapped to ontology** | 0 |
| **Unmapped (ORPHAN)** | 3 |

---

## Node Kind Breakdown

| Kind | Count |
|---|---|
| `MODULE` | 4665 |
| `SQL_QUERY` | 3151 |
| `CLASS` | 1455 |
| `METHOD` | 1371 |
| `FUNCTION` | 617 |
| `VARIABLE` | 533 |
| `INTERFACE` | 172 |
| `TYPE` | 155 |
| `EVENT_CONSUMER` | 75 |
| `CONTROLLER` | 64 |
| `SERVICE` | 33 |
| `EVENT` | 17 |
| `ROUTE` | 3 |

---

## Routes Discovered (3)

- `DELETE tenant`
- `GET EnrichOrganizationBrand`
- `GET external_api_accessible`

---

## Mapped Capabilities (0)

> These routes resolved to an existing ontology capability via the discovery cascade.

| Capability | Closure | Participating Nodes |
|---|---|---|
_None mapped._

---

## Unmapped / ORPHAN Routes (3)

> These routes resolved to **no** ontology id. They are the **candidate worklist** for ontology proposals.
> Cross-reference against `docs/ontology-candidates/` for proposed features.

| Unmapped Capability | Notes |
|---|---|
| `UNMAPPED.DELETE_TENANT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ENRICHORGANIZATIONBRAND` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_EXTERNAL_API_ACCESSIBLE` | ontology gap — see proposal in candidates/ |

---

## Adapter Notes



> Standard Express/Fastify routing detected by `rir compile --json`.
