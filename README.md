# Repository Intermediate Representation (RIR)

A **Software Knowledge Compiler**. Every software artifact — code, requirement
documents, API specs, schemas, tests, runtime, git — compiles into one canonical
**Repository IR**, against which deterministic engines verify that a capability is
completely implemented, correctly connected, documented, and executable end to end.

Natural language is never stored as truth. Only canonical facts with provenance. AI is
isolated to one optional, read-only package.

## Architecture

The repo is organized by **compiler stage**, not by language or frontend/backend.

```
apps/
  cli/             rir compile | diff | query | graph | validate | snapshot
  compiler-api/    Fastify REST API over the deterministic engines
  worker/          background jobs (compile, snapshot, git history)
packages/
  ir/              Repository IR + Requirement IR schemas (single source of truth)
  ontology/        canonical capability ontology (AUTH.* fully specified)
  core/            compiler/builder/pass interfaces, plugin registry, DI
  builder-engine/  pass runner over an IR draft
  passes/          canonical pass roster + fixed ordering
  code-compiler/   LanguageAdapter contract (Tree-sitter frontends)
  document-compiler/ document frontends -> Requirement IR
  graph/           directed-graph algorithms (reachability, topo, SCC)
  closure/         Execution Closure engine (the core innovation)
  coverage/        coverage engine
  consistency/     consistency / conflict detection
  query-engine/    deterministic graph queries (replaces vector search)
  semantic/        the ONLY package allowed to call an LLM (read-only)
  storage/         storage abstraction + canonical SQLite schema
  telemetry/       runtime evidence ingestion
  common/          logger, errors, hashing, ids
```

## Principles

1. Compiler-first architecture. 2. Every package independently testable. 3. No AI in
compiler packages. 4. AI isolated to `@rir/semantic`. 5. Every pass deterministic.
6. Every builder idempotent. 7. Golden tests for compiler outputs. 8. The Repository
IR is the only source of truth. 9. Plugins instead of language-specific hacks.
10. Correctness first, performance second.

See `docs/ADR-0001-repository-ir.md` and `docs/ADR-0002-execution-closure.md`.

## Quick start

```bash
pnpm install
pnpm build          # tsc -b across all packages/apps
pnpm test           # vitest

# CLI (after build)
node apps/cli/dist/index.js ontology
node apps/cli/dist/index.js validate fixtures/broken-repository/repository-ir.json
node apps/cli/dist/index.js coverage fixtures/broken-repository/repository-ir.json
```

## Governance

Architectural decisions (Repository IR, Requirement IR, ontology, closure/coverage/
consistency rules, builder contracts) are owned by the high-reasoning architect and
captured as ADRs. Implementation (adapters, parsers, storage, REST handlers, tests,
fixtures) follows those contracts deterministically. See the `decision*.md` and
`work_allocation*.md` manuals.

## Status

Scaffold complete and green: `pnpm build` (0 errors), `pnpm test` (passing). The
builder pipeline (language/document frontends + pass bodies) is the next
implementation milestone; compile/diff/query/graph/snapshot are wired but report the
pipeline is not yet assembled.

## Stack

TypeScript · Node 22 · pnpm · Fastify · Zod · Tree-sitter · ast-grep · SQLite · Kysely
· Vitest · Pino · remark · graphology
