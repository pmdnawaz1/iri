# TSPEC-FX11 — Rust fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test.

- **TSPEC:** TSPEC-FX11 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD06 (Rust adapter, COMPLETE) · **Wave:** 6

## Objective
A small Rust auth module fixture + a test that `RustAdapter` extracts its facts.

## Files (ADDITIVE ONLY)
- create `fixtures/rust/service.rs` (a `pub struct AuthService` with an `impl` block whose method calls a repository)
- create `fixtures/rust/repository.rs` (a `pub struct UserRepository` + `impl`)
- create `tests/fixtures/rust.test.ts` (the tests below)

## Behavior
Realistic, multi-line, formatted Rust. Use `pub` for exported items and a `use` import.
Test reads the files and runs `new RustAdapter().parse(...)` (CompilationContext stub as in
`tests/compiler/rust-adapter.test.ts`).

## Acceptance (each a test)
1. `symbols` include `pub struct` `AuthService` (kind `class`) and an `impl` method (kind `method`).
2. `imports` include a `use` specifier.
3. `calls` include a `call_expression` callee.
4. `UserRepository` extracted from its file.
5. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify.

## References
`tests/compiler/rust-adapter.test.ts`; adapter `packages/code-compiler/src/language/rust.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx11): rust fixture`.
