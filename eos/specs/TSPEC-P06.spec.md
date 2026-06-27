# TSPEC-P06 — EventPass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Heuristic below is the architect's decision; apply it exactly.

- **TSPEC:** TSPEC-P06 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Detect event emit/consume from call facts and add `EVENT` / `EVENT_CONSUMER` nodes + edges.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/EventPass.ts`
- create `tests/passes/event-pass.test.ts`

## Behavior
`name = "EventPass"`, `priority = PASS_PRIORITY.EventPass`, `supports()` true. `run(ctx, draft)`:
for each `pr`, for each `call`, let `method` = last `.`-segment of `call.callee` (lower-cased):
- if `method` ∈ `{ emit, publish, dispatch }`: create an `EVENT` node (id =
  `makeId("event", pr.artifact.path, String(call.span.startLine))`, name = `method`,
  artifactId = `pr.artifact.id`, span, default execution, evidence `[AST]`); if
  `call.enclosing` resolves to a node, add an `EMITS` edge from it to the EVENT node.
- if `method` ∈ `{ on, subscribe, addlistener, handle }`: create an `EVENT_CONSUMER` node
  (id = `makeId("consumer", ...)`); if `call.enclosing` resolves, add a `CONSUMES` edge.
- otherwise no node/edge.

Edge ids `makeId("edge","emits"|"consumes", from, to)`, evidence `[AST]`. Idempotent.

## Acceptance (each a test; DefaultIRDraft + CompilationContext stub)
1. `bus.emit(...)` (enclosing a known decl) → an `EVENT` node + `EMITS` edge.
2. `bus.on(...)` → an `EVENT_CONSUMER` node + `CONSUMES` edge.
3. a plain call → no event node.
4. determinism: two runs yield equal sealed IR.
5. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/adapter. Do NOT change the method sets. Package-name imports only.

## References
ADR-0016; `@rir/ir` (`NodeKind.Event`, `NodeKind.EventConsumer`, `EdgeKind.Emits`, `EdgeKind.Consumes`); DefaultIRDraft.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p06): event pass`.
