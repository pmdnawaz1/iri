# TSPEC-P15 — GitPass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Not added to the default pipeline by you — the architect
> wires it. Package-name imports.

- **TSPEC:** TSPEC-P15 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Attach `GIT` provenance evidence to nodes from the git history of their source file.
Deterministic given the injected git runner; testable without a real git repo.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/GitPass.ts`
- create `tests/passes/git-pass.test.ts`

## Behavior
`name = "GitPass"`, `priority = PASS_PRIORITY.GitPass`, `supports()` true. Constructor takes
an injectable runner so it is testable:
```ts
type GitRunner = (filePath: string) => string | null; // returns last-commit sha or null
constructor(private readonly runGit: GitRunner = defaultRunner) {}
```
`defaultRunner(path)` runs `git log -1 --format=%H -- <path>` via `node:child_process`
`execFileSync` (cwd = the file's directory), returning the trimmed sha or `null` on error.

`run(ctx, draft)`:
- build a map `artifactId → path` from `ctx.artifacts`.
- for each `node` in `draft.getNodes()` with a known `artifactId`, call `this.runGit(path)`.
  If it returns a sha, re-add the node with an extra evidence entry
  `{ source: "GIT", locator: sha, confidence: 1 }` (do not duplicate an identical entry).
- nodes whose file has no sha are unchanged. Idempotent.

## Acceptance (each a test; DefaultIRDraft + CompilationContext stub)
1. with an injected runner returning `"abc123"`, a node gets a `GIT` evidence entry with `locator === "abc123"`.
2. with a runner returning `null`, the node's evidence is unchanged.
3. re-running does not duplicate the GIT evidence.
4. determinism: two runs with the same runner yield equal sealed IR.
5. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/adapter. Do NOT add GitPass to any builder. Package-name imports only.

## References
ADR-0016; `@rir/ir` (`EvidenceSource.Git`); `node:child_process` `execFileSync`; DefaultIRDraft.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p15): git pass`.
