# IR Output — Twenty (CRM)

> Generated 2026-06-27 · Branch `code-ontology`  
> Source: [`https://github.com/twentyhq/twenty`](https://github.com/twentyhq/twenty)  
> Compiled subdir: `packages/twenty-server/src`

---

## Graph Stats

| Metric | Value |
|---|---|
| **Artifacts** (files parsed) | 6514 |
| **Nodes** | 32630 |
| **Edges** | 84167 |
| **Capabilities bound** | 5 |
| **Mapped to ontology** | 0 |
| **Unmapped (ORPHAN)** | 5 |

---

## Node Kind Breakdown

| Kind | Count |
|---|---|
| `MODULE` | 12494 |
| `VARIABLE` | 5477 |
| `SQL_QUERY` | 4889 |
| `METHOD` | 3306 |
| `CLASS` | 2185 |
| `TYPE` | 2058 |
| `FUNCTION` | 1142 |
| `SERVICE` | 719 |
| `INTERFACE` | 126 |
| `EVENT_CONSUMER` | 111 |
| `EVENT` | 70 |
| `CONTROLLER` | 43 |
| `ROUTE` | 5 |
| `REPOSITORY` | 4 |
| `FRONTEND_STATE` | 1 |

---

## Routes Discovered (5)

- `GET signingKeyPublicKey`
- `GET user`
- `GET userWorkspaceEntity`
- `GET workspaceEntity`
- `POST `

---

## Mapped Capabilities (0)

> These routes resolved to an existing ontology capability via the discovery cascade.

| Capability | Closure | Participating Nodes |
|---|---|---|
_None mapped._

---

## Unmapped / ORPHAN Routes (5)

> These routes resolved to **no** ontology id. They are the **candidate worklist** for ontology proposals.
> Cross-reference against `docs/ontology-candidates/` for proposed features.

| Unmapped Capability | Notes |
|---|---|
| `UNMAPPED.GET_SIGNINGKEYPUBLICKEY` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_USER` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_USERWORKSPACEENTITY` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_WORKSPACEENTITY` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_ROOT` | ontology gap — see proposal in candidates/ |

---

## Adapter Notes



> Standard Express/Fastify routing detected by `rir compile --json`.
