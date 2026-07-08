/**
 * DeadCodeEngine — P1 dead-code detection over the Repository IR.
 *
 * Three detection modes:
 *   1. DEAD_EXPORT — node is exported but has zero incoming IMPORTS/CALLS/REFERENCES
 *      edges from outside its own file (public API surface that nothing uses).
 *   2. UNREACHABLE — node has execution.reachable=false (no path from any
 *      entrypoint). Skips ENTRYPOINT/TEST/ROUTE/FRONTEND_ROUTE kinds since those
 *      define the entry surface themselves.
 *   3. DEAD_FILE — all nodes in a file are either unreachable or dead exports.
 *
 * Edge kinds considered "live usage": IMPORTS, CALLS, REFERENCES, INSTANTIATES,
 * DEPENDS_ON, INHERITS, IMPLEMENTS, DECORATES, CATCHES, THROWS, CONSUMES, EMITS.
 * Pure CONTAINS edges do not count — a file containing its own definition is not
 * external usage.
 *
 * Never flags MODULE nodes (which have no meaningful public surface) or nodes
 * marked `execution.runtimeObserved === true`.
 */

import { Criticality, getCriticality } from "@rir/ontology";
import type { NodeIR, RepositoryIR } from "@rir/ir";

/** Node kinds that define the entry surface and are never "dead" individually. */
const ENTRY_NODE_KINDS = new Set([
  "ENTRYPOINT", "TEST", "ROUTE", "FRONTEND_ROUTE", "WORKER", "DOCUMENT", "MODULE",
]);

export interface DeadCodeFinding {
  readonly code: "DEAD_EXPORT" | "UNREACHABLE" | "DEAD_FILE";
  readonly severity: "ERROR" | "WARNING";
  readonly nodeId?: string;
  readonly filePath?: string;
  readonly capability?: string;
  readonly criticality: Criticality;
  readonly message: string;
}

export class DeadCodeEngine {
  check(ir: RepositoryIR): readonly DeadCodeFinding[] {
    const findings: DeadCodeFinding[] = [];

    // Build incoming-edge index: nodeId → set of edge kinds
    const incoming = new Map<string, Set<string>>();
    const nodeByFile = new Map<string, string[]>();

    for (const edge of ir.edges) {
      if (!incoming.has(edge.to)) incoming.set(edge.to, new Set());
      incoming.get(edge.to)!.add(edge.kind);
    }

    for (const node of ir.nodes) {
      const fp = node.filePath ?? "";
      if (!fp) continue;
      const list = nodeByFile.get(fp) ?? [];
      list.push(node.id);
      nodeByFile.set(fp, list);
    }

    const fileNodes = new Map<string, NodeIR[]>();
    for (const node of ir.nodes) {
      const fp = node.filePath ?? "";
      if (!fp) continue;
      const list = fileNodes.get(fp) ?? [];
      list.push(node);
      fileNodes.set(fp, list);
    }

    // Mode 1 + 2: Scan every node
    for (const node of ir.nodes) {
      if (ENTRY_NODE_KINDS.has(node.kind)) continue;
      if (node.execution?.runtimeObserved) continue;
      if (node.kind === "MODULE") continue;

      const fp = node.filePath ?? "";
      const criticality = getCriticality(node.qualifiedName ?? node.name);

      // Mode 2: UNREACHABLE
      if (node.execution?.reachable === false) {
        findings.push({
          code: "UNREACHABLE",
          severity: "WARNING",
          nodeId: node.id,
          filePath: fp,
          criticality,
          message: `Node ${node.name} (${node.kind}) is unreachable from any entrypoint`,
        });
        continue; // unreachable implies dead; skip redundant DEAD_EXPORT
      }

      // Mode 1: DEAD_EXPORT
      if (node.isExported !== true) continue;

      const incomingKinds = incoming.get(node.id);
      if (!incomingKinds || incomingKinds.size === 0) {
        findings.push({
          code: "DEAD_EXPORT",
          severity: "WARNING",
          nodeId: node.id,
          filePath: fp,
          criticality,
          message: `Exported ${node.kind.toLowerCase()} ${node.name} has zero incoming references`,
        });
      }
    }

    // Mode 3: DEAD_FILE — all nodes in a file are dead
    for (const [fp, nodes] of fileNodes) {
      const nonEntry = nodes.filter((n) => !ENTRY_NODE_KINDS.has(n.kind));
      if (nonEntry.length === 0) continue;
      const allDead = nonEntry.every((n: NodeIR): boolean => {
        if (n.execution?.reachable === false) return true;
        if (!n.isExported) return n.execution?.reachable !== true;
        const kinds = incoming.get(n.id);
        return !kinds || kinds.size === 0;
      });
      if (allDead) {
        findings.push({
          code: "DEAD_FILE",
          severity: "WARNING",
          filePath: fp,
          criticality: "LOW",
          message: `All ${nonEntry.length} non-entrypoint nodes in ${fp} are dead`,
        });
      }
    }

    return findings;
  }
}
