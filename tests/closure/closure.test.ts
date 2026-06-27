import { describe, expect, it } from "vitest";
import { ClosureState, NodeKind, type CapabilityIR, type NodeIR } from "@rir/ir";
import { evaluateClosure } from "@rir/closure";

function node(id: string, kind: NodeKind, reachable = true): NodeIR {
  return {
    id,
    kind,
    name: id,
    language: "typescript",
    artifactId: "art",
    span: null,
    hash: "0",
    execution: { reachable, entryDistance: reachable ? 0 : null, runtimeObserved: false, tested: false },
    evidence: [{ source: "AST", locator: "f", confidence: 1 }],
  };
}

function loginCap(nodes: readonly string[], closure: ClosureState = ClosureState.Partial): CapabilityIR {
  return {
    id: "cap|1",
    feature: "AUTH",
    capability: "AUTH.LOGIN",
    constraints: [],
    nodes: [...nodes],
    closure,
    evidence: [{ source: "AST", locator: "f", confidence: 1 }],
  };
}

describe("evaluateClosure", () => {
  it("is ORPHAN when no nodes participate", () => {
    const result = evaluateClosure(loginCap([]), new Map());
    expect(result.state).toBe(ClosureState.Orphan);
  });

  it("is UNREACHABLE when nodes exist but none are reachable", () => {
    const n = node("r", NodeKind.Route, false);
    const result = evaluateClosure(loginCap([n.id]), new Map([[n.id, n]]));
    expect(result.state).toBe(ClosureState.Unreachable);
  });

  it("is BROKEN when a present stage follows a missing earlier stage", () => {
    const route = node("r", NodeKind.Route);
    const controller = node("c", NodeKind.Controller);
    const map = new Map([
      [route.id, route],
      [controller.id, controller],
    ]);
    const result = evaluateClosure(loginCap([route.id, controller.id]), map);
    expect(result.state).toBe(ClosureState.Broken);
  });

  it("preserves a CONFLICTING state without recomputing", () => {
    const result = evaluateClosure(loginCap([], ClosureState.Conflicting), new Map());
    expect(result.state).toBe(ClosureState.Conflicting);
  });
});
