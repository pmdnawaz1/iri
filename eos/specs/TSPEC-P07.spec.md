# TSPEC-P07 — DependencyPass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Do NOT edit `packages/passes/src/index.ts`. Package-name imports.

- **TSPEC:** TSPEC-P07 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Compute module-level dependencies: for every `IMPORTS` edge between `MODULE` nodes, emit a
`DEPENDS_ON` edge in the same direction. Runs after ImportPass; in unit tests, pre-seed the
MODULE nodes + IMPORTS edges on the draft.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/DependencyPass.ts`
- create `tests/passes/dependency-pass.test.ts`

## Behavior
`name = "DependencyPass"`, `priority = PASS_PRIORITY.DependencyPass`, `supports()` true.
`run(_ctx, draft)`:
- read `draft.getEdges()`; for each edge with `kind === "IMPORTS"` whose `from` and `to`
  both resolve via `draft.getNode(...)` to `MODULE` nodes, add
  `{ id: makeId("edge","dependsOn", from, to), kind: "DEPENDS_ON", from, to, evidence:[AST] }`.
- ignore non-IMPORTS edges. Idempotent.

## Acceptance (each a test; DefaultIRDraft + CompilationContext stub)
1. two MODULE nodes + an `IMPORTS` edge → a matching `DEPENDS_ON` edge.
2. multiple imports → one `DEPENDS_ON` each.
3. a non-IMPORTS edge produces no `DEPENDS_ON`.
4. determinism: two runs yield equal sealed IR.
5. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/adapter. Package-name imports only.

## References
ADR-0016; ImportPass (`packages/passes/src/ImportPass.ts`); DefaultIRDraft.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p07): dependency pass`.
