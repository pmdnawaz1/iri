# TSPEC-P05 — SQLPass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Do NOT edit `packages/passes/src/index.ts`. Package-name imports.
> The detection heuristic below is the architect's decision (amends ADR-0016); apply it exactly.

- **TSPEC:** TSPEC-P05 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Detect database access from call facts and add `SQL_QUERY` nodes + edges, so closure can
see the `DATABASE` stage. Heuristic and deterministic.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/SQLPass.ts`
- create `tests/passes/sql-pass.test.ts`

## Behavior
`name = "SQLPass"`, `priority = PASS_PRIORITY.SQLPass`, `supports()` true. `run(ctx, draft)`:
for each `pr` in `ctx.parseResults ?? []`, for each `call` in `pr.calls`:
- let `method` = the last `.`-segment of `call.callee`. If `method` (lower-cased) is in the
  fixed set `{ query, execute, exec, raw, insert, update, delete, find, findone, save }`:
  - create a `SQL_QUERY` node: id = `makeId("sql", pr.artifact.path, String(call.span.startLine))`,
    name = `method`, language = `pr.artifact.language`, artifactId = `pr.artifact.id`,
    span = `call.span`, hash = "0", default execution, evidence `[AST]`.
  - if `call.enclosing` resolves to an existing node (`draft.getNode(makeId("decl", call.enclosing))`),
    add an edge from it to the SQL node: kind `WRITES` if `method` ∈ `{ insert, update, delete, save, exec, execute }`, else `READS`. id = `makeId("edge","sql", from, sqlId)`, evidence `[AST]`.
- otherwise no node/edge. (`SQL_QUERY` maps to the `DATABASE` execution stage in closure.)

## Acceptance (each a test; DefaultIRDraft + CompilationContext stub)
1. a call `this.db.query(...)` (enclosing a known decl) yields a `SQL_QUERY` node and a `READS` edge.
2. `this.db.insert(...)` yields a `WRITES` edge.
3. a non-DB call (e.g. `foo.bar()`) yields no SQL node.
4. determinism: two runs yield equal sealed IR.
5. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/adapter. Do NOT change the method set. Package-name imports only.

## References
ADR-0016; `@rir/ir` (`NodeKind.SqlQuery`); `@rir/closure` (`STAGE_OF_NODE_KIND` maps SQL_QUERY→DATABASE); DefaultIRDraft.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p05): sql pass`.
