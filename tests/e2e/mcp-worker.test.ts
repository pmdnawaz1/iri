import { describe, it, expect } from "vitest";
import {
  getCapability,
  getFeature,
  resolveAlias,
  allCapabilities,
  getCriticality,
} from "@rir/ontology";
import { DefaultClosureEngine, stageOfNodeKind } from "@rir/closure";
import { ClosureState, NodeKind } from "@rir/ir";
import type { RepositoryIR } from "@rir/ir";

describe("MCP tool capabilities (G4)", () => {
  it("has MCP feature with 5 tool capabilities", () => {
    const feature = getFeature("MCP");
    expect(feature).toBeDefined();
    expect(feature!.capabilities.length).toBe(5);
  });

  it("resolves MCP.TOOL capability", () => {
    const cap = getCapability("MCP.TOOL");
    expect(cap).toBeDefined();
    expect(cap!.name).toBe("TOOL");
    expect(cap!.aliases).toContain("mcp_tool");
    expect(cap!.expectedChain[0]).toBe("ENTRYPOINT");
  });

  it("resolves aliases for MCP tools", () => {
    expect(resolveAlias("mcp_tool")?.id).toBe("MCP.TOOL");
    expect(resolveAlias("list_tools")?.id).toBe("MCP.LIST_TOOLS");
    expect(resolveAlias("call_tool")?.id).toBe("MCP.CALL_TOOL");
    expect(resolveAlias("mcp_resource")?.id).toBe("MCP.RESOURCE");
    expect(resolveAlias("mcp_prompt")?.id).toBe("MCP.PROMPT");
  });

  it("MCP.TOOL has HANDLER and DATABASE in chain (no ROUTE)", () => {
    const cap = getCapability("MCP.TOOL")!;
    expect(cap.expectedChain).toContain("HANDLER");
    expect(cap.expectedChain).toContain("DATABASE");
    expect(cap.expectedChain).not.toContain("BACKEND_ROUTE");
  });

  it("MCP.TOOL criticality is HIGH", () => {
    expect(getCriticality("MCP.TOOL")).toBe("HIGH");
  });

  it("ENTRYPOINT node kind maps to ENTRYPOINT stage in closure", () => {
    expect(stageOfNodeKind(NodeKind.Entrypoint)).toBe("ENTRYPOINT");
  });

  it("MCP.TOOL can close with just ENTRYPOINT + HANDLER + DATABASE (optional SERVICE/REPOSITORY)", () => {
    const engine = new DefaultClosureEngine();
    const ir: RepositoryIR = {
      version: "1.1.0",
      nodes: [
        {
          id: "entry|tool",
          kind: "ENTRYPOINT",
          name: "MCP Tool",
          language: "go",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 0, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
        {
          id: "handler|tool",
          kind: "HANDLER",
          name: "handleTool",
          language: "go",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 1, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
        {
          id: "sql|tool",
          kind: "SQL_QUERY",
          name: "SELECT * FROM tools",
          language: "go",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 2, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
        {
          id: "response|tool",
          kind: "RESPONSE",
          name: "response",
          language: "go",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 3, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
      ],
      edges: [],
      artifacts: [],
      files: [],
      capabilities: [
        {
          id: "cap1",
          feature: "MCP",
          capability: "MCP.TOOL",
          constraints: [],
          nodes: ["entry|tool", "handler|tool", "sql|tool", "response|tool"],
          closure: "PARTIAL",
          evidence: [],
        },
      ],
    };
    const results = engine.evaluate(ir);
    expect(results.length).toBe(1);
    expect(results[0]!.state).toBe(ClosureState.Closed);
  });
});

describe("WORKER capabilities (W1)", () => {
  it("has WORKER feature with 4 capabilities", () => {
    const feature = getFeature("WORKER");
    expect(feature).toBeDefined();
    expect(feature!.capabilities.length).toBe(4);
  });

  it("resolves WORKER.JOB capability", () => {
    const cap = getCapability("WORKER.JOB");
    expect(cap).toBeDefined();
    expect(cap!.name).toBe("JOB");
    expect(cap!.expectedChain[0]).toBe("WORKER");
  });

  it("resolves aliases for workers", () => {
    expect(resolveAlias("worker_job")?.id).toBe("WORKER.JOB");
    expect(resolveAlias("enqueue")?.id).toBe("WORKER.ENQUEUE");
    expect(resolveAlias("cron_job")?.id).toBe("WORKER.SCHEDULE");
    expect(resolveAlias("consume_queue")?.id).toBe("WORKER.CONSUME");
  });

  it("WORKER node kind maps to WORKER stage in closure", () => {
    expect(stageOfNodeKind(NodeKind.Worker)).toBe("WORKER");
  });

  it("WORKER.JOB criticality is HIGH", () => {
    expect(getCriticality("WORKER.JOB")).toBe("HIGH");
  });

  it("WORKER.JOB can close with WORKER + HANDLER + DATABASE (optional SERVICE/REPOSITORY)", () => {
    const engine = new DefaultClosureEngine();
    const ir: RepositoryIR = {
      version: "1.1.0",
      nodes: [
        {
          id: "worker|job",
          kind: "WORKER",
          name: "processJob",
          language: "python",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 0, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
        {
          id: "handler|job",
          kind: "HANDLER",
          name: "handleJob",
          language: "python",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 1, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
        {
          id: "sql|job",
          kind: "SQL_QUERY",
          name: "INSERT INTO jobs",
          language: "python",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 2, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
        {
          id: "response|job",
          kind: "RESPONSE",
          name: "response",
          language: "python",
          artifactId: "art1",
          span: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
          execution: { reachable: true, entryDistance: 3, runtimeObserved: false, tested: false },
          evidence: [{ source: "test", confidence: 1 }],
        },
      ],
      edges: [],
      artifacts: [],
      files: [],
      capabilities: [
        {
          id: "cap1",
          feature: "WORKER",
          capability: "WORKER.JOB",
          constraints: [],
          nodes: ["worker|job", "handler|job", "sql|job", "response|job"],
          closure: "PARTIAL",
          evidence: [],
        },
      ],
    };
    const results = engine.evaluate(ir);
    expect(results.length).toBe(1);
    expect(results[0]!.state).toBe(ClosureState.Closed);
  });
});

describe("Next.js page detection (G3)", () => {
  it("allCapabilities includes MCP and WORKER features", () => {
    const caps = allCapabilities().map((c) => c.id);
    expect(caps).toContain("MCP.TOOL");
    expect(caps).toContain("WORKER.JOB");
    expect(caps).toContain("AUTH.LOGIN");
  });
});
