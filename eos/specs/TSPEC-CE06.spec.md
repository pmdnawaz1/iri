# TSPEC-CE06 — C# adapter: emit CallFact.enclosing (Work Order)

> Same shape as **TSPEC-CE01 (read it first)**. COLLISION-FREE: touches ONLY `csharp.ts`
> and its test. Note: the C# adapter uses web-tree-sitter (WASM) with a top-level-await init.

- **TSPEC:** TSPEC-CE06 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD07 (COMPLETE) · **Wave:** 6

## Objective
Populate `CallFact.enclosing` in the C# adapter (nearest enclosing class) so CallPass can
build the call graph.

## Files (ADDITIVE-TO-ONE-FILE)
- modify `packages/code-compiler/src/language/csharp.ts` (only the call extraction)
- modify `tests/compiler/csharp-adapter.test.ts` (add the assertions)

## Behavior (deltas from CE01 §4)
Track `enclosing` down the recursive visit: a `class_declaration` (or
`interface_declaration`) with a `name` field sets the child enclosing to that name; an
`invocation_expression` gets the current enclosing. A call inside `AuthController.Login`
reports `enclosing === "AuthController"`.

## Acceptance (added to the adapter test)
1. an `invocation_expression` inside a method of `class AuthService` reports `enclosing === "AuthService"`.
2. a call not inside any class reports `undefined`.
3. existing call assertions still hold.
4. coverage ≥ 95%.

## Forbidden
Change no contract/other adapter/`index.ts`/`package.json`. Never minify.

## References
TSPEC-CE01; `packages/code-compiler/src/language/csharp.ts`; ADR-0016.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-ce06): csharp enclosing`.
