# Branching, Review, Merge & Commits

## Branching

- Everything starts from `main`.
- Each TSPEC creates exactly one branch: `feature/<tspec-id>-<slug>` (the `branch`
  field of the TSPEC).
- **No stacked branches. No child branches. No branch chains. No merge trains.**
- A branch maps to exactly one TSPEC and one PR.

## Flow

```
main
→ feature/<tspec-id>-<name>
→ PR
→ Architect review
→ merge (squash)
→ delete branch
→ repository compile
→ project compile (pnpm eos:compile)
→ dependency refresh
→ next queue
```

## Review strategy

- Reviewer is always `ROLE_ARCHITECT` (see `project.review.yaml`).
- Review verifies: architecture untouched, determinism, ontology/IR compatibility,
  naming, performance, future extensibility. Architectural drift is rejected.
- Implementer PRs that attempt protected changes are rejected and converted into a
  `ROLE_ARCHITECT` TSPEC + ADR.

## Merge strategy

- Squash merge only; one commit per TSPEC on `main`.
- Merge is allowed only when all CI gates are green and state is `APPROVED`.
- Post-merge automation runs the Repository Compiler and `pnpm eos:compile`.

## Commit convention

`type(tspec-id): summary`

| type | use |
| --- | --- |
| `feat` | new capability/implementation |
| `fix` | bug fix |
| `test` | tests only |
| `docs` | documentation / ADR |
| `perf` | performance, behavior identical |
| `refactor` | structure only, behavior identical |
| `chore` | tooling / CI |

Examples: `feat(tspec-i003): graph algorithms`, `docs(tspec-a001): repository IR ADR`,
`perf(tspec-e01): closure stage lookup`. No arbitrary commits.

## Parallel execution

- Implement TSPECs **wave by wave** (`project.waves.yaml`). Everything within a wave is
  independent and may proceed in parallel.
- The **critical path** (`project.execution.yaml`) is the longest effort-weighted chain;
  prioritize it to minimize total time.
- Independent groups never share files; builder responsibilities never overlap.
