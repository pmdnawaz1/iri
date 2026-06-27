import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, ParseResult } from "@rir/core";
import { ImportPass } from "../../packages/passes/src/ImportPass.js";

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
    hash: "abc123",
  };
}

function makeParseResult(path: string, imports: Array<{ specifier: string }>): ParseResult {
  return {
    artifact: makeArtifact(path),
    symbols: [],
    imports: imports.map((imp) => ({
      specifier: imp.specifier,
      imported: [],
      span: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10 },
    })),
    exports: [],
    calls: [],
    routes: [],
  };
}

describe("ImportPass", () => {
  it("one artifact → one MODULE node for the file", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [makeParseResult("src/app.ts", [])],
    };
    new ImportPass().run(ctx2, draft);
    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "MODULE" && n.name === "src/app.ts")).toBe(true);
  });

  it('an import "./app" → a MODULE node for ./app and an IMPORTS edge', () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [makeParseResult("src/routes.ts", [{ specifier: "./app" }])],
    };
    new ImportPass().run(ctx2, draft);
    const nodes = draft.getNodes();
    const edges = draft.getEdges();
    expect(nodes.some((n) => n.kind === "MODULE" && n.name === "./app")).toBe(true);
    expect(edges.some((e) => e.kind === "IMPORTS" && e.to.includes("./app"))).toBe(true);
  });

  it("multiple imports → one edge each", () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makeParseResult("src/routes.ts", [
          { specifier: "./app" },
          { specifier: "./utils" },
          { specifier: "./config" },
        ]),
      ],
    };
    new ImportPass().run(ctx2, draft);
    const edges = draft.getEdges().filter((e) => e.kind === "IMPORTS");
    expect(edges.length).toBe(3);
  });

  it("determinism: two runs yield equal sealed IR", () => {
    const pr = makeParseResult("src/app.ts", [{ specifier: "./util" }]);
    const ctx2: CompilationContext = { ...ctx, parseResults: [pr] };

    const draft1 = new DefaultIRDraft();
    new ImportPass().run(ctx2, draft1);
    const ir1 = draft1.seal();

    const draft2 = new DefaultIRDraft();
    new ImportPass().run(ctx2, draft2);
    const ir2 = draft2.seal();

    expect(ir1).toEqual(ir2);
  });
});
