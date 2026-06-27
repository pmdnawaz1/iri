# TSPEC-APP2 — Compiler API: wire the real /compile endpoints (Work Order)

> Authored by ROLE_ARCHITECT. The pipeline is now real (`@rir/compiler`); wire it into the
> Fastify app, replacing the 501 stubs for compilation.

- **TSPEC:** TSPEC-APP2 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-APP2.yaml`
- **Depends on:** TSPEC-E01..E04, @rir/compiler — COMPLETE · **Wave:** 7

## Objective
Make `POST /compile/repository` run the real compiler and return the Repository IR + closure,
instead of returning 501.

## Files
- modify `apps/compiler-api/src/index.ts` (the `/compile/repository` route)
- modify `apps/compiler-api/package.json` (add `@rir/compiler`)
- create `tests/api/compile-repository.test.ts`

## Behavior
- Add `@rir/compiler` import. Replace the `/compile/repository` 501 handler with one that
  reads `{ dir: string }` from the body (validate with the existing Zod pattern), calls
  `await compileRepository(dir)`, and returns `{ ir, closure }` (200).
- Leave `/compile/code` and `/compile/document` as 501 (still need single-file / document
  paths). Keep all other routes unchanged.

## Acceptance (each a test using the existing `buildServer()` + Fastify `inject`)
1. `POST /compile/repository` with `{ dir: "fixtures/express-auth" }` returns 200 with a
   body containing `ir.capabilities` including `AUTH.LOGIN` and a `closure` array.
2. a missing `dir` returns a 400 (Zod validation).
3. `/compile/code` still returns 501.

## Forbidden
Do NOT change `@rir/compiler`, the IR, or other routes' behavior. Do NOT minify.

## References
`apps/compiler-api/src/index.ts`; `@rir/compiler` (`compileRepository`); `tests/e2e/pipeline.test.ts`;
Fastify inject: https://fastify.dev/docs/latest/Guides/Testing/

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-app2): compiler-api compile endpoint`.
