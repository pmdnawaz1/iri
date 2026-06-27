# TSPEC-AD05 — Go language adapter (Work Order)

> Authored by ROLE_ARCHITECT. Same structure as **TSPEC-AD03 (read it first)** — only the
> language deltas differ.

- **TSPEC:** TSPEC-AD05 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A007, TSPEC-I006 (COMPLETE) · **Wave:** 5

## Contract
`LanguageAdapter` with `language = "go"`, `extensions = [".go"]`. Same `ParseResult` shape.

## Files
- create `packages/code-compiler/src/language/go.ts` (`GoAdapter`)
- modify `packages/code-compiler/src/index.ts` (export, 1 line) and `package.json` (+`tree-sitter`, `tree-sitter-go`; add to root `pnpm.onlyBuiltDependencies`)
- create `tests/compiler/go-adapter.test.ts`

## Behavior (deltas from AD03 §4)
Load `tree-sitter-go`. Extract by node type:
- **symbols**: `function_declaration` → `function`; `method_declaration` → `method`;
  `type_spec` containing a `struct_type` → `class`. `name` from the `name` field.
  `exported` = identifier starts with an uppercase letter (Go's export rule).
- **imports**: `import_spec` → `specifier` = the `path` string literal text (strip quotes);
  `imported = []`.
- **exports**: names of top-level declarations whose identifier is uppercase.
- **calls**: `call_expression` → `callee` = text of the `function` field.
- **routes**: `[]`.
`span` and determinism exactly as AD03.

## Acceptance (each a test)
1. assignable to `LanguageAdapter`; 2. `supports("a.go")` true, `supports("a.ts")` false;
3. a struct + method extracted from an inline fixture; 4. an `import` specifier extracted;
5. a `call_expression` callee extracted; 6. determinism (two parses deep-equal);
7. coverage ≥ 95%.

## Forbidden
Same as AD03 §8.

## References
- tree-sitter-go: https://github.com/tree-sitter/tree-sitter-go · node-tree-sitter: https://github.com/tree-sitter/node-tree-sitter
- Pattern: `eos/specs/TSPEC-AD03.spec.md`, output shape `packages/code-compiler/src/language/typescript.ts`.

## Done
build · typecheck · lint · tests · coverage ≥ 95% · PR `feat(tspec-ad05): go language adapter`.
