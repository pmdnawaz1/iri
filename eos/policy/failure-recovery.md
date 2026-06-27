# Failure Recovery (Deterministic)

Every failure mode has a defined, repeatable recovery. No ad-hoc fixes.

| Failure | Detection | Recovery |
| --- | --- | --- |
| Failed build | CI build gate | Revert to last green `main`; fix on the TSPEC branch; re-run gates. |
| Failed tests | CI test gate | Keep branch open; state stays `IMPLEMENTING`; fix + re-run. Never merge red. |
| Broken dependency | Dependency validator | Block dependent TSPECs; raise the upstream TSPEC to `CHANGES_REQUESTED`. |
| Architecture drift | Architecture-lock validator | Reject PR; open a `ROLE_ARCHITECT` TSPEC + ADR; implementation blocked until merged. |
| Invalid TSPEC | Project Compiler | `pnpm eos:compile` fails with the offending id; fix `dataset.ts`; recompile. |
| Graph corruption | Project/graph validator | Regenerate from `dataset.ts` (single source of truth); never hand-edit state files. |
| Repository IR mismatch | RIR validator / golden tests | Recompile repository; if intended, version the IR + migration ADR. |
| Requirement IR mismatch | Requirement IR validator | Recompile documents; resolve conflicting constraints via ADR. |
| Merge conflict | Git | Rebase the single feature branch onto latest `main`; re-run gates. No merge trains. |
| Cancelled TSPEC | Manual | Set deps to skip; remove from `dataset.ts`; recompile; downstream waves recompute. |
| Abandoned TSPEC | Stale branch | Close PR, delete branch; TSPEC returns to `READY_FOR_IMPLEMENTATION`. |
| Duplicate implementation | Consistency engine (DUPLICATE_CAPABILITY) | Keep one; the other becomes `CHANGES_REQUESTED` or is cancelled. |
| Circular dependency | Project Compiler (cycle detection) | `eos:compile` fails; break the cycle in `dataset.ts`. |
| Orphan package | Project Compiler (orphan warning) | Attach to an architect contract dependency or remove. |

## Principles

- The Project IR (`dataset.ts`) is the only source of truth; recovery always means
  fixing the source and recompiling, never patching generated artifacts.
- `main` is always green and releasable. Recovery never leaves `main` broken.
