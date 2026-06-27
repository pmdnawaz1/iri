# ADR-0007 — Pass Roster & Ordering

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A006

## Context
The set of passes and their execution order must be fixed and canonical.

## Decision
`@rir/passes` declares the canonical roster: Import, Call, Route, Component, SQL, Event,
Dependency, Ownership, Capability, Constraint, Flow, Reachability, Documentation,
Runtime, Git. Declaration order is execution order; `PASS_PRIORITY` assigns ascending
priorities (×10). `AbstractPass` captures the shared shape.

## Invariants
1. One responsibility per pass; no overlap.
2. Implementers fill pass bodies but never add, remove, or reorder passes.
3. Each pass returns deterministic facts.

## Consequences
Adding a pass is an architectural change (new ADR + version bump). Node creation from
symbols and capability discovery (CapabilityPass) require architect decisions before
those specific passes can be handed off — see ADR-0006 open item.
