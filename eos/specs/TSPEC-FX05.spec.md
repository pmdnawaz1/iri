# TSPEC-FX05 — Vue fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test. This one validates the JavaScript adapter.

- **TSPEC:** TSPEC-FX05 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD02 (JavaScript adapter, COMPLETE) · **Wave:** 6

## Objective
A small Vue-style JavaScript auth fixture (a composable + an api module) + a test that
`JavaScriptAdapter` extracts its facts.

## Files (ADDITIVE ONLY)
- create `fixtures/vue/useAuth.js` (a `useAuth` composable function calling an api helper)
- create `fixtures/vue/api.js` (a `login(email)` function doing a `fetch`)
- create `tests/fixtures/vue.test.ts` (the tests below)

## Behavior
Realistic, multi-line, formatted JavaScript (`.js`, since the adapter claims `.js/.jsx`).
Test reads files and runs `new JavaScriptAdapter().parse(...)` (CompilationContext stub as in
`tests/compiler/javascript-adapter.test.ts`).

## Acceptance (each a test)
1. `symbols` from `useAuth.js` include the `useAuth` function.
2. `imports` include the `./api` specifier with `login` imported.
3. `calls` include the `login` call (and/or `fetch`).
4. `api.js` `login` function is extracted.
5. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify.

## References
`tests/compiler/javascript-adapter.test.ts`; adapter `packages/code-compiler/src/language/javascript.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx05): vue fixture`.
