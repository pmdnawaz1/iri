import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext, NodeIR } from "@rir/core";
import { makeId } from "@rir/common";
import { GitPass } from "../../packages/passes/src/GitPass.js";
import * as fs from "fs";
import * as cp from "child_process";

vi.mock("fs");
vi.mock("child_process");

const ctx: CompilationContext = {
  repositoryRoot: "/mock/repo",
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

describe("GitPass", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("skips if .git directory is missing", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    
    const draft = new DefaultIRDraft();
    await new GitPass().run(ctx, draft);
    
    expect(cp.execSync).not.toHaveBeenCalled();
  });

  it("executes git log and enriches matching nodes with GIT_HISTORY evidence", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    const mockGitLog = `abcd123 initial commit
src/app.ts
src/utils.ts
`;
    vi.mocked(cp.execSync).mockReturnValue(mockGitLog as any);

    const draft = new DefaultIRDraft();
    
    // Seed a node that matches src/app.ts
    const appNode: NodeIR = {
      id: makeId("decl", "App"),
      kind: "CONTROLLER",
      name: "App",
      language: "typescript",
      artifactId: "artifact|src/app.ts",
      span: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      hash: "0",
      execution: "DEFAULT",
      evidence: [{ source: "AST", locator: "src/app.ts", confidence: 1 }],
    };
    draft.addNode(appNode);
    
    // Seed a node that does NOT match
    const otherNode: NodeIR = {
      id: makeId("decl", "Other"),
      kind: "CONTROLLER",
      name: "Other",
      language: "typescript",
      artifactId: "artifact|src/other.ts",
      span: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      hash: "0",
      execution: "DEFAULT",
      evidence: [{ source: "AST", locator: "src/other.ts", confidence: 1 }],
    };
    draft.addNode(otherNode);

    await new GitPass().run(ctx, draft);

    const nodes = draft.getNodes();
    
    const finalAppNode = nodes.find(n => n.name === "App")!;
    expect(finalAppNode.evidence.length).toBe(2);
    expect(finalAppNode.evidence[1].source).toBe("GIT_HISTORY");
    expect(finalAppNode.evidence[1].confidence).toBe(0.8);
    expect(finalAppNode.evidence[1].locator).toBe("src/app.ts");

    const finalOtherNode = nodes.find(n => n.name === "Other")!;
    expect(finalOtherNode.evidence.length).toBe(1);
  });
});
