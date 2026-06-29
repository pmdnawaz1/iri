import { describe, expect, it } from "vitest";
import {
  AdapterRegistry,
  TypeScriptAdapter,
  PythonAdapter,
  GoAdapter,
  JavaAdapter,
} from "@rir/code-compiler";
import { compileRepository } from "@rir/compiler";

// TSPEC-A021 / ADR-0022: the TS adapter must see NestJS decorator routes and file-based
// (route.ts) routes, not only imperative app.get()/router.post(). Before A021 both fixtures
// compiled to zero capabilities.
const tsOnly = () => new AdapterRegistry().register(new TypeScriptAdapter());

describe("Adapter route detection — NestJS decorators", () => {
  it("reads @Controller + @Post and resolves the capability", async () => {
    const { ir } = await compileRepository("fixtures/nest-auth", tsOnly());

    const route = ir.nodes.find((n) => n.kind === "ROUTE" && n.name.includes("/auth/login"));
    expect(route).toBeDefined();
    expect(route!.name).toContain("POST");

    expect(ir.capabilities.some((c) => c.capability === "AUTH.LOGIN")).toBe(true);
  });
});

describe("Adapter route detection — file-based route.ts", () => {
  it("derives the path from the directory and reads exported verbs", async () => {
    const { ir } = await compileRepository("fixtures/filebased-webhooks", tsOnly());

    const methods = ir.nodes
      .filter((n) => n.kind === "ROUTE" && n.name.includes("/webhooks"))
      .map((n) => n.name.split(" ")[0])
      .sort();
    expect(methods).toEqual(["GET", "POST"]);

    expect(ir.capabilities.some((c) => c.capability === "WEBHOOK.CREATE")).toBe(true);
  });
});

describe("Adapter route detection — parity across languages (A021)", () => {
  it("Python: FastAPI @router.post/get decorators", async () => {
    const reg = new AdapterRegistry().register(new PythonAdapter());
    const { ir } = await compileRepository("fixtures/fastapi-auth", reg);
    const caps = ir.capabilities.map((c) => c.capability);
    expect(caps).toContain("AUTH.LOGIN");
    expect(caps).toContain("TEAM.CREATE");
  });

  it("Go: router r.POST/r.GET calls", async () => {
    const reg = new AdapterRegistry().register(new GoAdapter());
    const { ir } = await compileRepository("fixtures/go-routes", reg);
    const caps = ir.capabilities.map((c) => c.capability);
    expect(caps).toContain("AUTH.LOGIN");
    expect(caps).toContain("WEBHOOK.CREATE");
  });

  it("Java: Spring @RequestMapping + @PostMapping/@GetMapping", async () => {
    const reg = new AdapterRegistry().register(new JavaAdapter());
    const { ir } = await compileRepository("fixtures/spring-routes", reg);
    const caps = ir.capabilities.map((c) => c.capability);
    expect(caps).toContain("TEAM.CREATE");
    expect(caps).toContain("TEAM.LIST_MEMBERS");
  });
});
