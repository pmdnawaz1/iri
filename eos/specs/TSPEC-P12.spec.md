# TSPEC-P12 — ReachabilityPass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Do NOT edit `packages/passes/src/index.ts`.

- **TSPEC:** TSPEC-P12 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, TSPEC-I003, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Compute `reachable` + `entryDistance` for every node from the repository entrypoints and
rewrite each node's `execution`. Pure graph traversal — uses the read access on `IRDraft`.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/ReachabilityPass.ts`
- create `tests/passes/reachability-pass.test.ts`

## Behavior
`name = "ReachabilityPass"`, `priority = PASS_PRIORITY.ReachabilityPass`, `supports()` true.
Uses `DirectedGraph`, `distancesFrom` from `@rir/graph`. `run(ctx, draft)`:
1. read `nodes = draft.getNodes()`, `edges = draft.getEdges()`.
2. build a `DirectedGraph`: add every node id, then every edge (`from → to`).
3. entrypoints = node ids whose kind is `ROUTE` or `ENTRYPOINT`.
4. `dist = distancesFrom(graph, entrypointIds)`.
5. for each node, `draft.addNode({ ...node, execution: { ...node.execution,
   reachable: dist.has(node.id), entryDistance: dist.get(node.id) ?? null } })`
   (idempotent replace by id).

## Acceptance (each a test; DefaultIRDraft + CompilationContext stub)
Pre-seed the draft with a `ROUTE` node and `CONTROLLER`/`SERVICE` nodes plus edges
ROUTE→CONTROLLER→SERVICE, and one disconnected `CLASS` node:
1. the ROUTE node is reachable with `entryDistance` 0.
2. CONTROLLER has distance 1, SERVICE distance 2; both reachable.
3. the disconnected node is `reachable: false`, `entryDistance: null`.
4. other `execution` fields (runtimeObserved/tested) are preserved.
5. determinism: two runs yield equal sealed IR.
6. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/`@rir/graph`/adapter. Import via package names only.

## References
ADR-0016; `@rir/graph` (`distancesFrom`); `apps/cli/src/prove.ts` (reachability step); DefaultIRDraft.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p12): reachability pass`.
