# TSPEC-CE04 — Java adapter: emit CallFact.enclosing (Work Order)

> Same shape as **TSPEC-CE01 (read it first)**. COLLISION-FREE: touches ONLY `java.ts`
> and its test.

- **TSPEC:** TSPEC-CE04 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD04 (COMPLETE) · **Wave:** 6

## Objective
Populate `CallFact.enclosing` in the Java adapter (nearest enclosing class) so CallPass can
build the call graph.

## Files (ADDITIVE-TO-ONE-FILE)
- modify `packages/code-compiler/src/language/java.ts` (only the call extraction)
- modify `tests/compiler/java-adapter.test.ts` (add the assertions)

## Behavior (deltas from CE01 §4)
Track `enclosing` down the recursive Tree-sitter visit: a `class_declaration` (or
`interface_declaration`) with a `name` field sets the child enclosing to that name (a
class always wins over nested methods); a `method_invocation` node gets the current
enclosing. Methods live inside classes, so a call inside `AuthController.login` reports
`enclosing === "AuthController"`.

## Acceptance (added to the adapter test)
1. a `method_invocation` inside a method of `class AuthService` reports `enclosing === "AuthService"`.
2. a call not inside any class reports `undefined`.
3. existing call assertions (callee) still hold.
4. coverage ≥ 95%.

## Forbidden
Change no contract/other adapter/`index.ts`/`package.json`. Never minify.

## References
TSPEC-CE01; `packages/code-compiler/src/language/java.ts`; ADR-0016.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-ce04): java enclosing`.
