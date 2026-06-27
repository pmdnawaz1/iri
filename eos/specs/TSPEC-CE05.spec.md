# TSPEC-CE05 — Rust adapter: emit CallFact.enclosing (Work Order)

> Same shape as **TSPEC-CE01 (read it first)**. COLLISION-FREE: touches ONLY `rust.ts`
> and its test.

- **TSPEC:** TSPEC-CE05 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD06 (COMPLETE) · **Wave:** 6

## Objective
Populate `CallFact.enclosing` in the Rust adapter so CallPass can build the call graph.

## Files (ADDITIVE-TO-ONE-FILE)
- modify `packages/code-compiler/src/language/rust.ts` (only the call extraction)
- modify `tests/compiler/rust-adapter.test.ts` (add the assertions)

## Behavior (deltas from CE01 §4)
Track `enclosing` down the recursive visit. The "class" of a Rust method is the type its
`impl_item` implements: an `impl_item` sets the child enclosing to its `type` field name
(e.g. `impl AuthService { ... }` → enclosing `AuthService` for calls inside). A top-level
`function_item` sets enclosing to its name when none is set. A `call_expression` gets the
current enclosing.

## Acceptance (added to the adapter test)
1. a `call_expression` inside `impl AuthService { fn login() { ... } }` reports `enclosing === "AuthService"`.
2. a call inside a top-level `fn main()` reports `"main"`.
3. a call outside any function/impl reports `undefined`.
4. existing call assertions still hold.
5. coverage ≥ 95%.

## Forbidden
Change no contract/other adapter/`index.ts`/`package.json`. Never minify.

## References
TSPEC-CE01; `packages/code-compiler/src/language/rust.ts`; ADR-0016.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-ce05): rust enclosing`.
