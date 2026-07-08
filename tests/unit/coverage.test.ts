import { describe, it, expect } from "vitest";
import { DefaultCoverageEngine } from "@rir/coverage";
import { ClosureState, RIR_VERSION, emptyRequirementSet, type CapabilityIR, type RepositoryIR } from "@rir/ir";
import { allCapabilities } from "@rir/ontology";

function makeCapability(
  id: string,
  capability: string,
  state: ClosureState = ClosureState.Closed,
  tested = false,
): CapabilityIR {
  return {
    id,
    feature: capability.split(".")[0]!,
    capability,
    constraints: [],
    nodes: tested ? ["test_node"] : [],
    closure: state,
    evidence: [],
  };
}

function makeIR(capabilities: CapabilityIR[]): RepositoryIR {
  return {
    version: RIR_VERSION,
    nodes: [],
    edges: [],
    artifacts: [],
    files: [],
    capabilities,
  };
}

describe("DefaultCoverageEngine", () => {
  const engine = new DefaultCoverageEngine();

  it("returns ratio 1 for all dimensions when IR and requirements are empty", () => {
    const ir = makeIR([]);
    const report = engine.compute(ir, emptyRequirementSet());
    expect(report.requirement.ratio).toBe(1);
    expect(report.implementation.ratio).toBe(1);
    expect(report.documentation.ratio).toBe(1);
    expect(report.test.ratio).toBe(1);
    expect(report.capability.ratio).toBe(0); // 0 implemented / N ontology
  });

  it("implementation coverage = closed / total capabilities", () => {
    const ir = makeIR([
      makeCapability("c1", "AUTH.LOGIN", ClosureState.Closed),
      makeCapability("c2", "AUTH.REGISTER", ClosureState.Partial),
      makeCapability("c3", "AUTH.LOGOUT", ClosureState.Closed),
    ]);
    const report = engine.compute(ir, emptyRequirementSet());
    expect(report.implementation.covered).toBe(2);
    expect(report.implementation.total).toBe(3);
  });

  it("capability coverage = implemented / ontology total", () => {
    const ir = makeIR([makeCapability("c1", "AUTH.LOGIN", ClosureState.Closed)]);
    const report = engine.compute(ir, emptyRequirementSet());
    expect(report.capability.covered).toBe(1);
    expect(report.capability.total).toBe(allCapabilities().length);
  });

  it("requirement coverage = required caps that have implementations", () => {
    const ir = makeIR([
      makeCapability("c1", "AUTH.LOGIN", ClosureState.Closed),
      makeCapability("c2", "AUTH.REGISTER", ClosureState.Closed),
    ]);
    const reqs = {
      version: "1.0.0" as const,
      requirements: [
        { id: "r1", feature: "AUTH", capability: "AUTH.LOGIN", constraints: [], outputs: [], priority: "P0" as const, evidence: [] },
        { id: "r2", feature: "AUTH", capability: "AUTH.LOGOUT", constraints: [], outputs: [], priority: "P1" as const, evidence: [] },
      ],
    };
    const report = engine.compute(ir, reqs);
    expect(report.requirement.covered).toBe(1); // AUTH.LOGIN is implemented, AUTH.LOGOUT is not
    expect(report.requirement.total).toBe(2);
  });

  it("documentation coverage = implemented caps that are also required", () => {
    const ir = makeIR([
      makeCapability("c1", "AUTH.LOGIN", ClosureState.Closed),
      makeCapability("c2", "AUTH.REGISTER", ClosureState.Closed), // not required
    ]);
    const reqs = {
      version: "1.0.0" as const,
      requirements: [
        { id: "r1", feature: "AUTH", capability: "AUTH.LOGIN", constraints: [], outputs: [], priority: "P0" as const, evidence: [] },
      ],
    };
    const report = engine.compute(ir, reqs);
    expect(report.documentation.covered).toBe(1);
    expect(report.documentation.total).toBe(2);
  });

  it("test coverage = capabilities with tested nodes", () => {
    const ir: RepositoryIR = {
      version: RIR_VERSION,
      nodes: [
        { id: "test_node", kind: "TEST", name: "test", language: "typescript", artifactId: "a", span: null, hash: "0", filePath: "f", execution: { reachable: true, entryDistance: 0, runtimeObserved: false, tested: true }, evidence: [] },
      ],
      edges: [],
      artifacts: [],
      files: [],
      capabilities: [
        makeCapability("c1", "AUTH.LOGIN", ClosureState.Closed, true),
        makeCapability("c2", "AUTH.REGISTER", ClosureState.Closed, false),
      ],
    };
    const report = engine.compute(ir, emptyRequirementSet());
    expect(report.test.covered).toBe(1);
    expect(report.test.total).toBe(2);
  });
});
