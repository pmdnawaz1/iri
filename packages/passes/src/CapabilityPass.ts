import { readFileSync } from "node:fs";
import { AbstractPass, PASS_PRIORITY } from "./base.js";
import { makeId } from "@rir/common";
import type { IRDraft, CompilationContext } from "@rir/core";
import { ClosureState, type ConstraintIR, type NodeIR } from "@rir/ir";
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

/**
 * Extract code-side constraints (TSPEC-P10 / G1) by scanning a capability's reachable node
 * names for the ontology's declared constraint signals. Deterministic and symmetric with the
 * document normalizer's `extractConstraints`: a constraint is only asserted when a key token is
 * present (so `email` in a node name maps to LOGIN_IDENTIFIER only when "login" is also present,
 * not to an unrelated OTP_CHANNEL). This is what lets the cross engine fire CONSTRAINT_MISMATCH.
 */
function extractCodeConstraints(capId: string, sourceText: string): ConstraintIR[] {
  const def = getCapability(capId);
  if (!def) return [];
  const hay = sourceText.toLowerCase();
  const evidence = [{ source: "AST" as const, locator: capId, confidence: 0.6 }];
  const out: ConstraintIR[] = [];
  for (const cd of def.constraints) {
    const keyTokens = cd.key.toLowerCase().split("_");
    if (!keyTokens.some((t) => hay.includes(t))) continue;
    if (cd.type === "ENUM") {
      const v = cd.enumValues.find((ev) => hay.includes(ev.toLowerCase()));
      if (v) out.push({ key: cd.key, value: v, evidence });
    } else if (cd.type === "BOOLEAN") {
      out.push({
        key: cd.key,
        value: /\b(no|not|never|false|disable)\b/.test(hay) ? "FALSE" : "TRUE",
        evidence,
      });
    } else if (cd.type === "INTEGER") {
      const m = /\b(\d+)\b/.exec(hay);
      if (m) out.push({ key: cd.key, value: m[1]!, evidence });
    }
  }
  return out;
}

export class CapabilityPass extends AbstractPass {
  override name = "CapabilityPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.CapabilityPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(ctx: CompilationContext, draft: IRDraft): void {
    const nodes = draft.getNodes();
    const edges = draft.getEdges();

    // Source text per artifact, read once and cached (G1 constraint extraction needs the
    // identifiers/string-literals — e.g. `findByEmail` — that node names alone do not carry).
    const artifactPath = new Map(
      (ctx.parseResults ?? []).map((p) => [p.artifact.id, p.artifact.path] as const),
    );
    const sourceCache = new Map<string, string>();
    const sourceFor = (artifactId: string): string => {
      if (sourceCache.has(artifactId)) return sourceCache.get(artifactId)!;
      const path = artifactPath.get(artifactId);
      let text = "";
      if (path) {
        try {
          text = readFileSync(path, "utf8");
        } catch {
          text = "";
        }
      }
      sourceCache.set(artifactId, text);
      return text;
    };

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
        const artifactIds = new Set(reachable.map((id) => byId.get(id)?.artifactId).filter(Boolean));
        const source = [...artifactIds].map((aid) => sourceFor(aid as string)).join("\n");
        draft.addCapability({
          id: makeId("cap", capId, node.id),
          feature: capId.split(".")[0]!,
          capability: capId,
          constraints: extractCodeConstraints(capId, source),
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
