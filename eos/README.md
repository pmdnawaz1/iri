# Engineering Operating System (EOS)

A deterministic, compiler-like system that drives the RIR repository from zero to
production with minimal architectural ambiguity. It is **not** production code — it is
the machinery that schedules, governs, validates, and tracks the production work.

## Model

```
Repository        →  Repository IR   (packages/ir, compiled by the RIR compiler)
Documentation     →  Requirement IR  (packages/document-compiler)
TSPECs (this dir) →  Project IR       (eos/compiler — Project IR becomes a compiler artifact)
```

The **Project IR** is `eos/compiler/dataset.ts`: every executable unit of the
repository expressed as a TSPEC. The **Project Compiler** (`eos/compiler/compile.ts`)
validates it and compiles it into machine-readable state.

```
pnpm eos:compile
  → validates the Project IR (cycles, orphans, duplicates, ownership, ordering)
  → emits  eos/tspecs/<id>.yaml        (one fully-specified TSPEC each)
  → emits  eos/state/project.*.{yaml,json}
```

## Roles (repository roles, not model names)

| Role | Owns | Never |
| --- | --- | --- |
| `ROLE_ARCHITECT` | Repository IR, Requirement IR, ontology, pipeline, builder contracts, algorithms, ADRs, reviews, acceptance criteria | implementation |
| `ROLE_IMPLEMENTER` | production code, tests, builders, parsers, APIs, storage, CI, fixtures, benchmarks | architecture |

Every TSPEC has exactly one `owner`. `ROLE_IMPLEMENTER` must refuse architect TSPECs;
`ROLE_ARCHITECT` refuses implementation work except review. See `work_allocation1.md`
and `work_allocation2.md`.

## Lifecycle

`DRAFT → ARCHITECTURE_REVIEW → READY_FOR_IMPLEMENTATION → IMPLEMENTING → CODE_COMPLETE
→ TESTS_COMPLETE → REVIEW_PENDING → ARCHITECT_REVIEW → APPROVED → MERGED_TO_MAIN →
GRAPH_RECOMPILED → DEPENDENCIES_UPDATED → NEXT_TSPECS_UNLOCKED → COMPLETE`

Failure loop: `ARCHITECT_REVIEW → CHANGES_REQUESTED → IMPLEMENTING`. The full legal
transition table is in `eos/compiler/state-machine.ts`. No other transitions are legal.

## Branch flow (no stacked branches, no chains)

`main → feature/<tspec-id>-<slug> → PR → Architect review → merge → delete branch →
repository compile → project compile → dependency refresh → next queue.`

## State files (generated — never hand-edit)

| File | Contents |
| --- | --- |
| `project.index.json` | full canonical TSPEC records |
| `project.graph.yaml` | dependency nodes + edges |
| `project.dependencies.yaml` | depends_on / blocks adjacency |
| `project.waves.yaml` | execution waves (max parallelism) |
| `project.execution.yaml` | topological order + critical path |
| `project.state.yaml` | per-TSPEC lifecycle state |
| `project.ownership.yaml` | owner per TSPEC |
| `project.review.yaml` | review chain |
| `project.versions.yaml` | versions |
| `project.timeline.yaml` | wave schedule by effort |
| `project.metrics.yaml` | totals, by-owner, by-wave, critical path |
| `project.risks.yaml` | risk register + score |
| `project.lock.yaml` | architecture lock + owning TSPECs |
| `project.health.yaml` | completion %, compiler/architecture health |

## How to drive the repository

1. `pnpm eos:compile` — (re)compile the Project IR. CI fails if it errors or if the
   committed artifacts are stale.
2. Read `eos/state/project.waves.yaml` — implement TSPECs wave by wave; everything in a
   wave is parallelizable.
3. For each TSPEC, open the branch named in its YAML, satisfy its `acceptance_criteria`,
   respect its `forbidden_changes`, pass all CI gates (`eos/policy/ci-gates.md`).
4. Architect reviews → merge → re-run `pnpm eos:compile` → next wave unlocks.

Repository is COMPLETE only when every condition in `eos/policy/completion-criteria.md`
holds and `project.health.yaml` is GREEN.
