# ADR-0023 — Ontology Graduation #2 (the held candidates)

Status: Accepted · Owner: ROLE_ARCHITECT · Ontology: 1.2.0 → 1.3.0 (builds on ADR-0021)

## Context

ADR-0021 graduated 5 clean features and HELD the discovery-sensitive and single-repo candidates
pending the adapter route-detection fix (TSPEC-A021). By architect directive we now graduate the
remainder so the ontology covers them today; A021 still lands later to backfill evidence.

## Decision

Graduate **nine** features, `ONTOLOGY_VERSION` 1.2.0 → 1.3.0 (22 features, 93 capabilities):

| Feature | Capabilities | Evidence |
| --- | --- | --- |
| `SCHEDULE` | CREATE, CANCEL, RESCHEDULE, GET_AVAILABILITY, LIST | cal.com, medusa |
| `WORKFLOW` | CREATE, UPDATE, DELETE, TRIGGER, PAUSE, LIST, GET_RUNS | novu, medusa, directus |
| `SUBSCRIPTION` | CREATE, CANCEL, UPDATE, LIST, GET | novu, medusa, directus |
| `OAUTH` | AUTHORIZE, EXCHANGE_TOKEN, REFRESH | cal.com, directus |
| `INTEGRATION` | CREATE, LIST, DELETE | novu, directus |
| `PRODUCT` | CREATE, UPDATE, DELETE, LIST, GET, CREATE_VARIANT, CREATE_CATEGORY | medusa (+directus, weak) |
| `DISCOUNT` | CREATE, UPDATE, DELETE, LIST, APPLY, CREATE_CAMPAIGN | medusa |
| `SHIPPING` | CREATE_OPTION, GET_RATES, FULFILL, RETURN, EXCHANGE | medusa |
| `CALENDAR` | CONNECT, GET_BUSY_TIMES, LIST_CONNECTIONS, SYNC | cal.com |

### Architect cleanups applied during review
- **OAUTH split from INTEGRATION** (the proposal bundled both); they are distinct features.
- **SUBSCRIPTION trimmed** of cal.com `/reservations` (that is booking → `SCHEDULE`).
- **CONFERENCING dropped** from the CALENDAR proposal (single-repo, niche).
- **Constraints deferred** (as in graduation #1): no enums until the consistency engine needs them
  with code evidence.

### Alias hygiene (important)
Aliases are a **global, unique** namespace and the resolver returns on the FIRST matching token, so
a common English word used as an alias hijacks unrelated text. Two real misfires were caught and
fixed before graduating:
- `"return"` (SHIPPING) captured an OpenAPI login summary *"…and **return** a token"* → `/login`
  mis-resolved to `SHIPPING.RETURN`.
- `"product"` (PRODUCT) captured *"The **product** must support authentication"*.

Mitigations: dropped common-word aliases (`return`, `returns`, `book`, `available`, `run`,
`connect`, `sync`); de-collided shared aliases (`trigger`→WEBHOOK, `reserve`→INVENTORY,
`exchange`→SHIPPING, `availability`→SCHEDULE); and extended the doc resolver's generic-name guard
(`return connect sync run book available` join the CRUD verbs that never resolve a capability by
bare name — a domain alias is required). `PRODUCT` keeps `product`/`products` (the correct alias);
generic prose using "product" loosely is exactly the ambiguity the seam + human review absorb.

## Consequences

- 9 new domains resolve from routes/docs; UNMAPPED shrinks further.
- `PRODUCT`, `DISCOUNT`, `SHIPPING`, `CALENDAR` rest on a single strong repo (medusa or cal.com).
  They are accepted now but **flagged for evidence backfill**: once TSPEC-A021 lets the adapter see
  NestJS-decorator and file-based routes, re-compile vendure (commerce) and a 2nd scheduling repo to
  confirm the 2+ rule, and record it in a follow-up note.
- All `docs/ontology-candidates/*.md` have now graduated; the queue is empty except
  `DISCOVERY-MISSES.md` (feeds A021) and the worklists.
