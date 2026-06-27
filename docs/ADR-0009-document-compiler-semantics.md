# ADR-0009 — Document Compiler Semantics

Status: Accepted (partial) · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A008

## Context
Documents must become Requirement IR facts deterministically.

## Decision
`@rir/document-compiler` defines `DocumentFrontend` (structure extraction only:
headings, statements) and `RequirementNormalizer` (statements → Requirement IR). Frontends
never interpret business meaning; normalization maps to ontology ids/constraints.

## Invariants
1. Frontends extract STRUCTURE only; no prose stored as truth.
2. Normalization binds to ontology ids; unmapped statements escalate, never guess.

## Open item (deferred — blocks document frontends)
The detailed normalization ruleset (statement → assertion → constraint, conflict/scope
rules) is NOT yet fully specified. It is architect-owned and remains design work before
TSPEC-DF* can be handed off.
