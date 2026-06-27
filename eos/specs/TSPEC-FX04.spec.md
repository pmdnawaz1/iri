# TSPEC-FX04 — Next.js fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test.

- **TSPEC:** TSPEC-FX04 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD01 (COMPLETE) · **Wave:** 6

## Objective
A small Next.js TypeScript auth fixture (a page + an API route handler) + a test that
`TypeScriptAdapter` extracts its facts.

## Files (ADDITIVE ONLY)
- create `fixtures/next/login-page.tsx` (a function component calling an api helper)
- create `fixtures/next/api-login.ts` (a route handler `export function POST(...)` calling a service)
- create `tests/fixtures/next.test.ts` (the tests below)

## Behavior
Realistic, multi-line, formatted TS/TSX. Test reads files and runs
`new TypeScriptAdapter().parse(...)` (CompilationContext stub as in `tests/compiler/typescript-adapter.test.ts`).

## Acceptance (each a test)
1. `symbols` from `login-page.tsx` include the page component.
2. `exports` from `api-login.ts` include the `POST` handler.
3. `calls` include the service/api call.
4. `imports` are extracted.
5. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify.

## References
`tests/compiler/typescript-adapter.test.ts`; adapter `packages/code-compiler/src/language/typescript.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx04): next fixture`.
