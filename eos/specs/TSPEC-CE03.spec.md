# TSPEC-CE03 — Go adapter: emit CallFact.enclosing (Work Order)

> Same shape as **TSPEC-CE01 (read it first)**. COLLISION-FREE: touches ONLY `go.ts`
> and its test.

- **TSPEC:** TSPEC-CE03 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD05 (COMPLETE) · **Wave:** 6

## Objective
Populate `CallFact.enclosing` in the Go adapter so CallPass can build the call graph.

## Files (ADDITIVE-TO-ONE-FILE)
- modify `packages/code-compiler/src/language/go.ts` (only the call extraction)
- modify `tests/compiler/go-adapter.test.ts` (add the assertions)

## Behavior (deltas from CE01 §4)
Tree-sitter node types: a `method_declaration` whose receiver type is `T` sets the child
enclosing to `T` (the receiver type name — Go's "class"); a top-level `function_declaration`
sets enclosing to its name when none is set; a `call_expression` gets the current
`enclosing`. Track `enclosing` down the recursive visit. (For a method
`func (r *UserRepository) FindByEmail()`, enclosing = `UserRepository`.)

## Acceptance (added to the adapter test)
1. a call inside `func (r *AuthService) Login()` reports `enclosing === "AuthService"`.
2. a call inside a top-level `func main()` reports `"main"`.
3. a call outside any function reports `undefined`.
4. existing call assertions still hold.
5. coverage ≥ 95%.

## Forbidden
Change no contract/other adapter/`index.ts`/`package.json`. Never minify (Go is newline-sensitive).

## References
TSPEC-CE01; `packages/code-compiler/src/language/go.ts`; ADR-0016.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-ce03): go enclosing`.
