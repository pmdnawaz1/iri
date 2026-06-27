# TSPEC-FX08 — Microservices fixture + full-pipeline test (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test. Unlike the adapter-validation fixtures, this one exercises
> the WHOLE compiler via `@rir/compiler`.

- **TSPEC:** TSPEC-FX08 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD01 (COMPLETE) · **Wave:** 7

## Objective
A small two-service TypeScript repo (an `auth-service` and a `user-service`, each with a
route → controller → service → repository chain), plus a test that compiles the whole
directory through the real pipeline (`compileRepository`) and asserts the discovered
capabilities and closure verdicts.

## Files (ADDITIVE ONLY)
- create `fixtures/microservices/auth-service/routes.ts` + `app.ts` (login flow)
- create `fixtures/microservices/user-service/routes.ts` + `app.ts` (a register or profile flow)
- create `tests/e2e/microservices.test.ts` (the tests below)

Keep each file realistic, multi-line, formatted, Express-style (so route handlers call a
`SomethingController`, which calls a `SomethingService`, which calls a `SomethingRepository`).
Use `POST "/login"` in auth-service and `POST "/register"` in user-service so the routes
resolve to ontology capabilities (AUTH.LOGIN, AUTH.REGISTER).

## Behavior
The test imports `compileRepository` from `@rir/compiler` and runs it on
`"fixtures/microservices"` with a TypeScript-only `AdapterRegistry`
(`new AdapterRegistry().register(new TypeScriptAdapter())` from `@rir/code-compiler`),
exactly as `tests/e2e/pipeline.test.ts` does.

## Acceptance (each a test in tests/e2e/microservices.test.ts)
1. compiling `fixtures/microservices` yields ≥ 2 capabilities.
2. `AUTH.LOGIN` is among the discovered capabilities (from auth-service).
3. `AUTH.REGISTER` is among them (from user-service).
4. each capability's closure result has its backend stages (`CONTROLLER`/`SERVICE`/`REPOSITORY`) present.
5. determinism: two compiles produce the same node/edge counts.

## Forbidden
- Do NOT modify any adapter, pass, `@rir/compiler`, `index.ts`, or `package.json`.
- Do NOT minify the fixture files.

## References
`tests/e2e/pipeline.test.ts` (the pattern to copy); `@rir/compiler` (`compileRepository`);
`packages/code-compiler/src/language/typescript.ts`.

## Done
format:check · build · typecheck · the §-acceptance tests · PR `feat(tspec-fx08): microservices fixture`.
