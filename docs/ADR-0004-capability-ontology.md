# ADR-0004 — Capability Ontology

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A003 · Version: Ontology 1.0.0

## Context
Capabilities must be canonical across repositories and languages, independent of frameworks.

## Decision
`@rir/ontology` defines features → capabilities with `expectedChain` (ontology-owned
`ExecutionStage`s), typed `constraints`, `outputs`, and explicitly-declared `aliases`.
AUTH is fully specified as the reference feature. It describes SOFTWARE concepts
(AUTH.LOGIN), never FRAMEWORK concepts (ExpressLoginRoute).

## Invariants
1. Only ROLE_ARCHITECT may add/rename/deprecate ontology concepts; additive + versioned.
2. Alias resolution is explicit only — "signin"→LOGIN works because it is declared; no guessing.
3. Closed vocabularies; `ExecutionStage` belongs to the ontology, not the IR.

## Consequences
Capability discovery binds repository nodes to these ids; it never invents ids. New
domains are added because many repositories share them, not because one repository needs one.
