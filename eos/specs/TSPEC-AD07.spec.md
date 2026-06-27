# TSPEC-AD07 — C# language adapter (Work Order)

> Authored by ROLE_ARCHITECT. Same structure as **TSPEC-AD03 (read it first)** — only the
> language deltas differ.

- **TSPEC:** TSPEC-AD07 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A007, TSPEC-I006 (COMPLETE) · **Wave:** 5

## Contract
`LanguageAdapter` with `language = "csharp"`, `extensions = [".cs"]`. Same `ParseResult` shape.

## Files
- create `packages/code-compiler/src/language/csharp.ts` (`CSharpAdapter`)
- modify `packages/code-compiler/src/index.ts` (export, 1 line) and `package.json` (+`tree-sitter`, `tree-sitter-c-sharp`; add to root `pnpm.onlyBuiltDependencies`)
- create `tests/compiler/csharp-adapter.test.ts`

## Behavior (deltas from AD03 §4)
Load `tree-sitter-c-sharp`. Extract by node type:
- **symbols**: `class_declaration` → `class`; `interface_declaration` → `interface`;
  `method_declaration` → `method`. `name` from the `name` field. `exported` = the
  declaration has a `public` modifier.
- **imports**: `using_directive` → `specifier` = the namespace text; `imported = []`.
- **exports**: names of `public` top-level type declarations.
- **calls**: `invocation_expression` → `callee` = text of the `function`/expression child, with `span`.
- **routes**: `[]`.
`span` and determinism exactly as AD03.

## Acceptance (each a test)
1. assignable to `LanguageAdapter`; 2. `supports("a.cs")` true, `supports("a.ts")` false;
3. a `public class` + method extracted; 4. a `using` specifier extracted;
5. an `invocation_expression` callee extracted; 6. determinism; 7. coverage ≥ 95%.

## Forbidden
Same as AD03 §8.

## References
- tree-sitter-c-sharp: https://github.com/tree-sitter/tree-sitter-c-sharp · node-tree-sitter: https://github.com/tree-sitter/node-tree-sitter
- Pattern: `eos/specs/TSPEC-AD03.spec.md`.

## Done
build · typecheck · lint · tests · coverage ≥ 95% · PR `feat(tspec-ad07): csharp language adapter`.
