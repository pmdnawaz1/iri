# ADR-0014 — Semantic Projection Contract

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A014

## Context
AI must be isolated to a single, read-only boundary.

## Decision
`@rir/semantic` is the ONLY package permitted to call an LLM. `SemanticProjector` builds
a grounded prompt from an IR `Subgraph` and returns a disposable `Explanation`. It reads
the IR and never writes it.

## Invariants
1. No compiler/closure/coverage/consistency logic depends on AI.
2. Explanations are disposable; never canonical facts.
3. Prompts are grounded strictly in the provided subgraph.

## Consequences
AI can be removed entirely without affecting the determinism of the compiler.
