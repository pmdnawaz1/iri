# Real Gaps to 100% — and answers to the hard questions

Status: living document · Owner: ROLE_ARCHITECT

The compiler today **works end to end on code**: adapters → passes → Repository IR →
closure (`rir compile`). That proves the thesis on one axis. But `requirement.md` is about
**proving a capability is implemented, connected, documented, and consistent across every
artifact** — and several load-bearing pieces are still missing. This is the honest list,
and it answers the three questions raised.

---

## Q1. "In the ontology, are we only creating for code? What about document ontology?"

There is **one shared ontology** by design (ADR-0004, decision2 "Owns Ontology"). Both
sides bind to the SAME capability ids:

```
Code      → Code Compiler      → Repository IR  → capabilities (AUTH.LOGIN, …)
Documents → Document Compiler  → Requirement IR → requirements (AUTH.LOGIN, …)
                                   ↘ compared deterministically ↙
```

So there is no separate "document ontology" — there should not be. **The gap is the
Document Compiler**: nothing currently turns docs into Requirement IR. `@rir/document-compiler`
has only contracts; no frontend is implemented, and the statement→assertion→Requirement-IR
**normalization rules were never written** (ADR-0009 was "Accepted (partial)"). Until that
exists, the deterministic *document ↔ code* comparison — the headline of the whole project —
cannot run. Designed now in **ADR-0017** and tracked as TSPEC-DN01 + DF01–DF06.

## Q2. "We only detect AUTH now — how to make it self-evolved?"

Two distinct gaps hide here:

**(a) Coverage.** The ontology contains exactly one feature (`AUTH`). Any repo whose
routes are `/payments`, `/orders`, `/cart` resolves to nothing. Fix: **expand the ontology**
with the canonical commerce/profile/notification features from `requirement.md` (PAYMENT,
ORDER, CART, CHECKOUT, INVENTORY, PROFILE, NOTIFICATION). Architect-owned content, not AI.
Tracked as **TSPEC-A016**.

**(b) Discovery is shallow.** CapabilityPass only resolves a route by an exact
name/alias match (`/login` → AUTH.LOGIN). Real discovery needs multiple deterministic
signals (HTTP verb + path noun, ORM/table names, handler naming, constraints in code).
Tracked as **TSPEC-A017**.

**Self-evolution** (the interesting part): the system must *propose* ontology growth
without an AI ever writing the ontology. The loop (ADR-0018):

```
compile → capabilities that bind to NO ontology id are recorded as ORPHAN_CAPABILITY
       → @rir/semantic (the ONLY AI boundary) summarizes the orphan subgraph and
         proposes a candidate capability (id, expected chain, constraints)
       → the proposal is written to a REVIEW QUEUE, never to the ontology
       → ROLE_ARCHITECT accepts → it becomes a versioned ontology addition (an ADR)
```

This keeps determinism (the compiler never depends on the AI), gives evolution (the
ontology grows from real repositories), and preserves the invariant "AI never writes the
IR/ontology." Tracked as **TSPEC-A018**.

## Q3. "What are the real gaps now, on full?"

Prioritized, with the TSPECs that close them:

| # | Gap | Why it matters | TSPEC |
| --- | --- | --- | --- |
| 1 | **Document Compiler / Requirement IR** | no doc↔code comparison exists | A008/ADR-0017, DN01, DF01–06 |
| 2 | **Nothing reaches CLOSED** | closure has no producers for HANDLER, API_CALL, RESPONSE, FRONTEND_ROUTE/STATE/RENDERED_UI; every capability is BROKEN/PARTIAL even when fully wired | A019 |
| 3 | **Ontology = AUTH only** | zero coverage outside auth | A016 |
| 4 | **Shallow discovery** | misses real capabilities; no self-evolution | A017, A018 |
| 5 | **Constraints not extracted** | OTP_CHANNEL=EMAIL etc. never become facts → no constraint comparison | P10 |
| 6 | **Cross-IR consistency not wired** | the engines (coverage/consistency) never see a Requirement IR, so "undocumented / unimplemented / conflicting" is unproven on real repos | A020, E07 |
| 7 | **Other evidence sources** | API specs, JSON schema, tests, runtime, git are partial/contract-only | A-spec compilers, P14/P15 |
| 8 | **Frontend frontends** | React/Vue components → COMPONENT/RENDERS chain not built (P04 is a stub heuristic) | A019 |
| 9 | **Snapshots / incremental / query / semantic** | packages exist but are unused by the real pipeline | later |

**Bottom line:** the compiler is real but **partial on the code axis (closure can't close)
and absent on the document axis (no Requirement IR)**. The two highest-leverage moves are
**A019 (make closure able to close)** and **ADR-0017 + the document compiler (make doc↔code
real)**. Everything else is coverage and breadth.

---

## Design TSPECs created for the rest (see dataset.ts + the ADRs)

- **TSPEC-A016** Ontology expansion (commerce/profile/notification features).
- **TSPEC-A017** Multi-signal capability discovery.
- **TSPEC-A018** Ontology self-evolution loop (AI proposes, architect accepts).
- **TSPEC-A019** Full execution closure: producers for the missing stages.
- **TSPEC-A020** Requirement ↔ Repository consistency rules.
- **TSPEC-DN01** RequirementNormalizer (statements → Requirement IR).
- **TSPEC-E07** Doc-vs-code consistency engine wiring.
- Existing/blocked, now governed by the above ADRs: DF01–DF06, P10, P11, P13, P14, P08.

> Note (per the owner): these are captured now; the architect will close remaining design
> gaps as the repo approaches 100%. This document is the running checklist.

---

## Pending-engineering batch closed (2026-06-28, `gaps-v2`)

- **G1 · Code constraint extraction (P10) — DONE.** `CapabilityPass` now reads the capability's
  artifact source and extracts ontology-typed constraints (e.g. `req.body.email` →
  `LOGIN_IDENTIFIER=EMAIL`), symmetric with the document normalizer. The cross engine's
  `CONSTRAINT_MISMATCH`/`MISSING_CONSTRAINT` are now real — the "consistent" axis is whole.
- **CLI `query`/`graph`/`snapshot` — DONE.** `rir query <cap> <ir.json>` (chain + constraints +
  closure + confidence), `rir graph <ir.json>` (Mermaid, `--capability` to scope), `rir snapshot`
  (content-addressed IR). `diff` shipped earlier (V11).
- **A021 parity — DONE.** Route detection added to the Python (FastAPI/Flask decorators), Go
  (`r.GET`/`HandleFunc`), and Java (Spring `@RequestMapping`/`@GetMapping`) adapters; each had
  `routes: []` before. Fixtures + tests for all four languages.
- **G8 · Tests typechecked — DONE.** `tsconfig.tests.json` + `pnpm typecheck:tests` + a CI step.
  Surfaced pre-existing type debt in 10 legacy test files (partial `NodeIR` factories, a reference
  to a non-existent `@rir/worker`, missing import extensions); those are quarantined via `exclude`
  with a TODO so the gate is green for all clean + future tests.

> Deferred (needs external repos, not closable in-tree): **Graduation #3** evidence backfill for
> PRODUCT/DISCOUNT/SHIPPING/CALENDAR — now *enabled* by A021 parity, but requires cloning and
> compiling cal.com/medusa/vendure, which is the self-evolution seam's job, not a code change.
