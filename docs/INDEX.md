# Documentation Index

The master cross-linked index for the RIR repository. Every document is reachable from
here.

## Architecture Index

- [requirement.md](../requirement.md) — vision & core intent
- [repo_structure.md](../repo_structure.md) — repository layout (immutable architecture)
- [ADR-0001 — Repository IR](ADR-0001-repository-ir.md)
- [ADR-0002 — Execution Closure](ADR-0002-execution-closure.md)
- [EOS operating manual](../eos/README.md)
- Governance: [decision1.md](../decision1.md) (implementer), [decision2.md](../decision2.md) (architect)

## Compiler Index

- Repository Compiler pipeline — [eos/policy/ci-gates.md](../eos/policy/ci-gates.md)
- Project Compiler — `eos/compiler/compile.ts` (validates + emits Project IR artifacts)
- Builder engine — `packages/builder-engine`
- Pass roster & ordering — `packages/passes`

## Package Index

| Package | Role |
| --- | --- |
| `@rir/ir` | Repository + Requirement IR schemas |
| `@rir/ontology` | capability ontology |
| `@rir/core` | compiler/builder/pass interfaces, registry, DI |
| `@rir/builder-engine` | pass runner |
| `@rir/passes` | pass roster |
| `@rir/code-compiler` | language adapters |
| `@rir/document-compiler` | document frontends |
| `@rir/graph` | graph algorithms |
| `@rir/closure` | execution closure engine |
| `@rir/coverage` | coverage engine |
| `@rir/consistency` | consistency engine |
| `@rir/query-engine` | deterministic graph queries |
| `@rir/semantic` | LLM projection (read-only) |
| `@rir/storage` | storage abstraction + SQLite schema |
| `@rir/telemetry` | runtime evidence ingestion |
| `@rir/common` | utilities |

Apps: `apps/cli`, `apps/compiler-api`, `apps/worker`.

## Builder Index

Canonical passes (see `packages/passes` and `eos/state/project.index.json`):
Import, Call, Route, Component, SQL, Event, Dependency, Ownership, Capability,
Constraint, Flow, Reachability, Documentation, Runtime, Git. Ordering is fixed and
architectural.

## Ontology Index

- Source: `packages/ontology/src/index.ts`
- Features: `AUTH` (LOGIN, REGISTER, LOGOUT, VERIFY_EMAIL, VERIFY_OTP, RESET_PASSWORD,
  REFRESH_TOKEN) — fully specified with expected execution chains, constraints, aliases.
- Governance: only `ROLE_ARCHITECT` may add/rename ontology concepts (ADR required).

## API Index

REST endpoints (`apps/compiler-api`): `POST /closure`, `/coverage`, `/consistency`,
`/query`, and `/compile/{code,document,repository}`, `/diff`, `/graph`, `/snapshot`
(501 until the builder pipeline is assembled). CLI: `rir version|ontology|validate|coverage`.

## Reference Index

External references are attached per TSPEC (`eos/state/project.index.json` →
`references`): Tree-sitter, ast-grep, LLVM passes, OpenAPI, AsyncAPI, JSON Schema,
Fastify, Zod, Kysely, better-sqlite3, Vitest, fast-check, remark, graphology,
OpenTelemetry, Tarjan SCC. Implementers never search — references are provided.

## Decision Index (ADRs)

- [ADR-0001 — Repository IR](ADR-0001-repository-ir.md) — TSPEC-A001
- [ADR-0002 — Execution Closure](ADR-0002-execution-closure.md) — TSPEC-A009
- New ADRs follow [eos/templates/adr-template.md](../eos/templates/adr-template.md) and
  reference their TSPEC.

## Research Index

Concept sources studied (notes only, no copied implementation) under `references/`:
LLVM (pass architecture, IR philosophy), Joern (code property graph), Semgrep / CodeQL
(rule concepts), RDF / Schema.org (ontology inspiration), OpenAPI / AsyncAPI (API/event
ontology).
