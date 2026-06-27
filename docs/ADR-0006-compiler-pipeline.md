# ADR-0006 — Compiler Pipeline & Builder Contracts

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A005

## Context
Artifacts must compile into the IR through composable, deterministic, ordered passes.

## Decision
`@rir/core` defines `Compiler`, `Builder`, `Pass`, `IRDraft`, `CompilationContext`, a
`PluginRegistry` (stable priority ordering), and a token `Container` (DI). Passes own one
responsibility, are deterministic and idempotent, and communicate ONLY through the IR.

## Invariants
1. Builder/pass ordering is architectural; never reordered to "fix" a bug.
2. Plugins register builders; no language-specific hacks in the core.
3. No hidden shared state between passes.

## Open item (deferred — blocks the pass layer)
`IRDraft` is currently write-only (`addNode/addEdge/seal`). Passes that must consume
earlier passes' output (e.g. ReachabilityPass reading nodes+edges) require read access.
A read contract (`getNodes()/getEdges()`) is a pending architect decision (future ADR)
that must land before TSPEC-P* can be handed off.
