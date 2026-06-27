# TSPEC-P01 — ImportPass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Do NOT edit `packages/passes/src/index.ts`.

- **TSPEC:** TSPEC-P01 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Lift each artifact into a `MODULE` node and each `ImportFact` into an `IMPORTS` edge.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/ImportPass.ts`
- create `tests/passes/import-pass.test.ts`

## Behavior
`name = "ImportPass"`, `priority = PASS_PRIORITY.ImportPass`, `supports()` true.
`run(ctx, draft)`: for each `pr` in `ctx.parseResults ?? []`:
- `draft.addArtifact(pr.artifact)`.
- add a `MODULE` node for the file: id = `makeId("module", pr.artifact.path)`, name =
  `pr.artifact.path`, artifactId = `pr.artifact.id`, span = null, hash = "0",
  default execution, evidence `[{ source:"AST", locator: pr.artifact.path, confidence:1 }]`.
- for each `imp` in `pr.imports`: add a `MODULE` node for the specifier (id =
  `makeId("module", imp.specifier)`, name = `imp.specifier`, artifactId = `pr.artifact.id`),
  then an `IMPORTS` edge `{ id: makeId("edge","imports", fileModuleId, specModuleId),
  kind:"IMPORTS", from: fileModuleId, to: specModuleId, evidence:[AST] }`.

(Adding the specifier module node keeps every edge endpoint valid in the sealed IR.)

## Acceptance (each a test; use DefaultIRDraft + a CompilationContext stub)
1. one artifact → one `MODULE` node for the file.
2. an import `"./app"` → a `MODULE` node for `./app` and an `IMPORTS` edge between them.
3. multiple imports → one edge each.
4. determinism: two runs yield equal sealed IR.
5. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/adapter. Import via package names only.

## References
ADR-0016; `packages/builder-engine/src/index.ts` (DefaultIRDraft).

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p01): import pass`.
