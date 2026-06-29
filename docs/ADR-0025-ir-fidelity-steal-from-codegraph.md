# ADR-0025 — IR fidelity: a resolution layer + node/edge depth (steal from CodeGraph)

Status: Accepted (program) · Owner: ROLE_ARCHITECT · TSPEC: F01–F29 · Source: docs/codegraph-comparison-table.md

## Context (the hard truth)

Running RIR against a real NestJS backend (`cal.com/apps/api/v2/src`) exposed that the headline —
"documented AND implemented AND consistent, end to end" — has only ever run on hand-wired fixtures.
On real code:

- **0 CLOSED capabilities** (111 ORPHAN, 21 PARTIAL). Every "CLOSED" demo was a rigged fixture.
- **~132 routes vs CodeGraph's 314** (incl. false positives like `GET api.port` from
  `configService.get(...)`).
- **8,708 edges vs 144,689** — the call graph is ~160× too shallow (288 `CALLS` vs 46,659).
- `reachable:false` on 3,356/3,369 nodes; no signatures, qualified names, containment, inheritance,
  instantiation, decorators-as-data.

The root cause is singular: **RIR extracts an AST but has no resolution layer.** Real frameworks
wire route→controller→service→repository through **import resolution + dependency injection**, not
the direct `.call()` edges RIR detects. CodeGraph closes that gap with `src/resolution/`
(import-resolver, name-matcher, per-framework route/DI resolvers, dynamic-dispatch synthesizers).
Until RIR has the equivalent, closure will keep returning ORPHAN no matter how good the ontology is.

CodeGraph is MIT-ish TypeScript + tree-sitter — the same stack as RIR — so the steals are **direct
file copies adapted to our IR**, not reimplementations. Extraction stays deterministic (AST-derived,
no LLM), preserving RIR's core invariant.

## Decision

Adopt CodeGraph's depth in eight workstreams (TSPEC F01–F28). RIR **keeps** its differentiators
(capabilities, closure, guard, tier model, evidence/confidence, scope, drift) and **gains**
CodeGraph's structural fidelity underneath them. Two non-negotiables:

1. **Keep the RIR IR shape** (`packages/ir`) — add fields/kinds, never adopt CodeGraph's SQLite. The
   IR stays a single portable JSON. Steal the *logic*, map the *output* to NodeIR/EdgeIR.
2. **Resolution before closure.** F13–F18 (resolution + reachability) are the load-bearing fixes;
   the node/edge enrichment (F01–F12) feeds them. Do resolution first or closure stays ORPHAN.

### Copy-from mapping (steal → adapt)

| RIR target | Copy from `inspirations/codegraph/src/…` | Adapt to |
| --- | --- | --- |
| NodeIR rich fields | `extraction/index.ts`, `extraction/languages/typescript.ts`, `types.ts` (Node) | `packages/ir` NodeIR + `packages/code-compiler` adapters |
| Decorators-as-data | decorator handling in `extraction/index.ts` + `languages/typescript.ts` | NodeIR.decorators + DECORATES edges |
| CONTAINS/EXTENDS/IMPLEMENTS/INSTANTIATES/REFERENCES/DECORATES edges | `extraction/index.ts` (edge assembly), `types.ts` (EdgeKind) | `packages/ir` EdgeKind + adapters |
| New node kinds (property/field/constant/enum/type_alias/import) | `types.ts` NodeKind + `extraction/index.ts` | `packages/ir` NodeKind + adapters |
| Import resolution + name matching (deep calls) | `resolution/import-resolver.ts`, `resolution/name-matcher.ts`, `resolution/path-aliases.ts` | new `packages/resolution` pass |
| Framework route + DI resolution | `resolution/frameworks/{nestjs,express,java,python,go}.ts`, `resolution/frameworks/index.ts` | `packages/resolution` framework resolvers |
| Dynamic-dispatch synthesis | `resolution/callback-synthesizer.ts` | `packages/resolution` synthesizers |
| Full-text search | `search/query-parser.ts`, `search/query-utils.ts` | `rir search` CLI |
| files[] metadata + schema versioning | `db/schema.sql` (files table), `db/migrations.ts` | IR `files[]` + `schemaVersion` header |

