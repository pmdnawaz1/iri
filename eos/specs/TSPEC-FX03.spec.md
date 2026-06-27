# TSPEC-FX03 — React fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test. Touch nothing shared.

- **TSPEC:** TSPEC-FX03 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD01 (COMPLETE) · **Wave:** 6

## Objective
A small React + TypeScript auth UI fixture, plus a test that `TypeScriptAdapter` extracts
its facts. No closure/IR — adapter validation only.

## Files (ADDITIVE ONLY)
- create `fixtures/react/LoginForm.tsx` (a function component that calls an api helper)
- create `fixtures/react/api.ts` (a `login(email)` function doing a `fetch`)
- create `tests/fixtures/react.test.ts` (the tests below)

## Behavior
Realistic, multi-line, formatted TSX. `LoginForm` imports and calls `login` from `./api`.
Test reads the files and runs `new TypeScriptAdapter().parse(...)` (CompilationContext
stub as in `tests/compiler/typescript-adapter.test.ts`).

## Acceptance (each a test)
1. `symbols` from `LoginForm.tsx` include a `function`/`variable` named `LoginForm`.
2. `imports` include the `./api` specifier with `login` imported.
3. `calls` include the `login` call (and/or `fetch`).
4. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify fixtures.

## References
`tests/compiler/typescript-adapter.test.ts`; adapter `packages/code-compiler/src/language/typescript.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx03): react fixture`.
