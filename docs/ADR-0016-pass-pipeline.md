# ADR-0016 — Pass Pipeline: Frontend→Pass Data Flow, Node Creation & Capability Discovery

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: amends TSPEC-A005/A006 · Version: RIR 1.0.0 (additive)

## Context

The language adapters (AD01–AD07) produce `ParseResult`s, and the closure/coverage/
consistency engines consume a Repository IR. The layer in between — the **passes** that
lift syntactic facts into IR — was blocked on three undecided contracts:

1. How parse results reach passes (the frontend→pass data flow).
2. Whether a pass can read earlier passes' output (`IRDraft` was write-only).
3. Which pass creates which nodes, and how code is classified into capability roles.

This ADR decides all three and makes the corresponding (additive, non-breaking) contract
changes in `@rir/core` and `@rir/builder-engine`.

## Decision

### 1. Frontend→pass data flow

`ParseResult` and its fact types (`SymbolFact`, `ImportFact`, `CallFact`, `RouteFact`)
now live in `@rir/core` (re-exported from `@rir/code-compiler` for adapter ergonomics).
`CompilationContext` gains an optional `parseResults?: readonly ParseResult[]`, populated
by the frontend (adapters) before any pass runs and read by the early passes. It is
optional because it is absent during the adapter phase itself.

Pipeline shape:

```
files → language adapters → ParseResult[]  (ctx.parseResults)
      → node-lifting passes → reachability pass → capability pass
      → IR → closure / coverage / consistency
```

### 2. IRDraft read access + idempotent writes

`IRDraft` gains `getNodes()`, `getEdges()`, `getNode(id)`, `getCapabilities()`. Writes are
**idempotent by id**: re-adding a node/edge with the same id replaces it, so multiple
passes may contribute or refine the same vertex without conflict. This lets a later pass
consume an earlier pass's output (e.g. ReachabilityPass reading Call/Route nodes).

### 3. Node creation ownership + classification

Each pass owns the node/edge **kinds** for its concern; the draft dedups by id:

| Pass | Creates nodes | Creates edges |
| --- | --- | --- |
| ImportPass | `MODULE` (one per artifact) | `IMPORTS` |
| CallPass | from `SymbolFact`: `FUNCTION`/`METHOD`/`INTERFACE`/`TYPE`/`VARIABLE`, and **classes via the classification rule below** | `CALLS` |
| RoutePass | `ROUTE` (from `RouteFact`) | `ROUTES_TO` |
| ReachabilityPass | — (rewrites `execution` on existing nodes) | — |
| CapabilityPass | — (binds nodes to capabilities) | — |

**Class classification rule (architect-owned, deterministic, applied by CallPass):** a
`class` symbol becomes node kind `CONTROLLER` if its name ends with `Controller`, `SERVICE`
if `Service`, `REPOSITORY` if `Repository`, otherwise `CLASS`. This is the same fixed
heuristic the proving slice (`apps/cli/src/prove.ts`) validated, and it is what lets the
closure stage mapping (`STAGE_OF_NODE_KIND`) recognise backend layers. Implementers apply
the rule exactly; they do not invent classifications.

Call resolution: a `CallFact.callee` of the form `<obj>.<method>` or `this.<field>.<method>`
resolves to a class node by mapping the binding to a declared class (best-effort, by name).
Unresolved callees produce no edge (never guess).

### 4. Capability discovery (CapabilityPass)

For each `ROUTE` node, derive a key from the last path segment or the handler name and
resolve it against the ontology (`getCapability` / `resolveAlias`, e.g. `"/login"` →
`AUTH.LOGIN`). On a match, emit a `CapabilityIR` whose `nodes` are the route plus the
nodes reachable from it, with `closure: PARTIAL` (the closure engine assigns the final
state). No ontology id is invented; unmatched routes produce no capability.

## Invariants

1. Adapters remain non-semantic; all IR construction happens in passes.
2. Classification and discovery use FIXED rules; no per-repository heuristics, no AI.
3. The contract changes are additive (optional field, new interface methods) — existing
   `CompilationContext` stubs and the merged adapters compile unchanged.
4. Pass ordering remains the canonical roster order (ADR-0007); node-lifting passes run
   before ReachabilityPass, which runs before CapabilityPass.

## Consequences

- The mechanical passes (ImportPass, CallPass, RoutePass, ReachabilityPass) are now
  fully specifiable as `ROLE_IMPLEMENTER` work orders against these contracts.
- CapabilityPass is mechanical given §4's rule, but its rule is architect-owned; changes
  to the rule require a new ADR.
- `prove.ts` remains as the reference end-to-end behaviour; the passes reproduce it as a
  proper, testable pipeline.

## Amends

- ADR-0006 (IRDraft read contract — open item now closed).
- ADR-0007 (node-creation ownership clarified; roster unchanged).
