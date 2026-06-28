# IR Output — Formbricks (Surveys)

> Generated 2026-06-27 · Branch `code-ontology`  
> Source: [`https://github.com/formbricks/formbricks`](https://github.com/formbricks/formbricks)  
> Compiled subdir: `apps/web`

---

## Graph Stats

| Metric | Value |
|---|---|
| **Artifacts** (files parsed) | 2175 |
| **Nodes** | 12707 |
| **Edges** | 27102 |
| **Capabilities bound** | 5 |
| **Mapped to ontology** | 1 |
| **Unmapped (ORPHAN)** | 4 |

---

## Node Kind Breakdown

| Kind | Count |
|---|---|
| `VARIABLE` | 4970 |
| `MODULE` | 4140 |
| `FRONTEND_STATE` | 753 |
| `INTERFACE` | 705 |
| `TYPE` | 674 |
| `SQL_QUERY` | 593 |
| `FUNCTION` | 467 |
| `COMPONENT` | 111 |
| `RENDERED_UI` | 111 |
| `HANDLER` | 111 |
| `METHOD` | 34 |
| `CLASS` | 19 |
| `EVENT` | 11 |
| `ROUTE` | 5 |
| `EVENT_CONSUMER` | 2 |
| `API_CALL` | 1 |

---

## Routes Discovered (5)

- `POST /api/auth/callback/credentials`
- `POST /api/auth/signout`
- `POST /api/v1/management/storage`
- `POST /api/v2/management/contacts`
- `POST /v1/taxonomy/runs`

---

## Mapped Capabilities (1)

> These routes resolved to an existing ontology capability via the discovery cascade.

| Capability | Closure | Participating Nodes |
|---|---|---|
| `AUTH.LOGOUT` | ⚡ PARTIAL | 6 |

---

## Unmapped / ORPHAN Routes (4)

> These routes resolved to **no** ontology id. They are the **candidate worklist** for ontology proposals.
> Cross-reference against `docs/ontology-candidates/` for proposed features.

| Unmapped Capability | Notes |
|---|---|
| `UNMAPPED.POST_API_AUTH_CALLBACK_CREDENTIALS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_API_V1_MANAGEMENT_STORAGE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_API_V2_MANAGEMENT_CONTACTS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_V1_TAXONOMY_RUNS` | ontology gap — see proposal in candidates/ |

---

## Adapter Notes

> **File-based routing detected.** This repo uses Next.js App Router / Medusa v2 style — `route.ts` files export `GET`/`POST`/`DELETE` functions.
> The current `TypeScriptAdapter` only detects `app.get()` / `router.post()` patterns, so **rir compile** found 0 routes from standard detection.
> Routes above were extracted via a secondary directory-walk scan of `route.ts` exported verbs.
> **TSPEC-A017 fix needed**: add exported-verb detection to `TypeScriptAdapter`.


