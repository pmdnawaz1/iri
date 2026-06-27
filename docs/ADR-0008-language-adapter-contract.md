# ADR-0008 — Language Adapter Contract

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A007

## Context
Every language frontend must expose the same syntactic facts to the passes.

## Decision
`@rir/code-compiler` defines `LanguageAdapter` (`supports`, `parse`) producing a
`ParseResult` of `symbols`, `imports`, `exports`, `calls`, `routes` — purely syntactic,
no semantic interpretation. An `AdapterRegistry` selects an adapter by path.

## Invariants
1. Adapters emit facts AS WRITTEN; they do not resolve calls or build IR (that is passes).
2. The contract is identical across languages.
3. Per-language backend is an adapter detail: the TypeScript adapter uses the TypeScript
   Compiler API (see TSPEC-AD01); other languages use Tree-sitter.

## Consequences
The proving slice (`apps/cli/src/prove.ts`) is the reference extraction shape for AD01.
