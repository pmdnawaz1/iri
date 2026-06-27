import { describe, it, expect } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, NodeIR } from "@rir/core";
import type { ArtifactIR } from "@rir/ir";
import { makeId } from "@rir/common";
import { GitPass } from "../../packages/passes/src/GitPass";

const logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return this;
  },
};

const artifact: ArtifactIR = {
  id: makeId("art", "src/app.ts"),
  kind: "CODE",
  path: "src/app.ts",
  language: "typescript",
  hash: "0",
};

const ctx: CompilationContext = { repositoryRoot: ".", artifacts: [artifact], parseResults: [], logger };

function node(): NodeIR {
  return {
    id: makeId("decl", "App"),
    kind: "CONTROLLER",
    name: "App",
    language: "typescript",
    artifactId: artifact.id,
    span: null,
    hash: "0",
    execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
    evidence: [{ source: "AST", locator: "src/app.ts", confidence: 1 }],
  };
}

describe("GitPass", () => {
  it("attaches a GIT evidence entry from the injected runner", () => {
    const draft = new DefaultIRDraft();
    draft.addNode(node());
    new GitPass(() => "abc123").run(ctx, draft);
    const n = draft.getNodes().find((x) => x.name === "App")!;
    const git = n.evidence.find((e) => e.source === "GIT");
    expect(git).toBeDefined();
    expect(git!.locator).toBe("abc123");
  });

  it("leaves evidence unchanged when the runner returns null", () => {
    const draft = new DefaultIRDraft();
    draft.addNode(node());
    new GitPass(() => null).run(ctx, draft);
    const n = draft.getNodes().find((x) => x.name === "App")!;
    expect(n.evidence.length).toBe(1);
  });

  it("does not duplicate the GIT evidence on re-run", () => {
    const draft = new DefaultIRDraft();
    draft.addNode(node());
    const pass = new GitPass(() => "abc123");
    pass.run(ctx, draft);
    pass.run(ctx, draft);
    const n = draft.getNodes().find((x) => x.name === "App")!;
    expect(n.evidence.filter((e) => e.source === "GIT").length).toBe(1);
  });
});
