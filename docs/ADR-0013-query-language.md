# ADR-0013 — Query Language

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A013

## Context
Queries must be deterministic graph operations, not vector search.

## Decision
`@rir/query-engine` provides `QueryEngine` over a Repository IR: `capabilities(id)`,
`expand(seeds, depth)`, and `capabilitySubgraph(id)` returning a self-contained `Subgraph`
(nodes, edges, capabilities). Built on `@rir/graph` reachability.

## Invariants
1. No AI; pure graph traversal with deterministic output.
2. Output is always a valid Repository IR subgraph.
3. The semantic layer consumes subgraphs read-only.

## Consequences
"How does login work?" = locate capability → expand subgraph → hand IR to the (optional)
semantic layer.
