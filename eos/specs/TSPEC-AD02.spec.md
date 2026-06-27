# TSPEC-AD02 — JavaScript language adapter (Work Order)

> Authored by ROLE_ARCHITECT. Implement using ONLY this document. No architectural
> decisions; if ambiguous, STOP and escalate.

- **TSPEC:** TSPEC-AD02 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-AD02.yaml`
- **Depends on:** TSPEC-A007, TSPEC-I006 — COMPLETE · **Wave:** 5
- **Sibling:** TSPEC-AD01 (TypeScript adapter) — same approach; read it first.

## 1. Objective

Parse a single JavaScript source file and emit the same syntactic `ParseResult` as the
TypeScript adapter (symbols, imports, exports, calls, routes). Non-semantic.

## 2. Contract (fixed — do not change)

Implement `LanguageAdapter` from `packages/code-compiler/src/index.ts` with
`language = "javascript"` and `extensions = [".js", ".jsx", ".mjs", ".cjs"]`. The
`ParseResult` shape is identical to AD01.

## 3. Files

| Action | Path | Purpose |
| --- | --- | --- |
| create | `packages/code-compiler/src/language/javascript.ts` | `JavaScriptAdapter` |
| modify | `packages/code-compiler/src/index.ts` | export `JavaScriptAdapter` |
| create | `tests/compiler/javascript-adapter.test.ts` | tests from §7 |

## 4. Behavior / Algorithm

1. Use the TypeScript Compiler API exactly as AD01 (it parses JS too):
   `ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)`. No type checking.
2. Extraction is identical to AD01 §4 (symbols / imports / exports / calls / routes).
3. **Reuse, do not duplicate:** if AD01 has merged and exposes a shared extractor (e.g.
   `extractParseResult(sourceFile, path)`), import and reuse it. If AD01 is not yet
   merged, implement the extraction standalone here using the same algorithm; a later
   refactor TSPEC will deduplicate. Do not block on AD01.
4. `supports(path)` → extension ∈ the list above.

## 5. Input → Output examples (golden)

Create a tiny JS fixture in the test (inline string), e.g.:
```js
class AuthService { login(email) { return this.repo.find(email); } }
router.post("/login", (req, res) => res.json({}));
```
- `routes` contains `{ method: "POST", path: "/login" }`.
- `symbols` contains class `AuthService` and method `login`.
- `calls` contains `this.repo.find`.

## 6. Edge cases

- `.jsx` supported. `.ts`/`.tsx` NOT claimed (that is AD01).
- Empty file → empty fact arrays + valid artifact.
- Non-literal route path → not emitted as a route.
- Determinism: identical source → deep-equal `ParseResult`.

## 7. Acceptance criteria (each is a test)

1. `JavaScriptAdapter` is assignable to `LanguageAdapter`.
2. `supports("a.js")` and `supports("a.jsx")` true; `supports("a.ts")` false.
3. the inline fixture yields class `AuthService` + method `login`.
4. the inline fixture yields one route `POST /login`.
5. `calls` include `this.repo.find`.
6. determinism: two parses deep-equal.
7. coverage for `javascript.ts` ≥ 95%.

## 8. Forbidden changes

- Do NOT change `LanguageAdapter`/`ParseResult` (TSPEC-A007).
- Do NOT resolve calls, build IR, or compute reachability here.
- Do NOT touch packages other than `code-compiler`.

## 9. References

- TypeScript Compiler API: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- Sibling work order: `eos/specs/TSPEC-AD01.spec.md`; reference shape: `apps/cli/src/prove.ts`.

## 10. Definition of done

build · typecheck · lint · the §7 tests · coverage ≥ 95% · PR `feat(tspec-ad02): javascript language adapter`.
