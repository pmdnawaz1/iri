# TSPEC-CE01 — TypeScript adapter: emit CallFact.enclosing (Work Order)

> Authored by ROLE_ARCHITECT. Sanctioned enhancement to the TypeScript adapter so CallPass
> can build the call graph (ADR-0016). COLLISION-FREE: touches ONLY `typescript.ts` and its
> test. Do NOT touch any other adapter or shared file.

- **TSPEC:** TSPEC-CE01 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-CE01.yaml`
- **Depends on:** TSPEC-AD01 — COMPLETE · **Wave:** 6

## 1. Objective

Populate `CallFact.enclosing` (already on the `@rir/core` contract, currently unset) with
the name of the nearest enclosing **class** (preferred) or top-level **function** that
contains each call. This is the SOURCE of the CALLS edge CallPass builds.

## 2. Contract (fixed)

`CallFact` is `{ callee: string; enclosing?: string; span: Span }`. Only `extractCalls`
in `packages/code-compiler/src/language/typescript.ts` changes. The `ParseResult` shape and
all other extraction are unchanged.

## 3. Files (ADDITIVE-TO-ONE-FILE)
- modify `packages/code-compiler/src/language/typescript.ts` (only `extractCalls`)
- modify `tests/compiler/typescript-adapter.test.ts` (add the §6 assertions)

## 4. Behavior / Algorithm

Rewrite `extractCalls` to carry an `enclosing` value down the walk:
- walk `(node, enclosing)`:
  - if `node` is a `ClassDeclaration` with a name → child enclosing = the class name
    (a class always wins over nested methods/functions).
  - else if `node` is a `FunctionDeclaration` with a name AND `enclosing` is undefined →
    child enclosing = the function name.
  - else → child enclosing = `enclosing` (unchanged).
  - if `node` is a `CallExpression` → push `{ callee: <as today>, enclosing, span }`.
  - recurse into children with the child enclosing.

So a call inside `AuthController.login`'s body gets `enclosing: "AuthController"`; a call in
a free top-level `function helper()` gets `enclosing: "helper"`; a call at module top level
gets `enclosing: undefined`.

## 5. Edge cases
- Method bodies report the enclosing CLASS, not the method.
- Top-level calls report `undefined`.
- Determinism unchanged; existing call tests still pass (callee/span unchanged).

## 6. Acceptance criteria (added to the adapter test)
1. parsing a class `AuthController` whose `login` method calls `this.authService.login`
   yields a `CallFact` with `enclosing === "AuthController"`.
2. a call inside a named top-level function reports that function's name.
3. a module-top-level call reports `enclosing === undefined`.
4. the existing call assertions (callee/span) still hold.
5. coverage for `typescript.ts` ≥ 95%.

## 7. Forbidden changes
- Do NOT change `CallFact`/`ParseResult`/`LanguageAdapter` (architect-owned).
- Do NOT touch any other adapter, `index.ts`, or `package.json`.
- Do NOT minify.

## 8. References
ADR-0016 (call resolution); `apps/cli/src/prove.ts` (enclosing-class tracking);
`packages/code-compiler/src/language/typescript.ts`.

## 9. Definition of done
format:check · build · typecheck · the §6 tests · coverage ≥ 95% · PR `feat(tspec-ce01): typescript enclosing`.
