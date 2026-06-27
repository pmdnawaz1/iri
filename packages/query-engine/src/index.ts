/**
 * @rir/query-engine — Deterministic graph queries.
 *
 * Replaces vector search with graph operations: locate a capability, expand its
 * subgraph, collect connected nodes, filter by evidence. No AI. The result is a
 * Repository IR subgraph that callers (including the semantic layer) consume.
 */

import { DirectedGraph, reachableFrom } from "@rir/graph";
import type { CapabilityIR, EdgeIR, NodeIR, RepositoryIR } from "@rir/ir";

/** A self-contained slice of the Repository IR. */
export interface Subgraph {
  readonly nodes: readonly NodeIR[];
  readonly edges: readonly EdgeIR[];
  readonly capabilities: readonly CapabilityIR[];
}

/** Deterministic query surface over a Repository IR. */
export class QueryEngine {
  private readonly nodesById: Map<string, NodeIR>;
  private readonly graph: DirectedGraph;

  constructor(private readonly ir: RepositoryIR) {
    this.nodesById = new Map(ir.nodes.map((n) => [n.id, n]));
    this.graph = new DirectedGraph();
    for (const n of ir.nodes) this.graph.addNode(n.id);
    for (const e of ir.edges) this.graph.addEdge(e.from, e.to);
  }

  /** Find the capability instances bound to an ontology capability id. */
  capabilities(ontologyId: string): readonly CapabilityIR[] {
    return this.ir.capabilities.filter((c) => c.capability === ontologyId);
  }

  /** Expand a set of seed node ids to everything reachable within `depth` hops. */
  expand(seeds: Iterable<string>, depth: number): Subgraph {
    const included = new Set<string>();
    let frontier = new Set<string>([...seeds].filter((id) => this.nodesById.has(id)));
    for (const id of frontier) included.add(id);
    for (let i = 0; i < depth; i++) {
      const next = new Set<string>();
      for (const id of frontier) {
        for (const neighbor of this.graph.neighbors(id)) {
          if (!included.has(neighbor)) {
            included.add(neighbor);
            next.add(neighbor);
          }
        }
      }
      frontier = next;
    }
    return this.slice(included);
  }

  /** Extract the full subgraph for a capability: its nodes plus all they reach. */
  capabilitySubgraph(ontologyId: string): Subgraph {
    const caps = this.capabilities(ontologyId);
    const seeds = caps.flatMap((c) => c.nodes);
    const reachable = reachableFrom(this.graph, seeds);
    return this.slice(reachable, caps);
  }

  private slice(nodeIds: ReadonlySet<string>, caps?: readonly CapabilityIR[]): Subgraph {
    const nodes = [...nodeIds].map((id) => this.nodesById.get(id)).filter((n): n is NodeIR => n !== undefined);
    const edges = this.ir.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
    const capabilities =
      caps ?? this.ir.capabilities.filter((c) => c.nodes.some((id) => nodeIds.has(id)));
    return { nodes, edges, capabilities };
  }
}
