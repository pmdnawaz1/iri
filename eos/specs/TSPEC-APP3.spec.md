# TSPEC-APP3 — Worker: CompileRepository job (Work Order)

> Authored by ROLE_ARCHITECT. Implement the first real background job using `@rir/compiler`.

- **TSPEC:** TSPEC-APP3 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-APP3.yaml`
- **Depends on:** TSPEC-I004, TSPEC-I006, @rir/compiler — COMPLETE · **Wave:** 7

## Objective
Implement the `CompileRepository` job: compile a directory and persist the resulting
snapshot via `@rir/storage`.

## Files
- create `apps/worker/src/jobs/compile-repository.ts` (the `Job`)
- modify `apps/worker/src/index.ts` (register the job with the `Worker`)
- modify `apps/worker/package.json` (add `@rir/compiler`, `@rir/ir`)
- create `tests/integration/worker-compile.test.ts`

## Behavior
- Implement a `Job` named `CompileRepository` (matching the existing `JobName` union) whose
  `run(logger)` compiles a configured directory via `compileRepository(dir)`, wraps the IR
  in a `SnapshotIR` (`{ id: makeId("snap", dir, hash), createdAt: new Date().toISOString(),
  repositoryHash: <hash of dir path>, ir }`), and saves it via an injected `Storage`
  (default `new InMemoryStorage()`).
- Make the job constructable with `(dir, storage)` so the test can inject `InMemoryStorage`
  and a known dir. Register it in `index.ts` via `new Worker().register(...)`.

## Acceptance (each a test)
1. dispatching `CompileRepository` on `fixtures/express-auth` saves exactly one snapshot.
2. the saved snapshot's `ir.capabilities` includes `AUTH.LOGIN`.
3. `latestSnapshot()` returns the saved snapshot.

## Forbidden
Do NOT change `@rir/compiler`, `@rir/storage` interfaces, or the `Worker` framework. Do NOT minify.

## References
`apps/worker/src/index.ts` (`Worker`, `Job`, `JobName`); `@rir/compiler`; `@rir/storage`
(`InMemoryStorage`, `SnapshotIR`); `@rir/common` (`makeId`, `hash64`).

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-app3): worker compile job`.
