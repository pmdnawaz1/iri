import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, ParseResult } from "@rir/core";
import type { NodeIR } from "@rir/ir";
import { makeId } from "@rir/common";
import { RoutePass } from "../../packages/passes/src/RoutePass.js";

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

function makeArtifact(path: string) {
  return {
    id: `artifact|${path}`,
    kind: "CODE" as const,
    path,
    language: "typescript",
    hash: "abc",
  };
}

function makePrWithRoute(
  path: string,
  route: { method: string; path: string; handler: string },
): ParseResult {
  return {
    artifact: makeArtifact(path),
    symbols: [],
    imports: [],
    exports: [],
    calls: [],
    routes: [{ method: route.method, path: route.path, handler: route.handler, span }],
  };
}

function seedControllerNode(draft: DefaultIRDraft, name: string): void {
  const node: NodeIR = {
    id: makeId("decl", name),
    kind: "CONTROLLER",
    name,
    language: "typescript",
    artifactId: "artifact|app.ts",
    span,
    hash: "0",
    execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
    evidence: [{ source: "AST", locator: "app.ts", confidence: 1 }],
  };
  draft.addNode(node);
}

describe("RoutePass", () => {
  it("a RouteFact { method: POST, path: /login } → a ROUTE node POST /login", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [makePrWithRoute("routes.ts", { method: "POST", path: "/login", handler: "" })],
    };
    new RoutePass().run(ctx2, draft);
    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "ROUTE" && n.name === "POST /login")).toBe(true);
  });

  it("with pre-seeded CONTROLLER node + handler text authController.login → ROUTES_TO edge", () => {
    const draft = new DefaultIRDraft();
    seedControllerNode(draft, "AuthController");

    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithRoute("routes.ts", {
          method: "POST",
          path: "/login",
          handler: "authController.login",
        }),
      ],
    };
    new RoutePass().run(ctx2, draft);

    const edges = draft.getEdges();
    expect(edges.some((e) => e.kind === "ROUTES_TO")).toBe(true);
    const routeId = makeId("route", "POST /login");
    const controllerId = makeId("decl", "AuthController");
    expect(edges.some((e) => e.from === routeId && e.to === controllerId)).toBe(true);
  });

  it("handler that resolves to no existing node → ROUTE node but no edge", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithRoute("routes.ts", {
          method: "GET",
          path: "/health",
          handler: "unknownController.check",
        }),
      ],
    };
    new RoutePass().run(ctx2, draft);
    const nodes = draft.getNodes();
    const edges = draft.getEdges();
    expect(nodes.some((n) => n.kind === "ROUTE")).toBe(true);
    expect(edges.length).toBe(0);
  });

  it("determinism: two runs yield equal sealed IR", () => {
    const pr = makePrWithRoute("routes.ts", {
      method: "POST",
      path: "/login",
      handler: "authController.login",
    });
    const ctx2: CompilationContext = { ...ctx, parseResults: [pr] };

    const d1 = new DefaultIRDraft();
    seedControllerNode(d1, "AuthController");
    new RoutePass().run(ctx2, d1);
    const ir1 = d1.seal();

    const d2 = new DefaultIRDraft();
    seedControllerNode(d2, "AuthController");
    new RoutePass().run(ctx2, d2);
    const ir2 = d2.seal();

    expect(ir1).toEqual(ir2);
  });
});
