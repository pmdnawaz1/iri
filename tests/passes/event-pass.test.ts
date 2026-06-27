import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, ParseResult, CallFact } from "@rir/core";
import type { NodeIR } from "@rir/ir";
import { makeId } from "@rir/common";
import { EventPass } from "../../packages/passes/src/EventPass.js";

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

function makePrWithCalls(path: string, calls: CallFact[]): ParseResult {
  return {
    artifact: makeArtifact(path),
    symbols: [],
    imports: [],
    exports: [],
    calls,
    routes: [],
  };
}

function seedDeclNode(draft: DefaultIRDraft, name: string): void {
  const node: NodeIR = {
    id: makeId("decl", name),
    kind: "CONTROLLER",
    name,
    language: "typescript",
    artifactId: "artifact|app.ts",
    span,
    hash: "0",
    execution: "DEFAULT",
    evidence: [{ source: "AST", locator: "app.ts", confidence: 1 }],
  };
  draft.addNode(node);
}

describe("EventPass", () => {
  it("bus.emit(...) (enclosing a known decl) → an EVENT node + EMITS edge", async () => {
    const draft = new DefaultIRDraft();
    seedDeclNode(draft, "UserService");

    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithCalls("services/UserService.ts", [
          { callee: "bus.emit", enclosing: "UserService", span },
        ]),
      ],
    };
    await new EventPass().run(ctx2, draft);

    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "EVENT" && n.name === "emit")).toBe(true);
    
    const edges = draft.getEdges();
    expect(edges.some((e) => e.kind === "EMITS")).toBe(true);
  });

  it("bus.on(...) → an EVENT_CONSUMER node + CONSUMES edge", async () => {
    const draft = new DefaultIRDraft();
    seedDeclNode(draft, "UserService");

    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithCalls("services/UserService.ts", [
          { callee: "bus.on", enclosing: "UserService", span },
        ]),
      ],
    };
    await new EventPass().run(ctx2, draft);

    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "EVENT_CONSUMER" && n.name === "on")).toBe(true);
    
    const edges = draft.getEdges();
    expect(edges.some((e) => e.kind === "CONSUMES")).toBe(true);
  });

  it("a plain call → no event node", async () => {
    const draft = new DefaultIRDraft();
    seedDeclNode(draft, "UserService");

    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithCalls("services/UserService.ts", [
          { callee: "foo.bar", enclosing: "UserService", span },
        ]),
      ],
    };
    await new EventPass().run(ctx2, draft);

    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "EVENT" || n.kind === "EVENT_CONSUMER")).toBe(false);
  });

  it("determinism: two runs yield equal sealed IR", async () => {
    const pr = makePrWithCalls("services/UserService.ts", [
      { callee: "bus.emit", enclosing: "UserService", span },
      { callee: "bus.on", enclosing: "UserService", span },
    ]);
    const ctx2: CompilationContext = { ...ctx, parseResults: [pr] };

    const d1 = new DefaultIRDraft();
    seedDeclNode(d1, "UserService");
    await new EventPass().run(ctx2, d1);
    const ir1 = d1.seal();

    const d2 = new DefaultIRDraft();
    seedDeclNode(d2, "UserService");
    await new EventPass().run(ctx2, d2);
    const ir2 = d2.seal();

    expect(ir1).toEqual(ir2);
  });
});
