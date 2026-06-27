import { describe, it, expect, beforeEach } from "vitest";
import { CapabilityPass } from "../../packages/passes/src/CapabilityPass.js";
import { DefaultIRDraft } from "@rir/builder-engine";
import type { CompilationContext } from "@rir/core";
import { ClosureState } from "@rir/ir";

describe("CapabilityPass", () => {
  let draft: DefaultIRDraft;
  let ctx: CompilationContext;
  let pass: CapabilityPass;

  beforeEach(() => {
    draft = new DefaultIRDraft({} as any);
    ctx = {} as CompilationContext;
    pass = new CapabilityPass();
  });

  it("yields AUTH.LOGIN capability for POST /login and reachable nodes", () => {
    draft.addNode({ id: "route:1", kind: "ROUTE", name: "POST /login", evidence: [] });
    draft.addNode({ id: "controller:1", kind: "CONTROLLER", name: "AuthController", evidence: [] });
    draft.addNode({ id: "service:1", kind: "SERVICE", name: "AuthService", evidence: [] });

    draft.addEdge({ id: "e1", kind: "ROUTES_TO", from: "route:1", to: "controller:1", evidence: [] });
    draft.addEdge({ id: "e2", kind: "CALLS", from: "controller:1", to: "service:1", evidence: [] });

    pass.run(ctx, draft);

    const caps = draft.getCapabilities();
    expect(caps).toHaveLength(1);
    expect(caps[0].capability).toBe("AUTH.LOGIN");
    expect(caps[0].nodes).toContain("route:1");
    expect(caps[0].nodes).toContain("controller:1");
    expect(caps[0].nodes).toContain("service:1");
    expect(caps[0].nodes).toHaveLength(3);
    expect(caps[0].closure).toBe(ClosureState.Partial);
  });

  it("yields no capability for an unresolvable route", () => {
    draft.addNode({ id: "route:1", kind: "ROUTE", name: "GET /healthz", evidence: [] });

    pass.run(ctx, draft);

    const caps = draft.getCapabilities();
    expect(caps).toHaveLength(0);
  });

  it("resolves nested paths like POST /auth/login to login", () => {
    draft.addNode({ id: "route:1", kind: "ROUTE", name: "POST /auth/login", evidence: [] });

    pass.run(ctx, draft);

    const caps = draft.getCapabilities();
    expect(caps).toHaveLength(1);
    expect(caps[0].capability).toBe("AUTH.LOGIN");
    expect(caps[0].nodes).toEqual(["route:1"]);
  });

  it("yields a capability containing just the route if no outgoing edges exist", () => {
    draft.addNode({ id: "route:1", kind: "ROUTE", name: "POST /login", evidence: [] });

    pass.run(ctx, draft);

    const caps = draft.getCapabilities();
    expect(caps).toHaveLength(1);
    expect(caps[0].capability).toBe("AUTH.LOGIN");
    expect(caps[0].nodes).toEqual(["route:1"]);
  });

  it("is deterministic and idempotent", () => {
    draft.addNode({ id: "route:1", kind: "ROUTE", name: "POST /login", evidence: [] });
    draft.addNode({ id: "controller:1", kind: "CONTROLLER", name: "AuthController", evidence: [] });
    draft.addEdge({ id: "e1", kind: "ROUTES_TO", from: "route:1", to: "controller:1", evidence: [] });

    pass.run(ctx, draft);
    const ir1 = draft.seal();

    const draft2 = new DefaultIRDraft({} as any);
    draft2.addNode({ id: "route:1", kind: "ROUTE", name: "POST /login", evidence: [] });
    draft2.addNode({ id: "controller:1", kind: "CONTROLLER", name: "AuthController", evidence: [] });
    draft2.addEdge({ id: "e1", kind: "ROUTES_TO", from: "route:1", to: "controller:1", evidence: [] });

    pass.run(ctx, draft2);
    pass.run(ctx, draft2); // idempotent
    const ir2 = draft2.seal();

    expect(ir1).toEqual(ir2);
  });
});