## The executable steal: `tools/steal/codegraph-to-rir.mjs`

The steal is not aspirational — it runs today. `tools/steal/codegraph-to-rir.mjs` reads a
CodeGraph SQLite DB (`<repo>/.codegraph/codegraph.db`) and emits a RIR-shaped IR JSON, applying
the schema mapping below. On `cal.com/.codegraph/codegraph.db` it produced **56,871 nodes /
144,689 edges**, including **314 ROUTE** (RIR-native: 132), **46,659 CALLS** (RIR-native: 288),
51,475 CONTAINS, 18,660 REFERENCES, 1,642 INSTANTIATES, 314 DECORATES, with
signature/qualifiedName/decorators/visibility on nodes.

This file is **mandatory in every steal TSPEC** (it is cited in each F0x work order) as:
1. **the canonical mapping** — the exact RIR field/kind names the implementer's extractor must emit;
2. **the validation oracle** — `node --experimental-sqlite tools/steal/codegraph-to-rir.mjs db ref.json`
   produces the golden IR; a native `rir compile <repo>` must reproduce the same kind/field per
   construct. (It also bootstraps RIR depth immediately on any repo CodeGraph can index.)

### CG → RIR schema mapping (the transform table)

| CodeGraph (SQLite) | RIR IR | Notes |
| --- | --- | --- |
| `nodes.kind` (file/class/method/route/property/constant/enum/type_alias…) | NodeKind = UPPERCASE(kind) | RIR gains the structural kinds (F05/F06/F07); domain roles (CONTROLLER/SERVICE…) layered by CapabilityPass |
| `qualified_name` / `file_path` | NodeIR.qualifiedName / .filePath (F02) | |
| `start/end_line`, `start/end_column` | NodeIR.span (F02) | |
| `signature` / `return_type` / `type_parameters` | NodeIR.signature/returnType/typeParameters (F01) | |
| `visibility` / `is_exported` / `is_async` / `is_static` / `is_abstract` | NodeIR.* modifiers (F01) | |
| `decorators` (JSON) | NodeIR.decorators (F03) | |
| `docstring` | NodeIR.docstring (F04) | |
| `edges.kind` (contains/calls/extends/implements/instantiates/references/decorates) | EdgeKind = UPPERCASE(kind) (F08–F13) | |
| `edges.provenance='heuristic'` | evidence.confidence 0.6 (synthesized) | mirrors F16 |
| `files` table | RepositoryIR.files[] (F21) | |
| (RIR-only) execution.*, evidence.confidence on nodes, capabilities, closure | **kept** | RIR's differentiator; transform leaves execution to ReachabilityPass |

## Workstreams & TSPECs

**WS1 — Node enrichment** (feeds discovery + signatures):
F01 signature/returnType/typeParameters/visibility/isExported/isAsync/isStatic/isAbstract ·
F02 qualifiedName (`Class::method`) + promoted filePath + node-level line/col span ·
F03 decorators[] (critical for NestJS) · F04 docstring (JSDoc/TSDoc).

**WS2 — New node kinds:** F05 PROPERTY/FIELD (DI tokens, class fields) · F06 CONSTANT/ENUM/
ENUM_MEMBER · F07 TYPE_ALIAS + granular IMPORT nodes.

**WS3 — Structural edges:** F08 CONTAINS (file→symbol tree) · F09 EXTENDS+IMPLEMENTS ·
F10 INSTANTIATES · F11 REFERENCES (value refs) · F12 DECORATES.

**WS4 — Resolution layer (the fix):** F13 ReferenceResolver (import + name-matcher → deep CALLS) ·
F14 framework route resolution (NestJS/Express/Spring/FastAPI/Gin → ~314 routes, no false
positives) · F15 DI/provider mapping (PROVIDES edges so route→service→repo connects) ·
F16 dynamic-dispatch synthesizers.

**WS5 — Execution & closure on real code:** F17 entry-point reachability tracing
(`bootstrap()`/`main()` → call graph; fixes `reachable:false`) · F18 closure populates on the
resolved DI graph (the headline fix; depends F13–F15,F17) · F19 CATCHES/THROWS edges +
MIDDLEWARE node + WRAPS edges.

