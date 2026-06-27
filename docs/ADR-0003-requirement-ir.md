# ADR-0003 — Requirement IR

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A002 · Version: Requirement IR 1.0.0

## Context
Business documents must be comparable to code without comparing English to source.

## Decision
Documents compile into `RequirementIR` facts (`@rir/ir`): `{ feature, capability,
constraints[], outputs[], priority, evidence[] }`, aggregated into a versioned
`RequirementSet`. Never prose. Requirements bind to the same ontology ids as the
Repository IR, so document↔code comparison is a deterministic join on `capability` +
`constraints`, not NLP.

## Invariants
1. No natural language stored as truth — only normalized facts with evidence.
2. Requirement and Repository IR share ontology ids; comparison is set/graph logic.
3. Conflicting constraints (e.g. OTP_CHANNEL EMAIL vs SMS) are detected deterministically.

## Consequences
Document normalization (statement → fact) is architect-owned (see ADR-0009). The
Requirement IR schema is immutable once released; changes require a version bump.
