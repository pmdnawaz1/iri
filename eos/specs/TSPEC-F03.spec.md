# TSPEC-F03 — NodeIR decorators[] as data (critical for NestJS) (Work Order)

> Authored by ROLE_ARCHITECT for the IR-fidelity program (ADR-0025). STEAL-AND-ADAPT from
> CodeGraph (`inspirations/codegraph`), then map the output onto RIR's IR. Keep RIR's IR as a single portable JSON (do NOT adopt CodeGraph's SQLite). Steal the logic, map the output to NodeIR/EdgeIR. Additive only — bump RIR_VERSION, never break existing fields.

- **TSPEC:** TSPEC-F03 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-F03.yaml`
- **Depends on:** TSPEC-F01 · **ADR:** docs/ADR-0025-ir-fidelity-steal-from-codegraph.md

## 1. Objective
Capture decorators as structured data so route/DI/guard discovery can read @Controller/@Get/@Injectable/@Module/@UseGuards instead of guessing.

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
- inspirations/codegraph/src/extraction/languages/typescript.ts
- inspirations/codegraph/src/extraction/index.ts

## 3. Files
- modify packages/ir/src/index.ts (NodeIR.decorators?: { name: string; args: string[] }[])
- modify packages/code-compiler/src/language/typescript.ts (extract decorators on classes/methods/params)

## 4. Algorithm / behavior
- Reuse the A021 decorator walker; instead of only producing routes, attach the full decorator list to the owning node.
- Record name + string-literal args (path, token).

## 5. Acceptance criteria
- a @Controller('auth') class node has decorators including {name:'Controller',args:['auth']}
- a @Post('login') method node carries that decorator
- Builds, typechecks, lint clean, `pnpm typecheck:tests` green, coverage >= 95%.

## 6. Forbidden changes
- Do NOT adopt CodeGraph's SQLite/schema — RIR stays one portable JSON.
- Do NOT change closure/coverage/consistency/ontology RULES (architect-owned) unless this TSPEC says so.
- Additive only; bump RIR_VERSION when adding IR fields/kinds. No minify, no TODOs.

## 7. References
- ADR-0025 (program + copy-from mapping + coverage matrix) · docs/codegraph-comparison-table.md
- CodeGraph architecture: `inspirations/codegraph/CLAUDE.md`
