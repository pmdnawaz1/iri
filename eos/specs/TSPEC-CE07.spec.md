# TSPEC-CE07 — JavaScript adapter: emit CallFact.enclosing (Work Order)

> Same shape as **TSPEC-CE01 (read it first)**. COLLISION-FREE: touches ONLY `javascript.ts`
> and its test. The JS adapter uses the TypeScript Compiler API, so the algorithm is
> identical to CE01 (the TypeScript enclosing enhancement).

- **TSPEC:** TSPEC-CE07 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD02 (COMPLETE) · **Wave:** 6

## Objective
Populate `CallFact.enclosing` in the JavaScript adapter (nearest enclosing class, else
top-level function) so CallPass can build the call graph.

## Files (ADDITIVE-TO-ONE-FILE)
- modify `packages/code-compiler/src/language/javascript.ts` (only `extractCalls`)
- modify `tests/compiler/javascript-adapter.test.ts` (add the assertions)

## Behavior
Apply CE01 §4 verbatim (the JS adapter parses with the TS Compiler API): walk
`(node, enclosing)`; a `ClassDeclaration` with a name sets the child enclosing to the
class name; a named `FunctionDeclaration` sets it when none is set; a `CallExpression`
records the current enclosing. If CE01 exposed a shared `extractCalls` helper, reuse it;
otherwise implement the same logic standalone.

## Acceptance (added to the adapter test)
1. a call inside a method of `class AuthService` reports `enclosing === "AuthService"`.
2. a call inside a named top-level function reports that function's name.
3. a module-top-level call reports `undefined`.
4. existing call assertions still hold.
5. coverage ≥ 95%.

## Forbidden
Change no contract/other adapter/`index.ts`/`package.json`. Never minify.

## References
TSPEC-CE01 (identical algorithm); `packages/code-compiler/src/language/javascript.ts`; ADR-0016.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-ce07): javascript enclosing`.
