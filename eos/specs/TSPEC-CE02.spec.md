# TSPEC-CE02 — Python adapter: emit CallFact.enclosing (Work Order)

> Same shape as **TSPEC-CE01 (read it first)**. COLLISION-FREE: touches ONLY `python.ts`
> and its test.

- **TSPEC:** TSPEC-CE02 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD03 (COMPLETE) · **Wave:** 6

## Objective
Populate `CallFact.enclosing` in the Python adapter (nearest enclosing class, else top-level
function) so CallPass can build the call graph.

## Files (ADDITIVE-TO-ONE-FILE)
- modify `packages/code-compiler/src/language/python.ts` (only the call extraction)
- modify `tests/compiler/python-adapter.test.ts` (add the assertions)

## Behavior (deltas from CE01 §4)
Tree-sitter node types: a `class_definition` with a `name` field sets the child enclosing to
the class name (class wins); a top-level `function_definition` sets enclosing when none is
set; a `call` node gets the current `enclosing`. Track `enclosing` down the recursive visit.

## Acceptance (added to the adapter test)
1. a call inside a method of `class AuthService` reports `enclosing === "AuthService"`.
2. a call inside a top-level `def` reports that function's name.
3. a module-top-level call reports `undefined`.
4. existing call assertions still hold.
5. coverage ≥ 95%.

## Forbidden
Change no contract/other adapter/`index.ts`/`package.json`. Never minify.

## References
TSPEC-CE01; `packages/code-compiler/src/language/python.ts`; ADR-0016.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-ce02): python enclosing`.
