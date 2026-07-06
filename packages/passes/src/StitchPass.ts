/**
 * StitchPass — Cross-tier stitching (G3.3 / G7.3)
 *
 * Matches frontend fetch() calls to backend ROUTE nodes by URL path,
 * creating CROSS_TIER edges that connect the frontend and backend
 * tiers within a single monorepo compilation. This enables the CapabilityPass
 * to BFS across the tier boundary and prove full-stack closure.
 *
 * Reads source code to extract fetch URLs from function bodies.
 */

import { readFileSync } from "node:fs";
import type { CompilationContext, IRDraft } from "@rir/core";
import type { NodeIR } from "@rir/ir";
import { AbstractPass, PASS_PRIORITY } from "./base.js";

/** Regex to extract fetch() URL from source code. */
const FETCH_URL_RE = /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g;

/** Normalize a route name like "POST /login" to "/login". */
function routePath(name: string): string {
  const space = name.indexOf(" ");
  return space >= 0 ? name.slice(space + 1) : name;
}

/** Try to stitch a node to a route by matching URL paths found in source. */
function tryStitch(
  node: NodeIR,
  routeByPath: Map<string, NodeIR>,
  edges: readonly { from: string; to: string }[],
  draft: IRDraft,
): void {
  // Match API_CALL nodes by name
  if (node.kind === "API_CALL") {
    const fetchPath = extractFetchPath(node.name);
    if (fetchPath) {
      stitchToRoute(node, fetchPath, routeByPath, edges, draft);
    }
  }
}

function extractFetchPath(text: string): string | null {
  const match = text.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/);
  if (!match || !match[1]) return null;
  return match[1];
}

function stitchToRoute(
  node: NodeIR,
  fetchPath: string,
  routeByPath: Map<string, NodeIR>,
  edges: readonly { from: string; to: string }[],
  draft: IRDraft,
): void {
  const candidates = [fetchPath, fetchPath + "/", fetchPath.replace(/\/$/, "")];
  for (const candidate of candidates) {
    const routeNode = routeByPath.get(candidate);
    if (routeNode) {
      const alreadyExists = edges.some((e) => e.from === node.id && e.to === routeNode.id);
      if (!alreadyExists) {
        draft.addEdge({
          id: `stitch|${node.id}|${routeNode.id}`,
          kind: "CROSS_TIER" as any,
          from: node.id,
          to: routeNode.id,
          evidence: [{ source: "AST" as const, locator: "stitch-pass", confidence: 0.9 }],
        });
      }
      break;
    }
  }
}

export class StitchPass extends AbstractPass {
  readonly name = "StitchPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.StitchPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(ctx: CompilationContext, draft: IRDraft): void {
    const nodes = draft.getNodes();
    const edges = draft.getEdges();

    // Collect all ROUTE nodes indexed by their path.
    const routeByPath = new Map<string, NodeIR>();
    for (const node of nodes) {
      if (node.kind === "ROUTE") {
        const path = routePath(node.name);
        if (path) routeByPath.set(path, node);
      }
    }

    if (routeByPath.size === 0) return;

    // Build a map from artifactId to source file path.
    const artifactPaths = new Map<string, string>();
    for (const a of ctx.artifacts) {
      artifactPaths.set(a.id, a.path);
    }

    // Phase 1: Stitch API_CALL nodes by name.
    for (const node of nodes) {
      if (node.kind === "API_CALL") {
        tryStitch(node, routeByPath, edges, draft);
      }
    }

    // Phase 2: For FUNCTION/METHOD nodes, read source and look for fetch() calls.
    // If a function body contains fetch("/path"), stitch it to the matching route.
    for (const node of nodes) {
      if (node.kind !== "FUNCTION" && node.kind !== "METHOD") continue;
      if (node.language !== "typescript" && node.language !== "javascript") continue;

      // Read source file.
      const filePath = artifactPaths.get(node.artifactId) ?? node.filePath;
      if (!filePath) continue;

      let source: string;
      try {
        source = readFileSync(filePath, "utf8");
      } catch {
        continue;
      }

      // Extract all fetch() URLs from the source.
      const urls = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = FETCH_URL_RE.exec(source)) !== null) {
        if (m[1]) urls.add(m[1]);
      }

      // Stitch to matching routes.
      for (const url of urls) {
        stitchToRoute(node, url, routeByPath, edges, draft);
      }
    }
  }
}
