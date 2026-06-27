# TSPEC-AD06 — Rust language adapter (Work Order)

> Authored by ROLE_ARCHITECT. Same structure as **TSPEC-AD03 (read it first)** — only the
> language deltas differ.

- **TSPEC:** TSPEC-AD06 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A007, TSPEC-I006 (COMPLETE) · **Wave:** 5

## Contract
`LanguageAdapter` with `language = "rust"`, `extensions = [".rs"]`. Same `ParseResult` shape.

## Files
- create `packages/code-compiler/src/language/rust.ts` (`RustAdapter`)
- modify `packages/code-compiler/src/index.ts` (export, 1 line) and `package.json` (+`tree-sitter`, `tree-sitter-rust`; add to root `pnpm.onlyBuiltDependencies`)
- create `tests/compiler/rust-adapter.test.ts`

## Behavior (deltas from AD03 §4)
Load `tree-sitter-rust`. Extract by node type:
- **symbols**: `struct_item` → `class`; `function_item` → `function` (top level) or `method`
  (when nested inside an `impl_item`); `trait_item` → `interface`. `name` from the `name`
  field. `exported` = the item has a `visibility_modifier` child equal to `pub`.
- **imports**: `use_declaration` → `specifier` = the path text after `use`; `imported = []`.
- **exports**: names of `pub` top-level items.
- **calls**: `call_expression` → `callee` = text of the `function` field, with `span`.
- **routes**: `[]`.
`span` and determinism exactly as AD03.

## Acceptance (each a test)
1. assignable to `LanguageAdapter`; 2. `supports("a.rs")` true, `supports("a.ts")` false;
3. a `pub struct` + an `impl` method extracted; 4. a `use` specifier extracted;
5. a `call_expression` callee extracted; 6. determinism; 7. coverage ≥ 95%.

## Forbidden
Same as AD03 §8.

## References
- tree-sitter-rust: https://github.com/tree-sitter/tree-sitter-rust · node-tree-sitter: https://github.com/tree-sitter/node-tree-sitter
- Pattern: `eos/specs/TSPEC-AD03.spec.md`.

## Done
build · typecheck · lint · tests · coverage ≥ 95% · PR `feat(tspec-ad06): rust language adapter`.
