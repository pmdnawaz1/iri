import { RIR_VERSION, isNodeKind, isEdgeKind, isClosureState, type RepositoryIR } from "./index.js";
import { InvariantError } from "@rir/common";

export function validateRepositoryIR(value: unknown): asserts value is RepositoryIR {
  if (typeof value !== "object" || value === null) throw new InvariantError("IR must be an object");
  const ir = value as Record<string, unknown>;

  if (ir.version !== RIR_VERSION) throw new InvariantError(`Invalid version: ${String(ir.version)}`);
  if (!Array.isArray(ir.nodes)) throw new InvariantError("nodes must be an array");
  if (!Array.isArray(ir.edges)) throw new InvariantError("edges must be an array");
  if (!Array.isArray(ir.artifacts)) throw new InvariantError("artifacts must be an array");
  if (!Array.isArray(ir.capabilities)) throw new InvariantError("capabilities must be an array");

  const nodeIds = new Set<string>();
  for (const node of ir.nodes) {
    if (typeof node !== "object" || node === null) throw new InvariantError("Invalid node");
    const n = node as Record<string, unknown>;
    if (typeof n.id !== "string" || n.id === "") throw new InvariantError("Node id must be non-empty string");
    if (typeof n.kind !== "string" || !isNodeKind(n.kind))
      throw new InvariantError(`Invalid node kind: ${String(n.kind)}`);
    nodeIds.add(n.id);

    if (typeof n.execution !== "object" || n.execution === null)
      throw new InvariantError("Node execution required");
    const exec = n.execution as Record<string, unknown>;
    if (typeof exec.reachable !== "boolean") throw new InvariantError("execution.reachable must be boolean");
    if (exec.entryDistance !== null && typeof exec.entryDistance !== "number")
      throw new InvariantError("execution.entryDistance must be number or null");

    if (!Array.isArray(n.evidence) || n.evidence.length === 0)
      throw new InvariantError("Node evidence must be non-empty");
  }

  for (const edge of ir.edges) {
    if (typeof edge !== "object" || edge === null) throw new InvariantError("Invalid edge");
    const e = edge as Record<string, unknown>;
    if (typeof e.kind !== "string" || !isEdgeKind(e.kind))
      throw new InvariantError(`Invalid edge kind: ${String(e.kind)}`);
    if (typeof e.from !== "string" || e.from === "") throw new InvariantError("Edge from must be non-empty");
    if (typeof e.to !== "string" || e.to === "") throw new InvariantError("Edge to must be non-empty");
    if (!nodeIds.has(e.from)) throw new InvariantError(`Edge from references missing node: ${e.from}`);
    if (!nodeIds.has(e.to)) throw new InvariantError(`Edge to references missing node: ${e.to}`);
    if (!Array.isArray(e.evidence) || e.evidence.length === 0)
      throw new InvariantError("Edge evidence must be non-empty");
  }

  for (const cap of ir.capabilities) {
    if (typeof cap !== "object" || cap === null) throw new InvariantError("Invalid capability");
    const c = cap as Record<string, unknown>;
    if (typeof c.capability !== "string" || c.capability === "")
      throw new InvariantError("Capability id must be non-empty");
    if (typeof c.closure !== "string" || !isClosureState(c.closure))
      throw new InvariantError(`Invalid closure state: ${String(c.closure)}`);
    if (!Array.isArray(c.nodes)) throw new InvariantError("Capability nodes must be array");
    for (const nid of c.nodes as unknown[]) {
      if (typeof nid !== "string" || !nodeIds.has(nid))
        throw new InvariantError(`Capability references missing node: ${String(nid)}`);
    }
  }
}
