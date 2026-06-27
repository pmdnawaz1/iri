# TSPEC-P09 — CapabilityPass (Work Order)

> Authored by ROLE_ARCHITECT. Implement using ONLY this document + ADR-0016 §4.
> COLLISION-FREE: create only your pass file + test. Do NOT edit
> `packages/passes/src/index.ts` or any shared file. Import via package names only.

- **TSPEC:** TSPEC-P09 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-P09.yaml`
- **Depends on:** TSPEC-A006, TSPEC-I006, TSPEC-I003, ADR-0016 — COMPLETE · **Wave:** 5

## 1. Objective

Discover capabilities: for each `ROUTE` node, resolve it to an ontology capability and emit
a `CapabilityIR` whose nodes are the route plus everything reachable from it. This is the
output the closure engine evaluates. Deterministic; uses the fixed rule in ADR-0016 §4.

## 2. Contract

Implement `Pass` (extend `AbstractPass` from `@rir/passes`; `name = "CapabilityPass"`,
`priority = PASS_PRIORITY.CapabilityPass`). Use: `CapabilityIR`, `ClosureState` from
`@rir/ir`; `IRDraft`, `CompilationContext` from `@rir/core`; `DirectedGraph`,
`reachableFrom` from `@rir/graph`; `allCapabilities`, `resolveAlias` from `@rir/ontology`;
`makeId` from `@rir/common`. CapabilityPass runs BEFORE ReachabilityPass, so it computes
reachability itself from the draft's edges (do not rely on `node.execution`).

## 3. Files (ADDITIVE ONLY)
- create `packages/passes/src/CapabilityPass.ts`
- create `tests/passes/capability-pass.test.ts`

## 4. Behavior / Algorithm

`run(ctx, draft)`:
1. `nodes = draft.getNodes()`, `edges = draft.getEdges()`. Build a `DirectedGraph`
   (add every node id, then every `from→to` edge).
2. For each node with `kind === "ROUTE"`:
   - Derive the key: the node name is `"<METHOD> <path>"`; take `path`, split on `/`,
     and use the last non-empty segment (e.g. `"POST /login"` → `"login"`). Lower-case it.
   - Resolve to a capability:
     `const cap = allCapabilities().find((c) => c.name.toLowerCase() === key) ?? resolveAlias(key);`
   - If no match → skip this route (never invent an id).
   - `reachable = reachableFrom(graph, [routeId])` (a Set including the route).
   - `draft.addCapability({ id: makeId("cap", cap.id, routeId), feature: cap.id.split(".")[0],
     capability: cap.id, constraints: [], nodes: [...reachable], closure: ClosureState.Partial,
     evidence: [{ source: "AST", locator: node.name, confidence: 1 }] })`.

Idempotent: re-running yields the same capabilities.

## 5. Input → Output examples (golden)

Pre-seed a draft with a `ROUTE` `POST /login`, a `CONTROLLER` `AuthController`, a `SERVICE`
`AuthService`, and edges route→controller→service:
- one `CapabilityIR` is emitted with `capability === "AUTH.LOGIN"`.
- its `nodes` include the route, AuthController and AuthService.
- its `closure` is `PARTIAL`.

## 6. Edge cases

- A route whose key resolves to no capability → no capability emitted.
- `"POST /auth/login"` → key `"login"` → AUTH.LOGIN.
- A route with no outgoing edges → a capability containing just the route.

## 7. Acceptance criteria (each a test; DefaultIRDraft + CompilationContext stub)
1. a `POST /login` route + a reachable controller/service yields one `AUTH.LOGIN` capability.
2. the capability's `nodes` include the reachable chain.
3. `closure` is `PARTIAL`.
4. an unresolvable route (e.g. `/healthz`) yields no capability.
5. determinism: two runs yield equal sealed IR.
6. coverage ≥ 95%.

## 8. Forbidden changes
Edit no shared file/roster/`@rir/core`/`@rir/ontology`/adapter. Do NOT change the
resolution rule. Never invent ontology ids.

## 9. References
ADR-0016 §4; `@rir/ontology` (`allCapabilities`, `resolveAlias`); `@rir/graph`
(`reachableFrom`); `apps/cli/src/prove.ts`; DefaultIRDraft.

## 10. Definition of done
format:check · build · typecheck · the §7 tests · coverage ≥ 95% · PR `feat(tspec-p09): capability pass`.
