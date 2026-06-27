# TSPEC-P03 — RoutePass (Work Order)

> Same harness/conventions as **TSPEC-P02 (read it first)** + ADR-0016. COLLISION-FREE:
> only your pass file + test. Do NOT edit `packages/passes/src/index.ts`.

- **TSPEC:** TSPEC-P03 · **Owner:** ROLE_IMPLEMENTER · **Depends on:** TSPEC-A006, TSPEC-I006, ADR-0016 (COMPLETE) · **Wave:** 5

## Objective
Lift each `RouteFact` into a `ROUTE` node and a `ROUTES_TO` edge to the controller invoked
by its handler. RoutePass runs after CallPass, so controller nodes already exist; in unit
tests, pre-seed the controller node on the draft.

## Files (ADDITIVE ONLY)
- create `packages/passes/src/RoutePass.ts`
- create `tests/passes/route-pass.test.ts`

## Behavior
`name = "RoutePass"`, `priority = PASS_PRIORITY.RoutePass`, `supports()` true.
`run(ctx, draft)`: for each `pr` in `ctx.parseResults ?? []`, for each `route` in `pr.routes`:
- add a `ROUTE` node: id = `makeId("route", `${route.method} ${route.path}`)`, name =
  `${route.method} ${route.path}`, artifactId = `pr.artifact.id`, span = `route.span`,
  hash = "0", default execution, evidence `[AST]`.
- resolve the handler's controller: scan `route.handler` for `<ident>.<method>` patterns;
  for each `<ident>`, upper-case its first letter (`authController` → `AuthController`) and
  if `draft.getNode(makeId("decl", that))` exists, add a `ROUTES_TO` edge
  `{ id: makeId("edge","routesTo", routeId, controllerId), kind:"ROUTES_TO", from: routeId,
  to: controllerId, evidence:[AST] }`. No match ⇒ no edge.

## Acceptance (each a test; DefaultIRDraft + CompilationContext stub)
1. a `RouteFact { method:"POST", path:"/login" }` → a `ROUTE` node `POST /login`.
2. with a pre-seeded `CONTROLLER` node `AuthController` and handler text
   `"authController.login"` → a `ROUTES_TO` edge route→AuthController.
3. handler that resolves to no existing node → ROUTE node but no edge.
4. determinism: two runs yield equal sealed IR.
5. coverage ≥ 95%.

## Forbidden
Edit no shared file/roster/`@rir/core`/adapter. Import via package names only.

## References
ADR-0016; `apps/cli/src/prove.ts` (route→controller resolution); DefaultIRDraft.

## Done
format:check · build · typecheck · the tests · PR `feat(tspec-p03): route pass`.
