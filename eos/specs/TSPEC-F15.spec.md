# TSPEC-F15 — DI / provider mapping: PROVIDES edges (NestJS @Module + constructor injection) (Work Order)

> Authored by ROLE_ARCHITECT for the IR-fidelity program (ADR-0025). STEAL-AND-ADAPT from
> CodeGraph (`inspirations/codegraph`), then map the output onto RIR's IR. Keep RIR's IR as a single portable JSON (do NOT adopt CodeGraph's SQLite). Steal the logic, map the output to NodeIR/EdgeIR. Additive only — bump RIR_VERSION, never break existing fields.

- **TSPEC:** TSPEC-F15 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-F15.yaml`
- **Depends on:** TSPEC-F05, TSPEC-F10, TSPEC-F14 · **ADR:** docs/ADR-0025-ir-fidelity-steal-from-codegraph.md

## 1. Objective
Connect controller -> injected service -> repository through DI so the closure chain physically exists in the graph.

## 2. USE THE STEAL TRANSFORM (mapping + oracle — do not reimplement blind)
The CG->RIR field/edge-kind mapping is already implemented and PROVEN in
`tools/steal/codegraph-to-rir.mjs` (run on cal.com it yields 314 ROUTE, 46,659 CALLS,
51,475 CONTAINS, plus signature/qualifiedName/decorators on nodes). Use it TWO ways:
1. **MAPPING** — it defines the EXACT RIR field/kind names your extractor must emit (e.g.
   `qualifiedName`, `signature`, `decorators`, `CONTAINS`/`EXTENDS`/`INSTANTIATES`). Match them.
2. **ORACLE** — generate the reference IR:
   `node --experimental-sqlite tools/steal/codegraph-to-rir.mjs <repo>/.codegraph/codegraph.db ref.json`
   then assert YOUR native `rir compile <repo>` reproduces the same kind/field for the same
   construct (file+line) within tolerance. The transform is your golden target.

Then steal-and-adapt the extraction logic from CodeGraph source:
- inspirations/codegraph/src/resolution/frameworks/nestjs.ts

## 3. Files
- extend packages/resolution/frameworks/nestjs.ts adaptation

## 4. Algorithm / behavior
- Read @Module providers/controllers; for each controller's constructor FIELD (F05) typed as a provider, add an edge controller->service (CALLS or a new USES).
- Add PROVIDES edges MODULE->SERVICE/REPOSITORY.

## 5. Acceptance criteria
- a NestJS controller injecting a service that injects a repository forms a connected path in the IR
- Builds, typechecks, lint clean, `pnpm typecheck:tests` green, coverage >= 95%.

## 6. Forbidden changes
- Do NOT adopt CodeGraph's SQLite/schema — RIR stays one portable JSON.
- Do NOT change closure/coverage/consistency/ontology RULES (architect-owned) unless this TSPEC says so.
- Additive only; bump RIR_VERSION when adding IR fields/kinds. No minify, no TODOs.

## 7. References
- ADR-0025 (program + copy-from mapping + coverage matrix) · docs/codegraph-comparison-table.md
- CodeGraph architecture: `inspirations/codegraph/CLAUDE.md`
