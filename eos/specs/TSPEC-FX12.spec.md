# TSPEC-FX12 — C# fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test.

- **TSPEC:** TSPEC-FX12 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD07 (C# adapter, COMPLETE) · **Wave:** 6

## Objective
A small ASP.NET-style C# auth module fixture + a test that `CSharpAdapter` extracts its facts.

## Files (ADDITIVE ONLY)
- create `fixtures/csharp/AuthController.cs` (`public class` with a `Login` method calling a service)
- create `fixtures/csharp/AuthService.cs` (`public class` calling a repository)
- create `tests/fixtures/csharp.test.ts` (the tests below)

## Behavior
Realistic, multi-line, formatted C# with `using` directives. Test reads the files and runs
`new CSharpAdapter().parse(...)` (CompilationContext stub as in `tests/compiler/csharp-adapter.test.ts`).
Note: the C# adapter initializes a WASM parser via top-level await; importing it is async-safe.

## Acceptance (each a test)
1. `symbols` include `public class` `AuthController` (exported=true) and method `Login`.
2. `imports` include a `using` specifier.
3. `calls` include the service invocation.
4. `AuthService` extracted from its file.
5. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify.

## References
`tests/compiler/csharp-adapter.test.ts`; adapter `packages/code-compiler/src/language/csharp.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx12): csharp fixture`.
