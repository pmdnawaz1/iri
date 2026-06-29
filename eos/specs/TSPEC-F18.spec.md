# TSPEC-F18 — Closure populates on the resolved DI graph (the headline fix) (Work Order)

> Authored by ROLE_ARCHITECT for the IR-fidelity program (ADR-0025). STEAL-AND-ADAPT from
> CodeGraph (`inspirations/codegraph`), then map the output onto RIR's IR. Keep RIR's IR as a single portable JSON (do NOT adopt CodeGraph's SQLite). Steal the logic, map the output to NodeIR/EdgeIR. Additive only — bump RIR_VERSION, never break existing fields.

- **TSPEC:** TSPEC-F18 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-F18.yaml`
- **Depends on:** TSPEC-F14, TSPEC-F15, TSPEC-F17 · **ADR:** docs/ADR-0025-ir-fidelity-steal-from-codegraph.md

## 1. Objective
Make CLOSED true on a real repo. With routes (F14), DI edges (F15), and reachability (F17) in place, the closure chain route->controller->service->repository->db->response exists for real handlers.

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
- add a golden regression test compiling D:/rir-targets/cal.com/apps/api/v2/src (or a vendored slice) asserting closure leaves all-ORPHAN

## 4. Algorithm / behavior
- Verify STAGE_OF_NODE_KIND + tier rules map the resolved nodes correctly; fix gaps where a resolved chain still reads PARTIAL.
- Confirm >=1 capability reaches CLOSED on cal.com.

## 5. Acceptance criteria
- >=1 cal.com capability is CLOSED
- closure state distribution is no longer 100% ORPHAN/PARTIAL
- Builds, typechecks, lint clean, `pnpm typecheck:tests` green, coverage >= 95%.

## 6. Forbidden changes
- Do NOT adopt CodeGraph's SQLite/schema — RIR stays one portable JSON.
- Do NOT change closure/coverage/consistency/ontology RULES (architect-owned) unless this TSPEC says so.
- Additive only; bump RIR_VERSION when adding IR fields/kinds. No minify, no TODOs.
- Do NOT weaken the closure rules to force CLOSED — fix the graph, not the gate.

## 7. References
- ADR-0025 (program + copy-from mapping + coverage matrix) · docs/codegraph-comparison-table.md
- CodeGraph architecture: `inspirations/codegraph/CLAUDE.md`
