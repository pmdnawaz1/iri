import { describe, expect, it } from "vitest";
import { AdapterRegistry, TypeScriptAdapter } from "@rir/code-compiler";
import { compileRepository } from "@rir/compiler";

describe("Microservices Fixture", () => {
  const tsOnly = () => new AdapterRegistry().register(new TypeScriptAdapter());

  it("compiling fixtures/microservices yields >= 2 capabilities", async () => {
    const { ir } = await compileRepository("fixtures/microservices", tsOnly());
    expect(ir.capabilities.length).toBeGreaterThanOrEqual(2);
  });

  it("AUTH.LOGIN is among the discovered capabilities (from auth-service)", async () => {
    const { ir } = await compileRepository("fixtures/microservices", tsOnly());
    const login = ir.capabilities.find((c) => c.capability === "AUTH.LOGIN");
    expect(login).toBeDefined();
  });

  it("AUTH.REGISTER is among them (from user-service)", async () => {
    const { ir } = await compileRepository("fixtures/microservices", tsOnly());
    const register = ir.capabilities.find((c) => c.capability === "AUTH.REGISTER");
    expect(register).toBeDefined();
  });

  it("each capability's closure result has its backend stages (CONTROLLER/SERVICE/REPOSITORY) present", async () => {
    const { ir, closure } = await compileRepository("fixtures/microservices", tsOnly());

    const login = ir.capabilities.find((c) => c.capability === "AUTH.LOGIN");
    expect(login).toBeDefined();
    const loginResult = closure.find((r) => r.capabilityId === login!.id);
    expect(loginResult).toBeDefined();
    expect(loginResult!.present).toContain("CONTROLLER");
    expect(loginResult!.present).toContain("SERVICE");
    expect(loginResult!.present).toContain("REPOSITORY");

    const register = ir.capabilities.find((c) => c.capability === "AUTH.REGISTER");
    expect(register).toBeDefined();
    const registerResult = closure.find((r) => r.capabilityId === register!.id);
    expect(registerResult).toBeDefined();
    expect(registerResult!.present).toContain("CONTROLLER");
    expect(registerResult!.present).toContain("SERVICE");
    expect(registerResult!.present).toContain("REPOSITORY");
  });

  it("determinism: two compiles produce the same node/edge counts", async () => {
    const a = await compileRepository("fixtures/microservices", tsOnly());
    const b = await compileRepository("fixtures/microservices", tsOnly());
    expect(a.ir.nodes.length).toBe(b.ir.nodes.length);
    expect(a.ir.edges.length).toBe(b.ir.edges.length);
  });
});
