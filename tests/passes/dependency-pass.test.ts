import { describe, it, expect, beforeEach } from "vitest";
import { DependencyPass } from "../../packages/passes/src/DependencyPass.js";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext } from "@rir/core";

// We can mock CompilationContext since DependencyPass doesn't use it,
// or just cast an empty object if that's all it takes, but RoutePass mock might be better.
// Actually, let's just cast it.

describe("DependencyPass", () => {
  let draft: DefaultIRDraft;
  let ctx: CompilationContext;
  let pass: DependencyPass;

  beforeEach(() => {
    // In TSPEC-P02 / RoutePass tests, we used:
    // draft = new DefaultIRDraft({} as any);
    draft = new DefaultIRDraft({} as any);
    ctx = {} as CompilationContext;
    pass = new DependencyPass();
  });

  it("adds DEPENDS_ON edges for IMPORTS between MODULE nodes", () => {
    draft.addNode({
      id: "node:module:modA",
      kind: "MODULE",
      name: "modA",
      evidence: [{ source: "AST", locator: "A", confidence: 1 }],
    });
    draft.addNode({
      id: "node:module:modB",
      kind: "MODULE",
      name: "modB",
      evidence: [{ source: "AST", locator: "B", confidence: 1 }],
    });
    draft.addEdge({
      id: "edge:imports:modA:modB",
      kind: "IMPORTS",
      from: "node:module:modA",
      to: "node:module:modB",
      evidence: [{ source: "AST", locator: "I", confidence: 1 }],
    });

    pass.run(ctx, draft);
    const edges = draft.getEdges();

    const dependsOn = edges.filter((e) => e.kind === "DEPENDS_ON");
    expect(dependsOn).toHaveLength(1);
    expect(dependsOn[0].from).toBe("node:module:modA");
    expect(dependsOn[0].to).toBe("node:module:modB");
  });

  it("creates one DEPENDS_ON per IMPORTS edge", () => {
    draft.addNode({
      id: "node:module:modA",
      kind: "MODULE",
      name: "modA",
      evidence: [],
    });
    draft.addNode({
      id: "node:module:modB",
      kind: "MODULE",
      name: "modB",
      evidence: [],
    });
    draft.addNode({
      id: "node:module:modC",
      kind: "MODULE",
      name: "modC",
      evidence: [],
    });

    draft.addEdge({
      id: "edge:imports:modA:modB",
      kind: "IMPORTS",
      from: "node:module:modA",
      to: "node:module:modB",
      evidence: [],
    });
    draft.addEdge({
      id: "edge:imports:modA:modC",
      kind: "IMPORTS",
      from: "node:module:modA",
      to: "node:module:modC",
      evidence: [],
    });

    pass.run(ctx, draft);
    const edges = draft.getEdges();
    expect(edges.filter((e) => e.kind === "DEPENDS_ON")).toHaveLength(2);
  });

  it("ignores non-IMPORTS edges", () => {
    draft.addNode({
      id: "node:module:modA",
      kind: "MODULE",
      name: "modA",
      evidence: [],
    });
    draft.addNode({
      id: "node:module:modB",
      kind: "MODULE",
      name: "modB",
      evidence: [],
    });
    draft.addEdge({
      id: "edge:calls:modA:modB",
      kind: "CALLS",
      from: "node:module:modA",
      to: "node:module:modB",
      evidence: [],
    });

    pass.run(ctx, draft);
    expect(draft.getEdges().filter((e) => e.kind === "DEPENDS_ON")).toHaveLength(0);
  });

  it("ignores IMPORTS edges if one end is not a MODULE", () => {
    draft.addNode({
      id: "node:module:modA",
      kind: "MODULE",
      name: "modA",
      evidence: [],
    });
    draft.addNode({
      id: "node:class:classB",
      kind: "CLASS",
      name: "classB",
      evidence: [],
    });
    draft.addEdge({
      id: "edge:imports:modA:classB",
      kind: "IMPORTS",
      from: "node:module:modA",
      to: "node:class:classB",
      evidence: [],
    });

    pass.run(ctx, draft);
    expect(draft.getEdges().filter((e) => e.kind === "DEPENDS_ON")).toHaveLength(0);
  });

  it("is idempotent and deterministic", () => {
    draft.addNode({
      id: "node:module:modA",
      kind: "MODULE",
      name: "modA",
      evidence: [],
    });
    draft.addNode({
      id: "node:module:modB",
      kind: "MODULE",
      name: "modB",
      evidence: [],
    });
    draft.addEdge({
      id: "edge:imports:modA:modB",
      kind: "IMPORTS",
      from: "node:module:modA",
      to: "node:module:modB",
      evidence: [],
    });

    pass.run(ctx, draft);
    const ir1 = draft.seal();

    const draft2 = new DefaultIRDraft({} as any);
    draft2.addNode({
      id: "node:module:modA",
      kind: "MODULE",
      name: "modA",
      evidence: [],
    });
    draft2.addNode({
      id: "node:module:modB",
      kind: "MODULE",
      name: "modB",
      evidence: [],
    });
    draft2.addEdge({
      id: "edge:imports:modA:modB",
      kind: "IMPORTS",
      from: "node:module:modA",
      to: "node:module:modB",
      evidence: [],
    });

    pass.run(ctx, draft2);
    // run again to test idempotency
    pass.run(ctx, draft2);

    const ir2 = draft2.seal();

    expect(ir1).toEqual(ir2);
  });
});
