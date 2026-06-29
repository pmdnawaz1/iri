# TSPEC-F13 — ReferenceResolver: import resolution + name matching (deep call graph) (Work Order)

> Authored by ROLE_ARCHITECT for the IR-fidelity program (ADR-0025). STEAL-AND-ADAPT from
> CodeGraph (`inspirations/codegraph`), then map the output onto RIR's IR. Keep RIR's IR as a single portable JSON (do NOT adopt CodeGraph's SQLite). Steal the logic, map the output to NodeIR/EdgeIR. Additive only — bump RIR_VERSION, never break existing fields.

- **TSPEC:** TSPEC-F13 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-F13.yaml`
- **Depends on:** TSPEC-F02, TSPEC-F08 · **ADR:** docs/ADR-0025-ir-fidelity-steal-from-codegraph.md

## 1. Objective
THE missing layer. Resolve callee names to their definitions across files so CALLS edges actually connect (288 -> ~46k on cal.com). Without this, closure can never traverse route->service.

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
- inspirations/codegraph/src/resolution/import-resolver.ts
- inspirations/codegraph/src/resolution/name-matcher.ts
- inspirations/codegraph/src/resolution/path-aliases.ts
- inspirations/codegraph/src/resolution/index.ts

## 3. Files
- create packages/resolution/ (new workspace package): a post-pass that runs after extraction
- wire it into the compiler pipeline AFTER CallPass, BEFORE CapabilityPass (architect will confirm order)

## 4. Algorithm / behavior
- Port import-resolver (incl. tsconfig path aliases) + name-matcher: for each unresolved call, find the imported/defined symbol it targets and add a precise CALLS edge to that node.
- Adapt CodeGraph's SQLite lookups to operate over the in-memory IR node set.

## 5. Acceptance criteria
- on fixtures/express-auth the controller->service->repository CALLS chain is fully connected
- on cal.com the CALLS edge count rises into the tens of thousands (was 288)
- Builds, typechecks, lint clean, `pnpm typecheck:tests` green, coverage >= 95%.

## 6. Forbidden changes
- Do NOT adopt CodeGraph's SQLite/schema — RIR stays one portable JSON.
- Do NOT change closure/coverage/consistency/ontology RULES (architect-owned) unless this TSPEC says so.
- Additive only; bump RIR_VERSION when adding IR fields/kinds. No minify, no TODOs.
- Do NOT change the closure/ontology rules — only add edges.

## 7. References
- ADR-0025 (program + copy-from mapping + coverage matrix) · docs/codegraph-comparison-table.md
- CodeGraph architecture: `inspirations/codegraph/CLAUDE.md`
