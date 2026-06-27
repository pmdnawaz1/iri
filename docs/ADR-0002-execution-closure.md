# ADR-0002 — Execution Closure Algorithm

Status: Accepted · Owner: High-Reasoning AI (Architect) · Version: RIR 1.0.0

## Context

A capability that merely *exists* in code is not complete. Completeness requires that
its execution path be connected end to end. This is the project's core innovation:
deterministic verification of capability closure, with no AI in the decision.

## Decision

Each ontology capability declares an ordered `expectedChain` of `ExecutionStage`s
(`@rir/ontology`). The closure engine (`@rir/closure`) maps reachable Repository IR
nodes onto stages via `STAGE_OF_NODE_KIND` and compares present vs. expected stages to
produce a `ClosureState`.

### Stage mapping

Only node kinds that participate in execution map to a stage (e.g. `ROUTE →
BACKEND_ROUTE`, `CONTROLLER → CONTROLLER`, `SQL_QUERY/TABLE → DATABASE`). Kinds like
`VARIABLE` or `TEST` do not participate.

### Classification rules (priority order)

1. **CONFLICTING** — caller-supplied (set by the consistency engine); never inferred
   inside closure.
2. **ORPHAN** — no participating nodes at all.
3. **UNREACHABLE** — nodes exist but none are reachable from an entrypoint.
4. **CLOSED** — every expected stage is present.
5. **PARTIAL** — execution stops short: present stages form a prefix, later stages
   missing, with no gap *after* a present stage.
6. **BROKEN** — the chain is interrupted: a present stage follows a missing earlier
   stage (`isChainInterrupted`).

The PARTIAL-vs-BROKEN distinction is the key rule: *stopping short* differs from a
*hole in the middle*. A missing leading frontend with a present backend is BROKEN.

## Properties

- **Deterministic & idempotent** — output depends only on the RIR and the ontology.
- **Pure** — `evaluateClosure` mutates nothing; `DefaultClosureEngine` iterates all
  capabilities.
- **Evidence-grounded** — only `reachable` nodes count toward present stages.

## Consequences

- Missing edges produce specific failures (dangling routes, unused frontend, missing
  DB writes, broken API chains) rather than a vague score.
- Changing the stage mapping or the classification rules is architectural and requires
  a new ADR + version bump.

## Verified by

`tests/closure/closure.test.ts` (ORPHAN, UNREACHABLE, BROKEN, CONFLICTING) and the
`fixtures/broken-repository` golden IR, which classifies a backend-only `AUTH.LOGIN` as
BROKEN.
