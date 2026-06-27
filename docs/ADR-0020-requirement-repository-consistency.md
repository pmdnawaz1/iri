# ADR-0020 — Requirement ↔ Repository Consistency

Status: Proposed · Owner: ROLE_ARCHITECT · TSPEC: A020, E07 (builds on ADR-0011)

## Context

The consistency engine (ADR-0011) validates a single Repository IR. The project's headline
question — "is the capability documented AND implemented AND consistent?" — needs the
**Requirement IR (docs)** and the **Repository IR (code)** compared. That join does not exist
yet.

## Decision

A top-level `CrossConsistencyEngine` joins the two IRs by ontology id and emits findings.
Pure set/graph logic on canonical facts; no AI.

Join key: `capability` id (and, for constraints, `(capability, constraint key)`).

| Finding | Condition |
| --- | --- |
| `UNIMPLEMENTED` | required in Requirement IR; absent in Repository IR (or present but closure ≠ CLOSED) |
| `UNDOCUMENTED` | present/CLOSED in Repository IR; absent in Requirement IR |
| `CONSTRAINT_MISMATCH` | same `(capability, key)`, different values across the two IRs |
| `MISSING_CONSTRAINT` | constraint required by Requirement IR; absent in the implementation |
| `OVERIMPLEMENTED` | implemented capability with `priority: WONT` (or not in any requirement) |

Severity by requirement `priority`: a `MUST` that is `UNIMPLEMENTED` is `ERROR`; a `COULD`
is `WARNING`. Output is a deterministic report consumable by the CLI/API and the coverage
engine (documentation/requirement coverage become real once a Requirement IR exists).

## Invariants

1. Comparison is a deterministic join on ontology ids — never document-text vs source.
2. The engine reports; it never edits either IR.
3. Findings are reproducible and carry the evidence from both sides.

## Consequences

- TSPEC-A020 specifies the rules; TSPEC-E07 implements `CrossConsistencyEngine` + wires it
  into `rir compile` (and the API) when a docs path is provided.
- Requires the Document Compiler (ADR-0017) to produce a Requirement IR; until then the engine
  runs with an empty Requirement IR (everything implemented is `UNDOCUMENTED`, which is itself
  a useful signal).
