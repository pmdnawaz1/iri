# TSPEC-FX07 — Go fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test.

- **TSPEC:** TSPEC-FX07 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD05 (Go adapter, COMPLETE) · **Wave:** 6

## Objective
A small Go auth module fixture + a test that `GoAdapter` extracts its facts.

## Files (ADDITIVE ONLY)
- create `fixtures/go/repository.go` (a `UserRepository` struct + method)
- create `fixtures/go/service.go` (an `AuthService` struct calling the repository)
- create `tests/fixtures/go.test.ts` (the tests below)

## Behavior
Realistic, multi-line, formatted Go. **CRITICAL: Go is newline-sensitive — write real
newlines; a single-line Go file does NOT parse.** Use exported (capitalized) identifiers.
Test reads the files and runs `new GoAdapter().parse(...)` (CompilationContext stub as in
`tests/compiler/go-adapter.test.ts`).

## Acceptance (each a test)
1. `symbols` include struct `UserRepository` (kind `class`) and a method (kind `method`).
2. `imports` include at least one import specifier (e.g. `fmt`).
3. `calls` include a `call_expression` callee.
4. `AuthService` extracted from its file.
5. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify (especially Go).

## References
`tests/compiler/go-adapter.test.ts`; adapter `packages/code-compiler/src/language/go.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx07): go fixture`.
