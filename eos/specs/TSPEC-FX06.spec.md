# TSPEC-FX06 — Java fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test.

- **TSPEC:** TSPEC-FX06 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD04 (Java adapter, COMPLETE) · **Wave:** 6

## Objective
A small Spring-style Java auth module fixture + a test that `JavaAdapter` extracts its facts.

## Files (ADDITIVE ONLY)
- create `fixtures/java/AuthController.java` (`public class` with a `login` method calling a service)
- create `fixtures/java/AuthService.java` (`public class` calling a repository)
- create `fixtures/java/UserRepository.java` (`public class`)
- create `tests/fixtures/java.test.ts` (the tests below)

## Behavior
Realistic, multi-line, formatted Java (real newlines). Test reads files and runs
`new JavaAdapter().parse(...)` (CompilationContext stub as in `tests/compiler/java-adapter.test.ts`).

## Acceptance (each a test)
1. `symbols` include `public class` `AuthController` (exported=true) and method `login`.
2. `imports` include the package import(s).
3. `calls` include the service invocation (e.g. `authService.login`).
4. `AuthService` extracted from its file.
5. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify.

## References
`tests/compiler/java-adapter.test.ts`; adapter `packages/code-compiler/src/language/java.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx06): java fixture`.
