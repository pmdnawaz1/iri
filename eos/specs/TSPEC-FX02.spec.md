# TSPEC-FX02 — NestJS fixture + adapter validation (Work Order)

> Authored by ROLE_ARCHITECT. Implement using ONLY this document. This is the REFERENCE
> fixture work order; FX03/FX05/FX06/FX07/FX09 follow the same shape. COLLISION-FREE:
> you create only files in your own fixture folder + one new test file. Touch NOTHING else.

- **TSPEC:** TSPEC-FX02 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-FX02.yaml`
- **Depends on:** TSPEC-AD01 (TypeScript adapter) — COMPLETE · **Wave:** 6

## 1. Objective

Provide a small, realistic NestJS-style TypeScript auth module as a test fixture, plus a
test that asserts `TypeScriptAdapter` extracts the expected facts from it. Golden closure
IR is OUT OF SCOPE (deferred until the pass pipeline lands); this validates the adapter.

## 2. Contract (fixed — do not change)

Use the already-exported `TypeScriptAdapter` from `@rir/code-compiler`. The fixture is
plain source files (parsed as strings); they are NOT compiled by tsc or run.

## 3. Files (ADDITIVE ONLY — all new, zero shared files)

| Action | Path | Purpose |
| --- | --- | --- |
| create | `fixtures/nestjs/auth.controller.ts` | a `@Controller` class with a `login` method |
| create | `fixtures/nestjs/auth.service.ts` | an `AuthService` calling a repository |
| create | `fixtures/nestjs/user.repository.ts` | a `UserRepository` class |
| create | `tests/fixtures/nestjs.test.ts` | the test from §7 |

> Do NOT edit `index.ts`, `package.json`, or any adapter. Import `TypeScriptAdapter`
> from `@rir/code-compiler` and read the fixture files with `node:fs`.

## 4. Behavior / Algorithm

1. Write idiomatic, realistic NestJS-flavored TypeScript (decorators allowed; the adapter
   ignores them). The controller's `login` calls `this.authService.login`, which calls
   `this.userRepository.findByEmail`. Keep each file ~15–30 lines, multi-line, formatted.
2. The test reads each fixture file via `readFileSync` and calls
   `new TypeScriptAdapter().parse(path, source, ctx)` (build a no-op `CompilationContext`
   like the existing adapter tests).
3. Assert the extracted facts (see §7). No closure, no IR building.

## 5. Input → Output examples (golden)

For `auth.controller.ts` containing `class AuthController { login() { return this.authService.login(...) } }`:
- `symbols` includes a `class` named `AuthController` and a `method` named `login`.
- `calls` includes `this.authService.login`.

## 6. Edge cases

- The fixture must be valid TypeScript (multi-line, real newlines) — never minified.
- Decorators (`@Controller()`, `@Injectable()`) are present but the adapter need not
  understand them; assertions target symbols/imports/calls only.

## 7. Acceptance criteria (each is a test in tests/fixtures/nestjs.test.ts)

1. `TypeScriptAdapter` extracts class `AuthController` from `auth.controller.ts`.
2. it extracts the `login` method.
3. `calls` from the controller include `this.authService.login`.
4. `AuthService` is extracted from `auth.service.ts` and its call to the repository appears.
5. coverage is not regressed (the test is deterministic; two parses are deep-equal).

## 8. Forbidden changes

- Do NOT modify any adapter, `LanguageAdapter`/`ParseResult`, or any package source.
- Do NOT edit `code-compiler/src/index.ts` or any `package.json`.
- Do NOT minify the fixture files.

## 9. References

- TypeScript adapter (the thing you validate): `packages/code-compiler/src/language/typescript.ts`
- Existing adapter test pattern (CompilationContext stub): `tests/compiler/typescript-adapter.test.ts`
- NestJS structure: https://docs.nestjs.com/controllers

## 10. Definition of done

format:check · build · typecheck · the §7 tests · PR `feat(tspec-fx02): nestjs fixture`.
