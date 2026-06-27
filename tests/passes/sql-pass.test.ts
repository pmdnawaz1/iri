import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, ParseResult, CallFact } from "@rir/core";
import type { NodeIR } from "@rir/ir";
import { makeId } from "@rir/common";
import { SQLPass } from "../../packages/passes/src/SQLPass.js";

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

describe("SQLPass", () => {
  it("a call this.db.query(...) (enclosing a known decl) yields a SQL_QUERY node and a READS edge", async () => {
    const draft = new DefaultIRDraft();
    seedDeclNode(draft, "UserService");

    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithCalls("services/UserService.ts", [
          { callee: "this.db.query", enclosing: "UserService", span },
        ]),
      ],
    };
    await new SQLPass().run(ctx2, draft);

    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "SQL_QUERY" && n.name === "query")).toBe(true);

    const edges = draft.getEdges();
    expect(edges.some((e) => e.kind === "READS")).toBe(true);
  });

  it("this.db.insert(...) yields a WRITES edge", async () => {
    const draft = new DefaultIRDraft();
    seedDeclNode(draft, "UserService");

    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithCalls("services/UserService.ts", [
          { callee: "this.db.insert", enclosing: "UserService", span },
        ]),
      ],
    };
    await new SQLPass().run(ctx2, draft);

    const edges = draft.getEdges();
    expect(edges.some((e) => e.kind === "WRITES")).toBe(true);
  });

  it("a non-DB call (e.g. foo.bar()) yields no SQL node", async () => {
    const draft = new DefaultIRDraft();
    seedDeclNode(draft, "UserService");

    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithCalls("services/UserService.ts", [{ callee: "foo.bar", enclosing: "UserService", span }]),
      ],
    };
    await new SQLPass().run(ctx2, draft);

    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "SQL_QUERY")).toBe(false);
  });

  it("determinism: two runs yield equal sealed IR", async () => {
    const pr = makePrWithCalls("services/UserService.ts", [
      { callee: "this.db.query", enclosing: "UserService", span },
    ]);
    const ctx2: CompilationContext = { ...ctx, parseResults: [pr] };

    const d1 = new DefaultIRDraft();
    seedDeclNode(d1, "UserService");
    await new SQLPass().run(ctx2, d1);
    const ir1 = d1.seal();

    const d2 = new DefaultIRDraft();
    seedDeclNode(d2, "UserService");
    await new SQLPass().run(ctx2, d2);
    const ir2 = d2.seal();

    expect(ir1).toEqual(ir2);
  });
});
