# TSPEC-FX10 — Python fixture + adapter validation (Work Order)

> Same shape as **TSPEC-FX02 (read it first)**. COLLISION-FREE: only new files in your
> fixture folder + one new test.

- **TSPEC:** TSPEC-FX10 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-AD03 (Python adapter, COMPLETE) · **Wave:** 6

## Objective
A small Python auth module fixture + a test that `PythonAdapter` extracts its facts.

## Files (ADDITIVE ONLY)
- create `fixtures/python/auth_service.py` (an `AuthService` class with a `login` method calling a repository)
- create `fixtures/python/user_repository.py` (a `UserRepository` class)
- create `tests/fixtures/python.test.ts` (the tests below)

## Behavior
Realistic, multi-line, properly-indented Python (whitespace-sensitive — real newlines).
Test reads the files and runs `new PythonAdapter().parse(...)` (CompilationContext stub as
in `tests/compiler/python-adapter.test.ts`).

## Acceptance (each a test)
1. `symbols` include class `AuthService` and method `login`.
2. `imports` include the repository import (`from ... import UserRepository` or `import ...`).
3. `calls` include the repository call (e.g. `self.repo.find_by_email`).
4. `UserRepository` extracted from its file.
5. determinism: two parses deep-equal.

## Forbidden
Modify no adapter/package/`index.ts`/`package.json`. Never minify (Python needs newlines).

## References
`tests/compiler/python-adapter.test.ts`; adapter `packages/code-compiler/src/language/python.ts`.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-fx10): python fixture`.
