import { AbstractPass, PASS_PRIORITY } from "./base.js";
import { makeId } from "@rir/common";
import type { IRDraft, CompilationContext } from "@rir/core";
import { ClosureState, type NodeIR } from "@rir/ir";
import { DirectedGraph, reachableFrom } from "@rir/graph";
import { allCapabilities, getCapability, getFeature, resolveAlias } from "@rir/ontology";

const VERB_CAP: Readonly<Record<string, string>> = {
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "CANCEL",
  GET: "VIEW",
};

function singular(s: string): string {
  return s.endsWith("s") ? s.slice(0, -1) : s;
}

/**
 * Resolve a backend ROUTE to an ontology capability id via a deterministic signal cascade
 * (ADR-0018 / TSPEC-A017): exact name/alias → verb+noun → controller name. Returns the
 * capability id, or undefined when no signal matches (caller records it as UNMAPPED).
 */
function resolveRoute(routeName: string, controllerName: string | undefined): string | undefined {
  const parts = routeName.split(" ");
  const method = (parts[0] ?? "GET").toUpperCase();
  const path = parts.length > 1 ? parts[1]! : (parts[0] ?? "");
  const segments = path.split("/").filter((s) => Boolean(s) && !s.startsWith(":"));
  const last = segments[segments.length - 1]?.toLowerCase();
  const verbCap = VERB_CAP[method];

  if (last) {
    const byName = allCapabilities().find((c) => c.name.toLowerCase() === last);
    if (byName) return byName.id;
    const byAlias = resolveAlias(last);
    if (byAlias) return byAlias.id;
    if (verbCap) {
      const feature = getFeature(singular(last).toUpperCase());
      const c = feature && getCapability(`${feature.id}.${verbCap}`);
      if (c) return c.id;
    }
  }
  if (controllerName && verbCap) {
    const fid = controllerName.replace(/(Controller|Service|Repository)$/i, "").toUpperCase();
    const feature = getFeature(fid);
    const c = feature && getCapability(`${feature.id}.${verbCap}`);
    if (c) return c.id;
  }
  return undefined;
}

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

    // Undirected graph: a capability is the route plus everything connected to it (the
    // frontend subgraph reaches the route via API_CALL, the backend hangs off it). Closure
    // still only counts directed-reachable nodes (set by ReachabilityPass).
    const graph = new DirectedGraph();
    for (const node of nodes) graph.addNode(node.id);
    for (const edge of edges) {
      graph.addEdge(edge.from, edge.to);
      graph.addEdge(edge.to, edge.from);
    }

    // Map each route to its ROUTES_TO controller name (a discovery signal).
    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    const controllerOf = new Map<string, string>();
    for (const e of edges) {
      if (e.kind === "ROUTES_TO") {
        const target = byId.get(e.to);
        if (target) controllerOf.set(e.from, target.name);
      }
    }

    for (const node of nodes) {
      if (node.kind !== "ROUTE") continue;
      const reachable = [...reachableFrom(graph, [node.id])];
      const evidence = [{ source: "AST" as const, locator: node.name, confidence: 1 }];

      const capId = resolveRoute(node.name, controllerOf.get(node.id));
      if (capId) {
        draft.addCapability({
          id: makeId("cap", capId, node.id),
          feature: capId.split(".")[0]!,
          capability: capId,
          constraints: [],
          nodes: reachable,
          closure: ClosureState.Partial,
          evidence,
        });
      } else {
        // Never miss: a route that maps to no ontology id is recorded as UNMAPPED so the
        // self-evolution loop (ADR-0018) can propose ontology for it.
        const sanitized =
          node.name
            .split(" ")[1]
            ?.replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
            .toUpperCase() || "ROOT";
        const method = (node.name.split(" ")[0] ?? "GET").toUpperCase();
        const unmapped = `UNMAPPED.${method}_${sanitized}`;
        draft.addCapability({
          id: makeId("cap", unmapped, node.id),
          feature: "UNMAPPED",
          capability: unmapped,
          constraints: [],
          nodes: reachable,
          closure: ClosureState.Orphan,
          evidence,
        });
      }
    }
  }
}

export type { NodeIR };
