/**
 * ReachabilityPass — TSPEC-P12
 *
 * Computes `reachable` + `entryDistance` for every node from repository entrypoints
 * (ROUTE or ENTRYPOINT kind nodes). Rewrites each node's execution facts.
 * Pure graph traversal using @rir/graph. Per ADR-0016.
 */

import type { CompilationContext, IRDraft } from "@rir/core";
import { DirectedGraph, distancesFrom } from "@rir/graph";
import { AbstractPass, PASS_PRIORITY } from "./base.js";

export class ReachabilityPass extends AbstractPass {
  readonly name = "ReachabilityPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.ReachabilityPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(_ctx: CompilationContext, draft: IRDraft): void {
    const nodes = draft.getNodes();
    const edges = draft.getEdges();

    // Build directed graph
    const graph = new DirectedGraph();
    for (const node of nodes) {
      graph.addNode(node.id);
    }
    for (const edge of edges) {
      graph.addEdge(edge.from, edge.to);
    }

    // Entrypoints: backend ROUTE, FRONTEND_ROUTE (browser entry), or explicit ENTRYPOINT.
    const entrypointIds = nodes
      .filter((n) => n.kind === "ROUTE" || n.kind === "FRONTEND_ROUTE" || n.kind === "ENTRYPOINT")
      .map((n) => n.id);

    // BFS distances from all entrypoints
    const dist = distancesFrom(graph, entrypointIds);

    // Update each node's execution facts
    for (const node of nodes) {
      draft.addNode({
        ...node,
        execution: {
          ...node.execution,
          reachable: dist.has(node.id),
          entryDistance: dist.get(node.id) ?? null,
        },
      });
    }
  }
}
