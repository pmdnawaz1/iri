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

  it("reports AUTH.LOGIN as BROKEN (backend wired, frontend + persistence missing)", async () => {
    const { ir, closure } = await compileRepository("fixtures/express-auth", tsOnly());
    const login = ir.capabilities.find((c) => c.capability === "AUTH.LOGIN")!;
    const result = closure.find((r) => r.capabilityId === login.id)!;

    expect(result.state).toBe("BROKEN");
    expect(result.missing).toContain("FRONTEND_ROUTE");
    expect(result.missing).toContain("DATABASE");
  });

  it("produces a deterministic IR (same nodes/edges across runs)", async () => {
    const a = await compileRepository("fixtures/express-auth", tsOnly());
    const b = await compileRepository("fixtures/express-auth", tsOnly());
    expect(a.ir.nodes.length).toBe(b.ir.nodes.length);
    expect(a.ir.edges.length).toBe(b.ir.edges.length);
  });
});
