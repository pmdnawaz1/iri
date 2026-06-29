import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, ParseResult } from "@rir/core";
import { makeId } from "@rir/common";
import { CallPass } from "../../packages/passes/src/CallPass.js";

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

function makeArtifact(path: string) {
  return {
    id: `artifact|${path}`,
    kind: "CODE" as const,
    path,
    language: "typescript",
    hash: "abc",
  };
}

function makePr(
  path: string,
  symbols: Array<{ name: string; kind: "class" | "function" | "method" | "variable" | "type" | "interface" }>,
  calls: Array<{ callee: string; enclosing?: string }> = [],
): ParseResult {
  const span = { startLine: 1, startColumn: 0, endLine: 10, endColumn: 0 };
  return {
    artifact: makeArtifact(path),
    symbols: symbols.map((s) => ({
      name: s.name,
      kind: s.kind,
      exported: true,
      span,
    })),
    imports: [],
    exports: [],
    calls: calls.map((c) => ({ callee: c.callee, enclosing: c.enclosing, span })),
    routes: [],
  };
}

describe("CallPass", () => {
  it("AuthController → CONTROLLER, AuthService → SERVICE, UserRepository → REPOSITORY", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePr("app.ts", [
          { name: "AuthController", kind: "class" },
          { name: "AuthService", kind: "class" },
          { name: "UserRepository", kind: "class" },
        ]),
      ],
    };
    new CallPass().run(ctx2, draft);
    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.name === "AuthController" && n.kind === "CONTROLLER")).toBe(true);
    expect(nodes.some((n) => n.name === "AuthService" && n.kind === "SERVICE")).toBe(true);
    expect(nodes.some((n) => n.name === "UserRepository" && n.kind === "REPOSITORY")).toBe(true);
  });

  it("a function symbol becomes a FUNCTION node", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [makePr("util.ts", [{ name: "doSomething", kind: "function" }])],
    };
    new CallPass().run(ctx2, draft);
    expect(draft.getNodes().some((n) => n.name === "doSomething" && n.kind === "FUNCTION")).toBe(true);
  });

  it("call with enclosing AuthController + callee this.authService.login yields ROUTES_TO edge to AuthService", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePr(
          "app.ts",
          [
            { name: "AuthController", kind: "class" },
            { name: "AuthService", kind: "class" },
          ],
          [{ callee: "this.authService.login", enclosing: "AuthController" }],
        ),
      ],
    };
    new CallPass().run(ctx2, draft);
    const edges = draft.getEdges();
    expect(
      edges.some(
        (e) =>
          e.kind === "ROUTES_TO" &&
          e.from === makeId("decl", "AuthController") &&
          e.to === makeId("decl", "AuthService"),
      ),
    ).toBe(true);
  });

  it("a call whose target class is absent yields no edge", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePr(
          "app.ts",
          [{ name: "AuthController", kind: "class" }],
          [{ callee: "this.missingService.doThing", enclosing: "AuthController" }],
        ),
      ],
    };
    new CallPass().run(ctx2, draft);
    expect(draft.getEdges().length).toBe(0);
  });

  it("a call with no enclosing yields no edge", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePr(
          "app.ts",
          [
            { name: "AuthController", kind: "class" },
            { name: "AuthService", kind: "class" },
          ],
          [{ callee: "this.authService.login" }], // no enclosing
        ),
      ],
    };
    new CallPass().run(ctx2, draft);
    expect(draft.getEdges().length).toBe(0);
  });

  it("determinism: running twice on the same input yields equal sealed IR", () => {
    const prs = [
      makePr(
        "app.ts",
        [
          { name: "AuthController", kind: "class" },
          { name: "AuthService", kind: "class" },
        ],
        [{ callee: "this.authService.login", enclosing: "AuthController" }],
      ),
    ];
    const ctx2: CompilationContext = { ...ctx, parseResults: prs };

    const d1 = new DefaultIRDraft();
    new CallPass().run(ctx2, d1);
    const ir1 = d1.seal();

    const d2 = new DefaultIRDraft();
    new CallPass().run(ctx2, d2);
    const ir2 = d2.seal();

    expect(ir1).toEqual(ir2);
  });
});
