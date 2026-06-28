# ADR-0021 — Ontology Graduation #1 (self-evolution review queue → ontology)

Status: Accepted · Owner: ROLE_ARCHITECT · Ontology: 1.1.0 → 1.2.0 (builds on ADR-0018)

## Context

The semantic seam (driven by `evolution/ontology-self-evolution.md`) compiled real repositories
and filed 13 feature proposals into `docs/ontology-candidates/` (the review queue, per ADR-0018),
plus a `DISCOVERY-MISSES.md` report. The architect's job is to accept proposals into the canonical
ontology — never the AI's. This ADR records the first graduation.

## Decision

Graduate **five** features that meet the cross-repo bar (≥2 independent repos) on evidence the
TypeScript adapter reliably detects (Express/Nest-style and explicit routes), bumping
`ONTOLOGY_VERSION` 1.1.0 → 1.2.0:

| Feature | Capabilities | Repos (evidence) |
| --- | --- | --- |
| `WEBHOOK` | CREATE, LIST, GET, UPDATE, DELETE, TRIGGER | novu, cal.com, directus, medusa |
| `TEAM` | CREATE, UPDATE, DELETE, LIST, INVITE_MEMBER, REMOVE_MEMBER, LIST_MEMBERS | medusa, cal.com, novu, directus, formbricks |
| `API_KEY` | CREATE, LIST, REVOKE, ROTATE | medusa, cal.com |
| `FILE` | UPLOAD, DOWNLOAD, DELETE, LIST, GET_URL | directus, medusa, novu, cal.com |
| `SEARCH` | QUERY | directus, medusa, twenty, novu |

Trims applied during review (architect-owned):
- `API_KEY` — dropped the directus TFA/`/auth` and novu `/test/token` evidence (that is MFA/auth,
  not key management); the clean signal is medusa + cal.com. Dropped the `refresh` alias (already
  owned by `AUTH.REFRESH_TOKEN`) and the speculative `MFA_METHOD` constraint.
- `SEARCH` — graduated only `SEARCH.QUERY` (the evidenced capability); `SUGGEST`/`INDEX` had no
  route evidence.
- Proposed constraints (e.g. `MEMBER_ROLE`, `WEBHOOK_EVENT`) are **deferred**: the expanded
  ontology carries no constraints yet (matching PAYMENT/ORDER/…); constraints graduate when the
  consistency engine needs them, with code evidence.

## Held (not graduated)

- **Single-repo (fail the 2+ rule):** `CALENDAR` (cal.com only; also redundant with `SCHEDULE`),
  `DISCOUNT` (medusa only), `SHIPPING` (medusa only).
- **Discovery-sensitive:** `SCHEDULE`, `WORKFLOW`, `SUBSCRIPTION`, `OAUTH`/`INTEGRATION`,
  `PRODUCT`. Their cross-repo counts lean on cal.com (NestJS decorators) and medusa (file-based
  `route.ts`) routes the adapter largely could **not** see (`DISCOVERY-MISSES.md`). Graduating them
  now would grow the ontology from a distorted view. They re-enter the queue after TSPEC-A021
  (adapter route detection) lands and the corpus is re-compiled. `SUBSCRIPTION` additionally needs
  its cal.com `/reservations` evidence dropped (that is booking → `SCHEDULE`); `OAUTH` must split
  into `OAUTH` + `INTEGRATION`.

## Consequences

- Routes like `POST /webhooks`, `POST /teams`, `POST /api-keys`, `POST /uploads` now resolve to a
  capability instead of `UNMAPPED`; coverage grows on the next compile.
- Generic capability names (`CREATE`/`LIST`/`GET`/…) now recur across features. The doc normalizer
  resolves section/alias tokens first, so this is consistent with the pre-existing `ORDER.UPDATE` vs
  `PROFILE.UPDATE` collision; it is not a regression. A future resolver pass may prefer
  domain-aliased matches over bare-verb names.
- The graduated candidate files in `docs/ontology-candidates/` should be removed (they have
  graduated); the held ones remain in the queue.
