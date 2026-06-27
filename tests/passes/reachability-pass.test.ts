import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext } from "@rir/core";
import type { NodeIR } from "@rir/ir";
import { makeId } from "@rir/common";
import { ReachabilityPass } from "../../packages/passes/src/ReachabilityPass.js";

const ctx: CompilationContext = {
  repositoryRoot: ".",
  artifacts: [],
  logger: {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return this;
    },
  },
};

const span = { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 };
const baseExecution = {
  reachable: false,
  entryDistance: null,
  runtimeObserved: false,
  tested: false,
};

function makeNode(id: string, kind: NodeIR["kind"]): NodeIR {
  return {
    id,
    kind,
    name: id,
    language: "typescript",
    artifactId: "artifact|app.ts",
    span,
    hash: "0",
    execution: { ...baseExecution },
    evidence: [{ source: "AST", locator: "app.ts", confidence: 1 }],
  };
}

function seedGraph(draft: DefaultIRDraft): void {
  // ROUTE → CONTROLLER → SERVICE  +  disconnected CLASS
  const routeId = makeId("route", "POST /login");
  const controllerId = makeId("decl", "AuthController");
  const serviceId = makeId("decl", "AuthService");
  const disconnectedId = makeId("decl", "HelperClass");

  draft.addNode(makeNode(routeId, "ROUTE"));
  draft.addNode(makeNode(controllerId, "CONTROLLER"));
  draft.addNode(makeNode(serviceId, "SERVICE"));
  draft.addNode(makeNode(disconnectedId, "CLASS"));

  draft.addEdge({
    id: makeId("edge", "rt", routeId, controllerId),
    kind: "ROUTES_TO",
    from: routeId,
    to: controllerId,
    evidence: [{ source: "AST", locator: "routes.ts", confidence: 1 }],
  });
  draft.addEdge({
    id: makeId("edge", "calls", controllerId, serviceId),
    kind: "CALLS",
    from: controllerId,
    to: serviceId,
    evidence: [{ source: "AST", locator: "app.ts", confidence: 1 }],
  });
}

describe("ReachabilityPass", () => {
  it("the ROUTE node is reachable with entryDistance 0", () => {
    const draft = new DefaultIRDraft();
    seedGraph(draft);
    new ReachabilityPass().run(ctx, draft);

    const routeId = makeId("route", "POST /login");
    const routeNode = draft.getNode(routeId)!;
    expect(routeNode.execution.reachable).toBe(true);
    expect(routeNode.execution.entryDistance).toBe(0);
  });

  it("CONTROLLER has distance 1, SERVICE distance 2; both reachable", () => {
    const draft = new DefaultIRDraft();
    seedGraph(draft);
    new ReachabilityPass().run(ctx, draft);

    const controllerId = makeId("decl", "AuthController");
    const serviceId = makeId("decl", "AuthService");

    const controller = draft.getNode(controllerId)!;
    const service = draft.getNode(serviceId)!;

    expect(controller.execution.reachable).toBe(true);
    expect(controller.execution.entryDistance).toBe(1);

    expect(service.execution.reachable).toBe(true);
    expect(service.execution.entryDistance).toBe(2);
  });

  it("the disconnected node is reachable: false, entryDistance: null", () => {
    const draft = new DefaultIRDraft();
    seedGraph(draft);
    new ReachabilityPass().run(ctx, draft);

    const disconnectedId = makeId("decl", "HelperClass");
    const node = draft.getNode(disconnectedId)!;
    expect(node.execution.reachable).toBe(false);
    expect(node.execution.entryDistance).toBeNull();
  });

  it("other execution fields (runtimeObserved/tested) are preserved", () => {
    const draft = new DefaultIRDraft();
    const routeId = makeId("route", "POST /login");
    draft.addNode({
      ...makeNode(routeId, "ROUTE"),
      execution: { reachable: false, entryDistance: null, runtimeObserved: true, tested: true },
    });
    new ReachabilityPass().run(ctx, draft);

    const node = draft.getNode(routeId)!;
    expect(node.execution.runtimeObserved).toBe(true);
    expect(node.execution.tested).toBe(true);
  });

  it("determinism: two runs yield equal sealed IR", () => {
    const d1 = new DefaultIRDraft();
    seedGraph(d1);
    new ReachabilityPass().run(ctx, d1);
    const ir1 = d1.seal();

    const d2 = new DefaultIRDraft();
    seedGraph(d2);
    new ReachabilityPass().run(ctx, d2);
    const ir2 = d2.seal();

    expect(ir1).toEqual(ir2);
  });
});
