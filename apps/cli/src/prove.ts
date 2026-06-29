/**
 * Proving slice: read a real TypeScript backend, build a Repository IR, and run the
 * closure engine to report whether AUTH.LOGIN is wired end to end.
 *
 * This is a deliberately small vertical slice (one capability, one language, backend
 * layers by naming convention). It demonstrates the pipeline source -> IR -> verdict.
 * The production path replaces this ad-hoc extractor with the Tree-sitter language
 * adapters + compiler passes (TSPEC-AD01, TSPEC-P*). The IR and closure engine it
 * feeds are the real, already-built ones.
 */

import { createRequire } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { DirectedGraph, reachableFrom } from "@rir/graph";
import { makeId } from "@rir/common";
import {
  ClosureState,
  NodeKind,
  RIR_VERSION,
  type CapabilityIR,
  type EdgeIR,
  type EvidenceIR,
  type NodeIR,
  type RepositoryIR,
} from "@rir/ir";
import { evaluateClosure, type ClosureResult } from "@rir/closure";

const require = createRequire(import.meta.url);
const ts = require("typescript") as typeof import("typescript");

const AST: EvidenceIR = { source: "AST", locator: "proving-slice", confidence: 1 };

interface ClassInfo {
  readonly name: string;
  readonly kind: NodeKind;
  readonly nodeId: string;
}

function classKind(name: string): NodeKind | null {
  if (name.endsWith("Controller")) return NodeKind.Controller;
  if (name.endsWith("Service")) return NodeKind.Service;
  if (name.endsWith("Repository")) return NodeKind.Repository;
  return null;
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listTsFiles(full));
    else if (extname(full) === ".ts") out.push(full);
  }
  return out;
}

export interface ProveResult {
  readonly directory: string;
  readonly fileCount: number;
  readonly ir: RepositoryIR;
  readonly result: ClosureResult;
  readonly reachableChain: readonly string[];
}

export function prove(dir: string): ProveResult {
  const files = listTsFiles(dir);
  const sources = files.map((f) =>
    ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true),
  );

  const classes = new Map<string, ClassInfo>(); // className -> info
  const bindings = new Map<string, string>(); // local/field name -> className
  const edges: Array<[string, string]> = []; // [fromNodeId, toNodeId]
  const routeNodes: NodeIR[] = [];

  // Pass 1 — collect classes and `new X()` bindings.
  for (const sf of sources) {
    const visit = (node: import("typescript").Node): void => {
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const kind = classKind(name);
        if (kind) classes.set(name, { name, kind, nodeId: makeId("class", name) });
      }
      // const v = new X()  |  this.p = new X()  |  field = new X()
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
        const className = node.expression.text;
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
          bindings.set(parent.name.text, className);
        } else if (ts.isPropertyDeclaration(parent) && ts.isIdentifier(parent.name)) {
          bindings.set(parent.name.text, className);
        } else if (ts.isBinaryExpression(parent) && ts.isPropertyAccessExpression(parent.left)) {
          bindings.set(parent.left.name.text, className);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const resolveCallTarget = (expr: import("typescript").Expression): ClassInfo | null => {
    if (!ts.isPropertyAccessExpression(expr)) return null;
    const obj = expr.expression;
    let key: string | null = null;
    if (ts.isIdentifier(obj))
      key = obj.text; // v.method()
    else if (ts.isPropertyAccessExpression(obj) && obj.expression.kind === ts.SyntaxKind.ThisKeyword) {
      key = obj.name.text; // this.p.method()
    }
    if (!key) return null;
    const className = bindings.get(key);
    return className ? (classes.get(className) ?? null) : null;
  };

  // Pass 2 — routes (entrypoints) and call edges between classes.
  for (const sf of sources) {
    const visit = (node: import("typescript").Node): void => {
      // router.<method>("/path", handler)
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ["get", "post", "put", "delete", "patch"].includes(node.expression.name.text) &&
        node.arguments.length >= 2 &&
        ts.isStringLiteral(node.arguments[0]!)
      ) {
        const method = node.expression.name.text.toUpperCase();
        const path = (node.arguments[0] as import("typescript").StringLiteral).text;
        const routeId = makeId("route", `${method} ${path}`);
        routeNodes.push(makeNode(routeId, NodeKind.Route, `${method} ${path}`, sf.fileName));
        // Link the route to the controller invoked inside its handler.
        const handler = node.arguments[1]!;
        const findController = (n: import("typescript").Node): void => {
          if (ts.isCallExpression(n)) {
            const target = resolveCallTarget(n.expression);
            if (target && target.kind === NodeKind.Controller) edges.push([routeId, target.nodeId]);
          }
          ts.forEachChild(n, findController);
        };
        findController(handler);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  // Pass 3 — edges between class methods (this.x.y() / v.y()).
  for (const sf of sources) {
    const visitClass = (node: import("typescript").Node): void => {
      if (ts.isClassDeclaration(node) && node.name) {
        const from = classes.get(node.name.text);
        if (from) {
          const findCalls = (n: import("typescript").Node): void => {
            if (ts.isCallExpression(n)) {
              const target = resolveCallTarget(n.expression);
              if (target && target.nodeId !== from.nodeId) edges.push([from.nodeId, target.nodeId]);
            }
            ts.forEachChild(n, findCalls);
          };
          findCalls(node);
        }
      }
      ts.forEachChild(node, visitClass);
    };
    visitClass(sf);
  }

  // Reachability from route entrypoints.
  const graph = new DirectedGraph();
  const allNodes: NodeIR[] = [...routeNodes];
  for (const info of classes.values()) allNodes.push(makeNode(info.nodeId, info.kind, info.name, dir));
  for (const n of allNodes) graph.addNode(n.id);
  for (const [from, to] of edges) graph.addEdge(from, to);
  const reachable = reachableFrom(
    graph,
    routeNodes.map((r) => r.id),
  );

  const nodes: NodeIR[] = allNodes.map((n) => ({
    ...n,
    execution: {
      ...n.execution,
      reachable: reachable.has(n.id),
      entryDistance: reachable.has(n.id) ? 0 : null,
    },
  }));
  const irEdges: EdgeIR[] = edges.map(([from, to], i) => ({
    id: makeId("edge", String(i), from, to),
    kind: "CALLS",
    from,
    to,
    evidence: [AST],
  }));

  const capability: CapabilityIR = {
    id: makeId("cap", "AUTH.LOGIN"),
    feature: "AUTH",
    capability: "AUTH.LOGIN",
    constraints: [],
    nodes: nodes.map((n) => n.id),
    closure: ClosureState.Partial,
    evidence: [AST],
  };

  const ir: RepositoryIR = {
    version: RIR_VERSION,
    nodes,
    edges: irEdges,
    artifacts: [],
    files: [],
    capabilities: [capability],
  };

  const result = evaluateClosure(capability, new Map(nodes.map((n) => [n.id, n])));
  const reachableChain = nodes.filter((n) => n.execution.reachable).map((n) => `${n.kind}:${n.name}`);

  return { directory: dir, fileCount: files.length, ir, result, reachableChain };
}

function makeNode(id: string, kind: NodeKind, name: string, file: string): NodeIR {
  return {
    id,
    kind,
    name,
    language: "typescript",
    artifactId: makeId("art", file),
    span: null,
    hash: "0",
    filePath: file,
    execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
    evidence: [AST],
  };
}
