import type { NodeIR, EdgeIR, EdgeKind } from "@rir/ir";
import type { IRDraft } from "@rir/core";
import * as fs from "node:fs";
import { makeId } from "@rir/common";
import type { UnresolvedRef } from "./types.js";

export type Language = string;
export type ReferenceKind =
  | "calls"
  | "imports"
  | "exports"
  | "extends"
  | "implements"
  | "references"
  | "type_of"
  | "returns"
  | "instantiates"
  | "overrides"
  | "decorates"
  | "function_ref";

export interface Node {
  id: string;
  kind: string;
  name: string;
  qualifiedName: string;
  filePath: string;
  language: string;
  signature?: string;
  returnType?: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  isExported?: boolean;
  updatedAt?: number;
}

export interface Edge {
  id?: string;
  source: string;
  target: string;
  kind: string;
  metadata?: any;
}

export interface UnresolvedReference extends UnresolvedRef {
  id: string;
}

export class MemoryQueryBuilder {
  private draft: IRDraft;
  private unresolvedRefs: Map<string, UnresolvedReference>;

  // Caches
  private filePaths = new Set<string>();
  private nodeNames = new Set<string>();
  private nodesByFile = new Map<string, Node[]>();
  private nodesByName = new Map<string, Node[]>();
  private nodesByQualifiedName = new Map<string, Node[]>();
  private nodesByKind = new Map<string, Node[]>();
  private nodesByLowerName = new Map<string, Node[]>();
  private nodesById = new Map<string, Node>();
  private outgoingEdges = new Map<string, Edge[]>();

  constructor(draft: IRDraft, unresolvedRefs: UnresolvedReference[]) {
    this.draft = draft;
    this.unresolvedRefs = new Map(unresolvedRefs.map((r) => [r.id, r]));

    // Build fast lookup tables from IRDraft nodes
    for (const irNode of draft.getNodes()) {
      const node = this.mapToNode(irNode);
      if (!node) continue;

      this.nodesById.set(node.id, node);
      this.nodeNames.add(node.name);

      if (node.filePath) {
        this.filePaths.add(node.filePath);
        if (!this.nodesByFile.has(node.filePath)) this.nodesByFile.set(node.filePath, []);
        this.nodesByFile.get(node.filePath)!.push(node);
      }

      if (!this.nodesByName.has(node.name)) this.nodesByName.set(node.name, []);
      this.nodesByName.get(node.name)!.push(node);

      if (node.qualifiedName) {
        if (!this.nodesByQualifiedName.has(node.qualifiedName))
          this.nodesByQualifiedName.set(node.qualifiedName, []);
        this.nodesByQualifiedName.get(node.qualifiedName)!.push(node);
      }

      if (!this.nodesByKind.has(node.kind)) this.nodesByKind.set(node.kind, []);
      this.nodesByKind.get(node.kind)!.push(node);

      const lowerName = node.name.toLowerCase();
      if (!this.nodesByLowerName.has(lowerName)) this.nodesByLowerName.set(lowerName, []);
      this.nodesByLowerName.get(lowerName)!.push(node);
    }

    // Build outgoing edges map
    for (const irEdge of draft.getEdges()) {
      const edge = this.mapToEdge(irEdge);
      if (!this.outgoingEdges.has(edge.source)) this.outgoingEdges.set(edge.source, []);
      this.outgoingEdges.get(edge.source)!.push(edge);
    }
  }

  private mapToNode(irNode: NodeIR): Node | null {
    return {
      id: irNode.id,
      kind: irNode.kind.toLowerCase(),
      name: irNode.name,
      qualifiedName: irNode.qualifiedName ?? irNode.name,
      filePath: irNode.filePath ?? "",
      language: irNode.language ?? "",
      signature: irNode.signature,
      returnType: irNode.returnType,
      startLine: irNode.span?.startLine ?? 0,
      endLine: irNode.span?.endLine ?? 0,
      startColumn: irNode.span?.startColumn ?? 0,
      endColumn: irNode.span?.endColumn ?? 0,
      isExported: irNode.isExported,
    };
  }

  private mapToEdge(irEdge: EdgeIR): Edge {
    return {
      id: irEdge.id,
      source: irEdge.from,
      target: irEdge.to,
      kind: irEdge.kind.toLowerCase(),
      metadata: undefined,
    };
  }

  updateNode(node: Node): void {
    const irNode = this.draft.getNode(node.id);
    if (irNode) {
      // framework resolvers update node properties like name/qualifiedName
      this.draft.addNode({
        ...irNode,
        name: node.name,
        qualifiedName: node.qualifiedName,
      });
    }
  }

  getAllFilePaths(): string[] {
    return Array.from(this.filePaths).filter((f) => typeof f === "string");
  }

  getAllFiles(): string[] {
    return this.getAllFilePaths();
  }

  readFile(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch {
      return null;
    }
  }

  getAllNodeNames(): string[] {
    return Array.from(this.nodeNames);
  }

  getNodesInFile(filePath: string): Node[] {
    return this.nodesByFile.get(filePath) || [];
  }

  getNodesByFile(filePath: string): Node[] {
    return this.getNodesInFile(filePath);
  }

  getNodesByName(name: string): Node[] {
    return this.nodesByName.get(name) || [];
  }

  getNodesByQualifiedNameExact(qualifiedName: string): Node[] {
    return this.nodesByQualifiedName.get(qualifiedName) || [];
  }

  getNodesByKind(kind: string): Node[] {
    return this.nodesByKind.get(kind.toLowerCase()) || [];
  }

  getNodesByLowerName(lowerName: string): Node[] {
    return this.nodesByLowerName.get(lowerName) || [];
  }

  getNodeById(id: string): Node | null {
    return this.nodesById.get(id) || null;
  }

  getOutgoingEdges(id: string, kinds: string[]): Edge[] {
    const edges = this.outgoingEdges.get(id) || [];
    return edges.filter((e) => kinds.includes(e.kind));
  }

  insertEdges(edges: Edge[]): void {
    for (const edge of edges) {
      const sourceNode = this.draft.getNode(edge.source);
      let edgeKind = edge.kind.toUpperCase() as EdgeKind;

      // A resolved call/reference whose source is a ROUTE node is the route->handler link.
      if (sourceNode?.kind === "ROUTE" && (edgeKind === "REFERENCES" || edgeKind === "CALLS")) {
        edgeKind = "ROUTES_TO" as EdgeKind;
      }

      this.draft.addEdge({
        id: edge.id || makeId("edge", edgeKind, edge.source, edge.target),
        kind: edgeKind,
        from: edge.source,
        to: edge.target,
        evidence: [{ source: "AST", locator: "ResolutionPass", confidence: 1 }],
      });
      // Update local edge cache so subsequent queries see it
      if (!this.outgoingEdges.has(edge.source)) this.outgoingEdges.set(edge.source, []);
      this.outgoingEdges.get(edge.source)!.push(edge);
    }
  }

  getUnresolvedReferencesCount(): number {
    return this.unresolvedRefs.size;
  }

  getUnresolvedReferencesBatch(offset: number, limit: number): UnresolvedReference[] {
    return Array.from(this.unresolvedRefs.values()).slice(offset, offset + limit);
  }

  addUnresolvedReferences(refs: UnresolvedReference[]): void {
    for (const ref of refs) {
      if (!this.unresolvedRefs.has(ref.id)) {
        this.unresolvedRefs.set(ref.id, ref);
      }
    }
  }

  deleteSpecificResolvedReferences(ids: string[]): void {
    for (const id of ids) {
      this.unresolvedRefs.delete(id);
    }
  }
}
