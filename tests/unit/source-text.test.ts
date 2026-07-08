import { describe, it, expect } from "vitest";
import { compileRepository } from "@rir/compiler";
import { TypeScriptAdapter, AdapterRegistry } from "@rir/code-compiler";

describe("source text per node", () => {
  it("nodes carry sourceText extracted from file content", async () => {
    const reg = new AdapterRegistry().register(new TypeScriptAdapter());
    const { ir } = await compileRepository("fixtures/express-auth", reg);

    const loginMethod = ir.nodes.find(n => n.name === "login" && n.kind === "METHOD");
    expect(loginMethod).toBeDefined();
    expect(loginMethod!.sourceText).toBeDefined();
    expect(loginMethod!.sourceText!.length).toBeGreaterThan(0);
    expect(loginMethod!.sourceText).toContain("login");

    const authService = ir.nodes.find(n => n.name === "AuthService" && n.kind === "SERVICE");
    expect(authService).toBeDefined();
    expect(authService!.sourceText).toBeDefined();
    expect(authService!.sourceText!.length).toBeGreaterThan(0);
  });

  it("file paths are relative to repo root", async () => {
    const reg = new AdapterRegistry().register(new TypeScriptAdapter());
    const { ir } = await compileRepository("fixtures/express-auth", reg);

    for (const node of ir.nodes) {
      if (node.filePath) {
        expect(node.filePath).not.toContain("\\");
        expect(node.filePath).not.toMatch(/^[A-Z]:\\/);
      }
    }
  });
});
