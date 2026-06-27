# ADR-0001 — Repository IR v1

Status: Accepted · Owner: High-Reasoning AI (Architect) · Version: RIR 1.0.0

## Context

Software is represented in many disconnected artifacts (code, BRD/TDD, API specs,
schemas, tests, runtime, git). Existing tools analyze each in isolation and cannot
answer whether a capability is completely implemented, correctly connected,
documented, and verifiably executable end to end.

## Decision

All artifacts compile into one canonical **Repository IR (RIR)**. Natural language is
never stored as truth — only canonical facts with provenance. The RIR is a directed,
evidence-bearing property graph defined in `@rir/ir`:

- **Nodes** (`NodeIR`) — identity (`id`, `kind`, `name`, `hash`, `span`), execution
  facts (`reachable`, `entryDistance`, `runtimeObserved`, `tested`), and `evidence[]`.
- **Edges** (`EdgeIR`) — typed relations (`IMPORTS`, `CALLS`, `ROUTES_TO`, `READS`,
  `WRITES`, `EMITS`, `CONSUMES`, …), each with `evidence[]`.
- **Artifacts** (`ArtifactIR`) — content-hashed sources that produced facts.
- **Capabilities** (`CapabilityIR`) — repository capabilities bound to ontology ids,
  carrying `constraints[]`, member `nodes[]`, and a `ClosureState`.
- **Requirement IR** (`RequirementIR`) — documents normalized into facts, never prose.

## Invariants

1. Every node has identity; every edge has evidence. Nothing exists without provenance.
2. The RIR is the only source of truth. AI never writes into it.
3. Vocabularies (`NodeKind`, `EdgeKind`, `ClosureState`, …) are closed sets.
4. The schema is effectively immutable once released. Renames, new fields, or new enum
   members are **breaking** and require a version bump + migration (see ADR process).

## Consequences

- Deterministic engines (closure, coverage, consistency, query) operate on the RIR
  without AI.
- Low-reasoning implementers may not add fields here; schema changes escalate to the
  architect.

## Alternatives considered

- Per-artifact graphs (rejected: cannot verify cross-artifact closure).
- Storing prose + embeddings as truth (rejected: non-deterministic, no provenance).
