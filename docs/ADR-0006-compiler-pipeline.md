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

## Resolved (ADR-0016)
The `IRDraft` read contract is now defined: `getNodes()`, `getEdges()`, `getNode(id)`,
`getCapabilities()`, with idempotent writes by id. The frontend→pass data flow
(`CompilationContext.parseResults`) and node-creation/classification model are also
decided in ADR-0016. The pass layer (TSPEC-P*) is unblocked.
