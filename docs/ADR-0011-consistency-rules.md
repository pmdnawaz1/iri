# ADR-0011 — Consistency Rules

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A011

## Context
Inconsistencies must be detected deterministically and reported, never auto-resolved.

## Decision
`@rir/consistency` defines `FindingCode` (CONSTRAINT_CONFLICT, DUPLICATE_CAPABILITY,
UNKNOWN_CAPABILITY, UNKNOWN_CONSTRAINT_KEY, INVALID_CONSTRAINT_VALUE, BROKEN_REFERENCE)
and `Severity`. `DefaultConsistencyEngine.check(ir)` returns findings with subject ids.

## Invariants
1. The engine reports; it never edits the IR or resolves conflicts.
2. Constraint validity is checked against the ontology definition (type + enum values).
3. Detection is pure and deterministic.

## Consequences
The CONFLICTING closure state is set from consistency findings, not inferred inside closure.
