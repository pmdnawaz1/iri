# TSPEC-FX09 — Broken-repository fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test. Note: `fixtures/broken-repository/` already contains
> `repository-ir.json` — leave it; only ADD source files.

- **TSPEC:** TSPEC-FX09 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD01 (COMPLETE) · **Wave:** 6

## Objective
A small Express-style TypeScript repo whose login chain is deliberately BROKEN (the route
handler never calls the service), plus a test that `TypeScriptAdapter` extracts the route
and shows the service is not called from it. Closure verdict is OUT OF SCOPE here.

## Files (ADDITIVE ONLY)
- create `fixtures/broken-repository/routes.ts` (a `router.post("/login", ...)` whose handler does NOT call the controller/service)
- create `fixtures/broken-repository/auth.service.ts` (an `AuthService` that exists but is never reached)
- create `tests/fixtures/broken-repository.test.ts` (the tests below)
- do NOT modify the existing `fixtures/broken-repository/repository-ir.json`

## Behavior
Realistic, multi-line, formatted TS. Test reads the files and runs
`new TypeScriptAdapter().parse(...)` (CompilationContext stub).

## Acceptance (each a test)
1. `routes` from `routes.ts` include `POST /login`.
2. the handler's `calls` do NOT include any `AuthService` method (the chain is broken).
3. `AuthService` is still extracted as a symbol from `auth.service.ts`.
4. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`/the existing `repository-ir.json`. Never minify.

## References
`tests/compiler/typescript-adapter.test.ts`; adapter `packages/code-compiler/src/language/typescript.ts`;
the proving slice `apps/cli/src/prove.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx09): broken-repository fixture`.
