import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, ParseResult, SymbolFact } from "@rir/core";
import { ComponentPass } from "../../packages/passes/src/ComponentPass.js";

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

function makePrWithSymbols(path: string, symbols: SymbolFact[]): ParseResult {
  return {
    artifact: makeArtifact(path),
    symbols,
    imports: [],
    exports: [],
    calls: [],
    routes: [],
  };
}

describe("ComponentPass", () => {
  it("a function LoginForm() symbol in a .tsx artifact → a COMPONENT node named LoginForm", async () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithSymbols("ui/login.tsx", [{ name: "LoginForm", kind: "function", exported: true, span }]),
      ],
    };
    await new ComponentPass().run(ctx2, draft);
    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "COMPONENT" && n.name === "LoginForm")).toBe(true);
  });

  it("a lowercase function helper() in a .tsx artifact → no component node", async () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithSymbols("ui/login.tsx", [{ name: "helper", kind: "function", exported: false, span }]),
      ],
    };
    await new ComponentPass().run(ctx2, draft);
    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "COMPONENT")).toBe(false);
  });

  it("a PascalCase symbol in a .ts (non-tsx) artifact → no component node", async () => {
    const draft = new DefaultIRDraft();
    const ctx2: CompilationContext = {
      ...ctx,
      parseResults: [
        makePrWithSymbols("services/AuthService.ts", [
          { name: "AuthService", kind: "class", exported: true, span },
        ]),
      ],
    };
    await new ComponentPass().run(ctx2, draft);
    const nodes = draft.getNodes();
    expect(nodes.some((n) => n.kind === "COMPONENT")).toBe(false);
  });

  it("determinism: two runs yield equal sealed IR", async () => {
    const pr = makePrWithSymbols("ui/app.tsx", [{ name: "App", kind: "function", exported: true, span }]);
    const ctx2: CompilationContext = { ...ctx, parseResults: [pr] };

    const d1 = new DefaultIRDraft();
    await new ComponentPass().run(ctx2, d1);
    const ir1 = d1.seal();

    const d2 = new DefaultIRDraft();
    await new ComponentPass().run(ctx2, d2);
    const ir2 = d2.seal();

    expect(ir1).toEqual(ir2);
  });
});
