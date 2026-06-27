import { AbstractPass, PASS_PRIORITY } from "@rir/passes";
import { makeId } from "@rir/common";
import type { IRDraft, CompilationContext } from "@rir/core";
import { ClosureState } from "@rir/ir";
import { DirectedGraph, reachableFrom } from "@rir/graph";
import { allCapabilities, resolveAlias } from "@rir/ontology";

export class CapabilityPass extends AbstractPass {
  override name = "CapabilityPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.CapabilityPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(_ctx: CompilationContext, draft: IRDraft): void {
    const nodes = draft.getNodes();
    const edges = draft.getEdges();

    const graph = new DirectedGraph();
    for (const node of nodes) {
      graph.addNode(node.id);
    }
    for (const edge of edges) {
      graph.addEdge(edge.from, edge.to);
    }

    for (const node of nodes) {
      if (node.kind === "ROUTE") {
        // Derive key: "POST /auth/login" -> "login"
        const parts = node.name.split(" ");
        if (parts.length === 0) continue;
        const path = parts.length > 1 ? parts[1] : parts[0];
        if (!path) continue;
        const segments = path.split("/").filter(Boolean);
        if (segments.length === 0) continue;

        const lastSegment = segments[segments.length - 1];
        if (!lastSegment) continue;
        const key = lastSegment.toLowerCase();

        const capabilities = allCapabilities();
        const cap = capabilities.find((c) => c.name.toLowerCase() === key) ?? resolveAlias(key);

        if (!cap) {
          continue;
        }

        const feature = cap.id.split(".")[0];
        if (!feature) continue;

        const reachable = reachableFrom(graph, [node.id]);

        draft.addCapability({
          id: makeId("cap", cap.id, node.id),
          feature: feature,
          capability: cap.id,
          constraints: [],
          nodes: [...reachable],
          closure: ClosureState.Partial,
          evidence: [
            {
              source: "AST",
              locator: node.name,
              confidence: 1,
            },
          ],
        });
      }
    }
  }
}
