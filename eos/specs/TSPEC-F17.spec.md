# TSPEC-F17 — Entry-point reachability tracing (bootstrap/main -> call graph) (Work Order)

> Authored by ROLE_ARCHITECT for the IR-fidelity program (ADR-0025). STEAL-AND-ADAPT from
> CodeGraph (`inspirations/codegraph`), then map the output onto RIR's IR. Keep RIR's IR as a single portable JSON (do NOT adopt CodeGraph's SQLite). Steal the logic, map the output to NodeIR/EdgeIR. Additive only — bump RIR_VERSION, never break existing fields.

- **TSPEC:** TSPEC-F17 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-F17.yaml`
- **Depends on:** TSPEC-F13 · **ADR:** docs/ADR-0025-ir-fidelity-steal-from-codegraph.md

## 1. Objective
Fix reachable:false on 99% of nodes. Trace reachability from real entrypoints over the RESOLVED graph (F13).

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

(no direct file steal — RIR-native; the transform output is still your field/kind oracle)

## 3. Files
- modify packages/passes/src/ReachabilityPass.ts to traverse the resolved CALLS/CONTAINS graph from entrypoints

## 4. Algorithm / behavior
- Entrypoints = ROUTE/FRONTEND_ROUTE handlers + bootstrap()/main(). BFS over resolved edges; set execution.reachable + entryDistance.
- Must run AFTER F13/F14 so the edges exist.

## 5. Acceptance criteria
- on cal.com the reachable-node count is a large fraction of nodes (was 13/3369)
- a route's whole handler chain is reachable
- Builds, typechecks, lint clean, `pnpm typecheck:tests` green, coverage >= 95%.

## 6. Forbidden changes
- Do NOT adopt CodeGraph's SQLite/schema — RIR stays one portable JSON.
- Do NOT change closure/coverage/consistency/ontology RULES (architect-owned) unless this TSPEC says so.
- Additive only; bump RIR_VERSION when adding IR fields/kinds. No minify, no TODOs.

## 7. References
- ADR-0025 (program + copy-from mapping + coverage matrix) · docs/codegraph-comparison-table.md
- CodeGraph architecture: `inspirations/codegraph/CLAUDE.md`
