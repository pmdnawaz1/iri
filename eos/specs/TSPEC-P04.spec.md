# TSPEC-P04 — ComponentPass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Heuristic below is the architect's decision; apply it exactly.

- **TSPEC:** TSPEC-P04 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Detect frontend components from symbols and add `COMPONENT` nodes, so closure can see the
`COMPONENT` execution stage. Heuristic and deterministic.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/ComponentPass.ts`
- create `tests/passes/component-pass.test.ts`

## Behavior
`name = "ComponentPass"`, `priority = PASS_PRIORITY.ComponentPass`, `supports()` true.
`run(ctx, draft)`: for each `pr` whose `artifact.path` ends with `.tsx` or `.jsx`, for each
`sym` in `pr.symbols`:
- if `sym.kind` is `function` or `class`, and `sym.name` is PascalCase (first character is an
  uppercase letter), create a `COMPONENT` node: id = `makeId("component", sym.name)`,
  name = `sym.name`, language = `pr.artifact.language`, artifactId = `pr.artifact.id`,
  span = `sym.span`, hash = "0", default execution, evidence `[AST]`.
- otherwise skip. (Only `.tsx`/`.jsx` files; lowercase-named functions are not components.)

Idempotent (replace by id).

## Acceptance (each a test; DefaultIRDraft + CompilationContext stub)
1. a `function LoginForm()` symbol in a `.tsx` artifact → a `COMPONENT` node named `LoginForm`.
2. a lowercase `function helper()` in a `.tsx` artifact → no component node.
3. a PascalCase symbol in a `.ts` (non-tsx) artifact → no component node.
4. determinism: two runs yield equal sealed IR.
5. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/adapter. Do NOT change the heuristic. Package-name imports only.

## References
ADR-0016; `@rir/ir` (`NodeKind.Component`); `@rir/closure` (`STAGE_OF_NODE_KIND` maps COMPONENT→COMPONENT stage); DefaultIRDraft.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p04): component pass`.
