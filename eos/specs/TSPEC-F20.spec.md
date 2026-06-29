# TSPEC-F20 — Route extraction correctness: kill config-call false positives (Work Order)

> Authored by ROLE_ARCHITECT for the IR-fidelity program (ADR-0025). STEAL-AND-ADAPT from
> CodeGraph (`inspirations/codegraph`), then map the output onto RIR's IR. Keep RIR's IR as a single portable JSON (do NOT adopt CodeGraph's SQLite). Steal the logic, map the output to NodeIR/EdgeIR. Additive only — bump RIR_VERSION, never break existing fields.

- **TSPEC:** TSPEC-F20 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-F20.yaml`
- **Depends on:** TSPEC-A021 · **ADR:** docs/ADR-0025-ir-fidelity-steal-from-codegraph.md

## 1. Objective
Stop misclassifying `configService.get('api.port')` as `GET api.port`. Routes should come from framework resolvers (F14) or known router receivers only.

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
- modify packages/code-compiler/src/language/{typescript,go}.ts route extraction

## 4. Algorithm / behavior
- Restrict imperative `.get/.post(...)` route detection to receivers that are known routers (app/router/r/e/fastify) — never arbitrary objects.
- Prefer the F14 framework resolvers; the imperative path is the fallback.

## 5. Acceptance criteria
- compiling cal.com yields no ROUTE whose path looks like a config key
- express fixtures still produce their routes
- Builds, typechecks, lint clean, `pnpm typecheck:tests` green, coverage >= 95%.

## 6. Forbidden changes
- Do NOT adopt CodeGraph's SQLite/schema — RIR stays one portable JSON.
- Do NOT change closure/coverage/consistency/ontology RULES (architect-owned) unless this TSPEC says so.
- Additive only; bump RIR_VERSION when adding IR fields/kinds. No minify, no TODOs.

## 7. References
- ADR-0025 (program + copy-from mapping + coverage matrix) · docs/codegraph-comparison-table.md
- CodeGraph architecture: `inspirations/codegraph/CLAUDE.md`