**WS6 — Route correctness:** F20 restrict imperative `.get/.post` to known router receivers
(kills `configService.get` false positives) + complete NestJS decorator coverage.

**WS7 — IR infrastructure:** F21 `files[]` metadata (language/size/hash/nodeCount) ·
F22 `schemaVersion` header + migration discipline · F23 `rir search <query>` full-text CLI.

**WS8 — Missing-in-both (opportunities):** F24 test-coverage mapping (lcov → `execution.tested`) ·
F25 git churn per node · F26 dead-code detection (reachability + graph) · F27 runtime-trace
ingestion (`execution.runtimeObserved` via OTel) · F28 dependency version tracking ·
F29 performance annotations (N+1 query + hot-path detection). Security annotation is already shipped
as the A024 guard-closure engine (ADR-0024) — not re-specified here.

## Complete coverage matrix (every row of docs/codegraph-comparison-table.md)

Nothing is dropped. `✓done` = already shipped; otherwise the TSPEC that closes it.

**§2 RIR Lacking (24):** signatures `F01` · docstrings `F04` · visibility `F01` · is_exported `F01` ·
is_async `F01` · is_static/is_abstract `F01` · decorators `F03` · type_parameters `F01` ·
return_types `F01` · exact positions `F02` · qualified_names `F02` · class hierarchy `F09` ·
instantiation graph `F10` · full call graph `F13` · value references `F11` · containment tree `F08` ·
decorates edges `F12` · full-text search `F23` · file metadata `F21` · schema versioning `F22` ·
import granularity `F07` · property/field `F05` · enum/constant `F06` · type_alias `F07`.

**§3 Missing in Both — incl. all "nice/opportunity" rows (7):** test coverage `F24` · runtime trace
`F27` · dependency version `F28` · **security annotation `✓done` (A024 guard closure, ADR-0024)** ·
**performance annotations `F29`** · change frequency `F25` · dead-code detection `F26`.

**§4 Steals:** P1 Critical → signatures `F01`, hierarchy `F09`, call depth `F13`, decorators `F03`,
containment `F08`. P2 High → qualified names `F02`, return types `F01`, visibility `F01`, is_async
`F01`, instantiation `F10`, value refs `F11`, file metadata `F21`. **P3 Nice-to-have → full-text
search `F23`, docstrings `F04`, type parameters `F01`, enum/constant `F06`, property `F05`, schema
versioning `F22`.**

**§5 Improvements (7):** route coverage 4% → `F14`+`F20` · closure empty → `F18` · edge count 160×
→ `F13` · execution metadata always false → `F17` · error-handling edges → `F19` · middleware chain
→ `F19` · DI container mapping → `F15`.

**§6 Field comparison:** every "Steal"/"Steal eventually" node field → `F01`–`F04`; RIR-unique
fields (execution.*, evidence.*) are **kept** (no TSPEC — they are our differentiator).

**§7 Edge comparison:** contains `F08` · calls (deepen) `F13` · imports (deepen/granular) `F13`+`F07`
· references `F11` · instantiates `F10` · decorates `F12` · extends/implements `F09`; RIR-unique
semantic edges (DEPENDS_ON/READS/WRITES/CONSUMES) are **kept**.

That is 29 TSPECs (F01–F29) + 1 already-shipped row (security = A024) = **every row accounted for.**

## Acceptance (how we know it worked)

Re-run `rir compile D:/rir-targets/cal.com/apps/api/v2/src --json` after WS4+WS5 and require:
**≥300 routes, 0 config-call false positives, ≥1 capability CLOSED, edges within ~2× of CodeGraph.**
The cal.com IR is the golden regression target; check `closure states` move off all-ORPHAN.

## Consequences

- New `packages/resolution` (the missing layer); `packages/ir` gains fields, node kinds, edge kinds
  (additive — `RIR_VERSION` bump). Adapters emit the richer facts.
- This is a multi-PR program, not a patch — F13–F18 are the ones that make "CLOSED" true on real
  code. Everything in WS1–WS3 is enabling depth that the resolution layer consumes.
- RIR's claims become honest only after F18 closes a real capability; until then the docs must say
  "topology on resolved graphs," not "verified end to end."
