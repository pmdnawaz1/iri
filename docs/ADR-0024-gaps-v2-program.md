# ADR-0024 — GAPS-v2 program: from topology to truth

Status: Accepted (partial — see table) · Owner: ROLE_ARCHITECT · TSPEC: A022–A032 · Source: docs/GAPS-V2.md

## Context

`docs/GAPS-V2.md` lists eleven ways the headline claim — "completely implemented, correctly
connected, documented, and **verifiably executable end to end**" — is false even when every test is
green and every capability reads `CLOSED`. These are not implementation TODOs (those are GAPS.md /
A0xx); they challenge the *model*. This ADR records the decisions and what shipped vs what is
designed-and-queued. Determinism is preserved everywhere: nothing here puts AI in the truth path.

## Decisions

| Gap | Decision | TSPEC | Status |
| --- | --- | --- | --- |
| **V10** Scope | A repo declares what it claims to be in `rir.scope.yaml` (`features`/`capabilities`). The cross engine filters findings to scope; out-of-scope implemented capabilities become `OUT_OF_SCOPE`. Without the file, all capabilities are in scope (back-compat). | A022 | **Shipped** |
| **V3** Graded closure | `ClosureResult.confidence` = weakest-link evidence confidence across the participating nodes (unevidenced node = 0.5; ORPHAN = 0). A CLOSED built on inference no longer looks like one proven by AST facts. | A023 | **Shipped** |
| **V5** Guard closure | A second, negative-space closure: `requiresAuth(cap)` capabilities that expose a route but show no auth/authorization guard on their path are `GUARD_MISSING`. Guard recognized deterministically by node naming (first cut). | A024 | **Shipped** |
| **V8** Criticality | `getCriticality(cap)` (CRITICAL/HIGH/NORMAL/LOW) by feature; every cross + guard finding carries it; reports sort by it. Lets the gate ask "is any *critical* capability not *securely* closed?" | A025 | **Shipped** |
| **V11** Drift | `diffClosures(before, after)` ranks states CLOSED→ORPHAN and reports `REGRESSED`/`IMPROVED`/`CHANGED`; `rir diff a.json b.json` exits 1 on any regression — a CI gate. | A026 | **Shipped** |
| **V2** Executable probe | Synthesize a probe (route + input shape + expected output) and promote `CLOSED → EXECUTABLE` only when it passes. Needs running the target app — a runner/sandbox boundary. | A027 | **Designed** |
| **V1** Behavioral closure | Link a capability to the test(s)/dataflow that actually exercise *its* path (not just node existence). Needs test-coverage mapping + dataflow. | A028 | **Designed** |
| **V4** Runtime fusion | Produce `EvidenceSource.RUNTIME` from boot/trace data and reconcile static vs runtime edges (DI, event buses, flags). | A029 | **Designed** |
| **V6** State-machine capability | Model alternate/exception paths (LOGIN: MFA/locked/rate-limited) in the ontology so a happy-path-only impl is distinguishable from a complete one. | A030 | **Designed** |
| **V7** Requirement authority | Weight requirements by source authority/freshness (signed PRD > README TODO; last-touched vs code) so severity reflects *which* doc. | A031 | **Designed** |
| **V9** Cross-repo linking | Stitch capabilities across repos by API/contract schema so a distributed capability can close. Needs a multi-repo IR index. | A032 | **Designed** |

## Why these five shipped first

V10 + V8 make the consistency report *usable and prioritized* on a real repo (the prerequisite for
any gate). V5 unlocks the highest-value question RIR couldn't ask (security as required-absence).
V3 stops a weak CLOSED from masquerading as a strong one. V11 turns the whole thing into a CI gate.
The six "Designed" gaps each need a capability RIR does not have yet — executing apps (V2),
dataflow (V1), traces (V4), a richer ontology schema (V6), doc provenance (V7), or multiple repos
(V9) — and are scoped as their own TSPECs rather than faked.

## Consequences

- New finding codes: `OUT_OF_SCOPE` (cross), `GUARD_MISSING` (guard). New CLI: `rir diff`.
- `compileWithDocuments` now returns `{ guardFindings, scope }` and reads `rir.scope.yaml`.
- `ClosureResult` gains `confidence` (additive; existing consumers unaffected).
- The honest status line: RIR still proves **topology + documentation + scope + guard presence**,
  not yet **behavior or execution** — V1/V2 remain the frontier and are explicitly queued.
