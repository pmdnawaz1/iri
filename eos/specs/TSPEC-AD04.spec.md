# TSPEC-AD04 — Java language adapter (Work Order)

> Authored by ROLE_ARCHITECT. Same structure as **TSPEC-AD03 (read it first)** — only the
> language deltas differ.

- **TSPEC:** TSPEC-AD04 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A007, TSPEC-I006 (COMPLETE) · **Wave:** 5

## Contract
`LanguageAdapter` with `language = "java"`, `extensions = [".java"]`. Same `ParseResult` shape.

## Files
- create `packages/code-compiler/src/language/java.ts` (`JavaAdapter`)
- modify `packages/code-compiler/src/index.ts` (export, 1 line) and `package.json` (+`tree-sitter`, `tree-sitter-java`; add to root `pnpm.onlyBuiltDependencies`)
- create `tests/compiler/java-adapter.test.ts`

## Behavior (deltas from AD03 §4)
Load `tree-sitter-java`. Extract by node type:
- **symbols**: `class_declaration` → `class`; `interface_declaration` → `interface`;
  `method_declaration` → `method`. `name` from the `name` field. `exported` = the
  declaration has a `public` modifier (search the `modifiers` child for `public`).
- **imports**: `import_declaration` → `specifier` = the qualified name text; `imported = []`.
- **exports**: names of `public` top-level type declarations.
- **calls**: `method_invocation` → `callee` = text of the `name` field (or `object.name` if an
  `object` field is present), with `span`.
- **routes**: `[]`.
`span` and determinism exactly as AD03.

## Acceptance (each a test)
1. assignable to `LanguageAdapter`; 2. `supports("a.java")` true, `supports("a.ts")` false;
3. a `public class` + method extracted; 4. an `import` specifier extracted;
5. a `method_invocation` callee extracted; 6. determinism; 7. coverage ≥ 95%.

## Forbidden
Same as AD03 §8.

## References
- tree-sitter-java: https://github.com/tree-sitter/tree-sitter-java · node-tree-sitter: https://github.com/tree-sitter/node-tree-sitter
- Pattern: `eos/specs/TSPEC-AD03.spec.md`.

## Done
build · typecheck · lint · tests · coverage ≥ 95% · PR `feat(tspec-ad04): java language adapter`.
