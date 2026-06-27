# ADR-0005 — Graph Semantics

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A004

## Context
Reachability, closure, and queries need graph algorithms with stable, testable output.

## Decision
`@rir/graph` provides a generic `DirectedGraph` plus `reachableFrom`, `distancesFrom`
(BFS), `topologicalSort` (Kahn), `stronglyConnectedComponents` (Tarjan), and
`connectedComponents`. Iteration follows insertion order so all results are deterministic.
No compiler or domain logic lives here.

## Invariants
1. Pure, deterministic algorithms; identical input → identical output ordering.
2. Evidence-bearing edges live in the Repository IR, not in the graph utility.
3. Reachability semantics: a node is reachable iff a path exists from an entrypoint.

## Consequences
Closure and query engines build a `DirectedGraph` from IR edges per analysis; the graph
package stays free of IR knowledge.
