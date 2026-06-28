# IR Output — Cal.com (Scheduling)

> Generated 2026-06-27 · Branch `code-ontology`  
> Source: [`https://github.com/calcom/cal.com`](https://github.com/calcom/cal.com)  
> Compiled subdir: `apps/api/v2/src`

---

## Graph Stats

| Metric | Value |
|---|---|
| **Artifacts** (files parsed) | 583 |
| **Nodes** | 3369 |
| **Edges** | 8708 |
| **Capabilities bound** | 13 |
| **Mapped to ontology** | 0 |
| **Unmapped (ORPHAN)** | 13 |

---

## Node Kind Breakdown

| Kind | Count |
|---|---|
| `MODULE` | 1242 |
| `METHOD` | 807 |
| `CLASS` | 428 |
| `SQL_QUERY` | 348 |
| `VARIABLE` | 173 |
| `TYPE` | 110 |
| `SERVICE` | 81 |
| `FUNCTION` | 68 |
| `REPOSITORY` | 40 |
| `CONTROLLER` | 27 |
| `INTERFACE` | 21 |
| `ROUTE` | 13 |
| `EVENT_CONSUMER` | 11 |

---

## Routes Discovered (13)

- `GET api.port`
- `GET db.readPoolMax`
- `GET db.readUrl`
- `GET db.redisUrl`
- `GET db.usePool`
- `GET db.workerReadPoolMax`
- `GET db.workerWritePoolMax`
- `GET db.writePoolMax`
- `GET db.writeUrl`
- `GET e2e`
- `GET env.type`
- `GET next.authSecret`
- `GET stripe.apiKey`

---

## Mapped Capabilities (0)

> These routes resolved to an existing ontology capability via the discovery cascade.

| Capability | Closure | Participating Nodes |
|---|---|---|
_None mapped._

---

## Unmapped / ORPHAN Routes (13)

> These routes resolved to **no** ontology id. They are the **candidate worklist** for ontology proposals.
> Cross-reference against `docs/ontology-candidates/` for proposed features.

| Unmapped Capability | Notes |
|---|---|
| `UNMAPPED.GET_API_PORT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_READPOOLMAX` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_READURL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_REDISURL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_USEPOOL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_WORKERREADPOOLMAX` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_WORKERWRITEPOOLMAX` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_WRITEPOOLMAX` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DB_WRITEURL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_E2E` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ENV_TYPE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_NEXT_AUTHSECRET` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_STRIPE_APIKEY` | ontology gap — see proposal in candidates/ |

---

## Adapter Notes


> **NestJS decorator routing.** This repo uses `@Get()`, `@Post()` decorators.
> The current `TypeScriptAdapter` does not detect decorator-based routes — routes above were extracted via regex scan of decorator patterns.
> **TSPEC-A017 fix needed**: add `@Get()`/`@Post()` decorator detection to `TypeScriptAdapter`.

