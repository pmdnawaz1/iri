import { describe, expect, it } from "vitest";
import { AdapterRegistry, TypeScriptAdapter } from "@rir/code-compiler";
import { compileRepository } from "@rir/compiler";

// The real pipeline (adapters -> passes -> IR -> closure), end to end, on a real repo.
// This reproduces what the ad-hoc proving slice did, but through the wired compiler.
describe("Repository Compiler — express-auth", () => {
  const tsOnly = () => new AdapterRegistry().register(new TypeScriptAdapter());

  it("discovers the AUTH.LOGIN capability and wires its backend chain", async () => {
    const { ir, closure } = await compileRepository("fixtures/express-auth", tsOnly());

    // Capability discovery bound the route to the ontology.
    const login = ir.capabilities.find((c) => c.capability === "AUTH.LOGIN");
    expect(login).toBeDefined();

    // The pipeline built the backend chain: route -> controller -> service -> repository.
    const result = closure.find((r) => r.capabilityId === login!.id);
    expect(result).toBeDefined();
    expect(result!.present).toContain("BACKEND_ROUTE");
    expect(result!.present).toContain("CONTROLLER");
    expect(result!.present).toContain("SERVICE");
    expect(result!.present).toContain("REPOSITORY");
  });

  it("reports AUTH.LOGIN as CLOSED on the backend tier (route->controller->service->repo->db->response)", async () => {
    const { ir, closure } = await compileRepository("fixtures/express-auth", tsOnly());
    const login = ir.capabilities.find((c) => c.capability === "AUTH.LOGIN")!;
    const result = closure.find((r) => r.capabilityId === login.id)!;

    // Tier-aware closure (ADR-0019): a fully-wired backend closes on its tier.
    expect(result.state).toBe("CLOSED");
    expect(result.present).toContain("DATABASE");
    expect(result.present).toContain("RESPONSE");
    expect(result.missing).toHaveLength(0);
  });

  it("produces a deterministic IR (same nodes/edges across runs)", async () => {
    const a = await compileRepository("fixtures/express-auth", tsOnly());
    const b = await compileRepository("fixtures/express-auth", tsOnly());
    expect(a.ir.nodes.length).toBe(b.ir.nodes.length);
    expect(a.ir.edges.length).toBe(b.ir.edges.length);
  });
});

describe("Repository Compiler — full-stack (frontend + backend)", () => {
  const tsOnly = () => new AdapterRegistry().register(new TypeScriptAdapter());

  it("closes AUTH.LOGIN across all 12 stages (frontend DAG -> edge -> backend)", async () => {
    const { ir, closure } = await compileRepository("fixtures/fullstack-auth", tsOnly());
    const login = ir.capabilities.find((c) => c.capability === "AUTH.LOGIN")!;
    const result = closure.find((r) => r.capabilityId === login.id)!;

    expect(result.state).toBe("CLOSED");
    for (const stage of [
      "FRONTEND_ROUTE",
      "COMPONENT",
      "API_CALL",
      "BACKEND_ROUTE",
      "DATABASE",
      "RESPONSE",
      "RENDERED_UI",
    ]) {
      expect(result.present).toContain(stage);
    }
    expect(result.missing).toHaveLength(0);
  });
});
