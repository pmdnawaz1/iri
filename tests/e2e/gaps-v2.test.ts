import { describe, expect, it } from "vitest";
import { AdapterRegistry, TypeScriptAdapter } from "@rir/code-compiler";
import { compileRepository, diffClosures } from "@rir/compiler";
import { CrossConsistencyEngine, GuardClosureEngine } from "@rir/consistency";
import { getCriticality, requiresAuth } from "@rir/ontology";
import {
  ClosureState,
  RIR_VERSION,
  REQUIREMENT_IR_VERSION,
  type CapabilityIR,
  type NodeIR,
  type RepositoryIR,
  type RequirementIR,
  type RequirementSet,
} from "@rir/ir";

const tsOnly = () => new AdapterRegistry().register(new TypeScriptAdapter());

function node(id: string, kind: string, name: string): NodeIR {
  return {
    id,
    kind: kind as NodeIR["kind"],
    name,
    language: null,
    artifactId: "art|x",
    span: null,
    hash: "0",
    filePath: "x",
    execution: { reachable: true, entryDistance: 0, runtimeObserved: false, tested: false },
    evidence: [{ source: "AST", locator: "x", confidence: 1 }],
  };
}
function cap(id: string, capability: string, nodes: string[]): CapabilityIR {
  return {
    id,
    feature: capability.split(".")[0]!,
    capability,
    constraints: [],
    nodes,
    closure: ClosureState.Closed,
    evidence: [],
  };
}
function ir(nodes: NodeIR[], caps: CapabilityIR[]): RepositoryIR {
  return { version: RIR_VERSION, nodes, edges: [], artifacts: [], files: [], capabilities: caps };
}
function req(capability: string, priority: RequirementIR["priority"] = "MUST"): RequirementIR {
  return {
    id: `req|${capability}`,
    feature: capability.split(".")[0]!,
    capability,
    constraints: [],
    outputs: [],
    priority,
    evidence: [],
  };
}
const reqSet = (rs: RequirementIR[]): RequirementSet => ({
  version: REQUIREMENT_IR_VERSION,
  requirements: rs,
});

describe("GAPS-v2 V8 — criticality + V5 requiresAuth (ontology metadata)", () => {
  it("weights critical features and exempts the public auth surface", () => {
    expect(getCriticality("PAYMENT.REFUND")).toBe("CRITICAL");
    expect(getCriticality("AUTH.LOGIN")).toBe("CRITICAL");
    expect(getCriticality("PROFILE.UPDATE")).toBe("NORMAL");

    expect(requiresAuth("AUTH.LOGIN")).toBe(false); // public entry point
    expect(requiresAuth("PROFILE.UPDATE")).toBe(true);
    expect(requiresAuth("PAYMENT.REFUND")).toBe(true);
  });
});

describe("GAPS-v2 V3 — graded closure confidence", () => {
  it("attaches a weakest-link confidence in (0,1] to a real CLOSED capability", async () => {
    const { closure } = await compileRepository("fixtures/express-auth", tsOnly());
    const login = closure.find((c) => c.state === ClosureState.Closed);
    expect(login).toBeDefined();
    expect(login!.confidence).toBeGreaterThan(0);
    expect(login!.confidence).toBeLessThanOrEqual(1);
  });
});

describe("GAPS-v2 V5 — guard / negative-space closure", () => {
  it("flags an auth-requiring capability whose path has no guard", () => {
    const graph = ir(
      [node("n1", "ROUTE", "GET /profile"), node("n2", "CONTROLLER", "ProfileController")],
      [cap("cap|1", "PROFILE.VIEW", ["n1", "n2"])],
    );
    const findings = new GuardClosureEngine().check(graph);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("GUARD_MISSING");
    expect(findings[0]!.capability).toBe("PROFILE.VIEW");
  });

  it("does not flag when a guard node is on the path, nor public capabilities", () => {
    const guarded = ir(
      [node("n1", "ROUTE", "GET /profile"), node("n3", "CONTROLLER", "requireAuth middleware")],
      [cap("cap|1", "PROFILE.VIEW", ["n1", "n3"])],
    );
    expect(new GuardClosureEngine().check(guarded)).toHaveLength(0);

    const publicCap = ir([node("n1", "ROUTE", "POST /login")], [cap("cap|2", "AUTH.LOGIN", ["n1"])]);
    expect(new GuardClosureEngine().check(publicCap)).toHaveLength(0);
  });

  it("detects the missing guard end-to-end from a real fixture", async () => {
    const { ir: graph } = await compileRepository("fixtures/guard-missing", tsOnly());
    const findings = new GuardClosureEngine().check(graph);
    expect(findings.some((f) => f.capability === "PROFILE.VIEW" && f.code === "GUARD_MISSING")).toBe(true);
  });
});

describe("GAPS-v2 V10 — scope manifest filters findings", () => {
  const graph = ir([], []); // nothing implemented
  const reqs = reqSet([req("AUTH.LOGIN"), req("PAYMENT.REFUND")]);
  const closureMap = new Map();

  it("reports every documented capability when no scope is declared", () => {
    const findings = new CrossConsistencyEngine().check(reqs, graph, closureMap);
    expect(findings.map((f) => f.capability).sort()).toEqual(["AUTH.LOGIN", "PAYMENT.REFUND"]);
  });

  it("suppresses out-of-scope findings when a scope is declared", () => {
    const findings = new CrossConsistencyEngine().check(reqs, graph, closureMap, { features: ["AUTH"] });
    const caps = findings.map((f) => f.capability);
    expect(caps).toContain("AUTH.LOGIN");
    expect(caps).not.toContain("PAYMENT.REFUND");
  });
});

describe("GAPS-v2 V11 — closure drift / diffClosures", () => {
  const at = (capabilityId: string, state: ClosureState) => ({
    capabilityId,
    state,
    expected: [],
    present: [],
    missing: [],
    confidence: 1,
  });

  it("detects a capability moving away from CLOSED as a regression", () => {
    const { transitions, regressions } = diffClosures(
      [at("c1", ClosureState.Closed), at("c2", ClosureState.Closed)],
      [at("c1", ClosureState.Broken), at("c2", ClosureState.Closed)],
    );
    expect(transitions).toHaveLength(1);
    expect(regressions).toHaveLength(1);
    expect(regressions[0]!.capabilityId).toBe("c1");
    expect(regressions[0]!.direction).toBe("REGRESSED");
  });

  it("classifies a move toward CLOSED as an improvement, not a regression", () => {
    const { regressions, transitions } = diffClosures(
      [at("c1", ClosureState.Broken)],
      [at("c1", ClosureState.Closed)],
    );
    expect(regressions).toHaveLength(0);
    expect(transitions[0]!.direction).toBe("IMPROVED");
  });
});
