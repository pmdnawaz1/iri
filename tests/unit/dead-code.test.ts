import { describe, expect, it } from "vitest";
import { DeadCodeEngine, type DeadCodeFinding } from "@rir/consistency";
import {
  ClosureState,
  RIR_VERSION,
  type CapabilityIR,
  type EdgeIR,
  type NodeIR,
  type RepositoryIR,
} from "@rir/ir";

function node(
  id: string,
  kind: string,
  name: string,
  opts?: { isExported?: boolean; reachable?: boolean; filePath?: string },
): NodeIR {
  return {
    id,
    kind: kind as NodeIR["kind"],
    name,
    language: null,
    artifactId: "art|x",
    span: null,
    hash: "0",
    filePath: opts?.filePath ?? "x.ts",
    isExported: opts?.isExported,
    execution: {
      reachable: opts?.reachable ?? true,
      entryDistance: opts?.reachable === false ? null : 0,
      runtimeObserved: false,
      tested: false,
    },
    evidence: [{ source: "AST", locator: "x", confidence: 1 }],
  };
}

function edge(id: string, kind: string, from: string, to: string): EdgeIR {
  return { id, kind: kind as EdgeIR["kind"], from, to, evidence: [] };
}

function ir(nodes: NodeIR[], edges: EdgeIR[] = [], caps: CapabilityIR[] = []): RepositoryIR {
  return {
    version: RIR_VERSION,
    schemaVersion: RIR_VERSION,
    nodes,
    edges,
    artifacts: [],
    files: [],
    capabilities: caps,
  };
}

const code = (id: string, name: string, opts?: { exported?: boolean; reachable?: boolean; file?: string }) =>
  node(id, "FUNCTION", name, { isExported: opts?.exported, reachable: opts?.reachable, filePath: opts?.file });

describe("DeadCodeEngine — DEAD_EXPORT", () => {
  it("flags an exported function with zero incoming edges", () => {
    const graph = ir(
      [code("f1", "helper", { exported: true })],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.some((f) => f.code === "DEAD_EXPORT" && f.nodeId === "f1")).toBe(true);
  });

  it("does not flag an exported function with an incoming CALLS edge", () => {
    const graph = ir(
      [code("f1", "helper", { exported: true }), code("f2", "caller")],
      [edge("e1", "CALLS", "f2", "f1")],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.code === "DEAD_EXPORT")).toHaveLength(0);
  });

  it("does not flag an exported function with an incoming IMPORTS edge", () => {
    const graph = ir(
      [code("f1", "helper", { exported: true }), code("f2", "importer")],
      [edge("e1", "IMPORTS", "f2", "f1")],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.code === "DEAD_EXPORT")).toHaveLength(0);
  });

  it("does not flag non-exported functions", () => {
    const graph = ir(
      [code("f1", "internal")],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.code === "DEAD_EXPORT")).toHaveLength(0);
  });
});

describe("DeadCodeEngine — UNREACHABLE", () => {
  it("flags a node that has reachable=false", () => {
    const graph = ir(
      [code("f1", "deadFunc", { reachable: false })],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.some((f) => f.code === "UNREACHABLE" && f.nodeId === "f1")).toBe(true);
  });

  it("does not flag reachable nodes", () => {
    const graph = ir(
      [code("f1", "liveFunc", { reachable: true })],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.code === "UNREACHABLE")).toHaveLength(0);
  });

  it("does not flag entrypoint kind nodes even if unreachable", () => {
    const graph = ir(
      [node("r1", "ROUTE", "GET /health", { reachable: false })],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.nodeId === "r1")).toHaveLength(0);
  });

  it("does not flag TEST nodes", () => {
    const graph = ir(
      [node("t1", "TEST", "test foo", { reachable: false })],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.nodeId === "t1")).toHaveLength(0);
  });
});

describe("DeadCodeEngine — DEAD_FILE", () => {
  it("flags a file where all non-entrypoint nodes are dead", () => {
    const graph = ir(
      [code("f1", "deadHelper", { exported: true, file: "dead.ts" })],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.some((f) => f.code === "DEAD_FILE" && f.filePath === "dead.ts")).toBe(true);
  });

  it("does not flag a file with at least one live exported node", () => {
    const graph = ir(
      [code("f1", "liveHelper", { exported: true, file: "live.ts" }), code("f2", "caller", { file: "live.ts" })],
      [edge("e1", "CALLS", "f2", "f1")],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.code === "DEAD_FILE")).toHaveLength(0);
  });

  it("does not flag a file with a ROUTE entrypoint", () => {
    const graph = ir(
      [node("r1", "ROUTE", "GET /health", { filePath: "routes.ts" })],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings.filter((f) => f.code === "DEAD_FILE")).toHaveLength(0);
  });
});

describe("DeadCodeEngine — integration", () => {
  it("produces no findings for a healthy single-file module", () => {
    const graph = ir(
      [code("f1", "main", { exported: true, reachable: true }), code("f2", "helper", { reachable: true })],
      [edge("e1", "CALLS", "f2", "f1"), edge("e2", "CALLS", "f1", "f2")],
    );
    const findings = new DeadCodeEngine().check(graph);
    expect(findings).toHaveLength(0);
  });
});
