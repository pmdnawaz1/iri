import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CSharpAdapter } from "@rir/code-compiler";
import type { CompilationContext } from "@rir/core";

const ctx: CompilationContext = {
  repositoryRoot: ".",
  artifacts: [],
  logger: {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return this;
    },
  },
};

const fixtureDir = join(import.meta.dirname, "../../fixtures/csharp");

const controllerSource = readFileSync(
  join(fixtureDir, "AuthController.cs"),
  "utf-8",
);
const serviceSource = readFileSync(
  join(fixtureDir, "AuthService.cs"),
  "utf-8",
);

describe("TSPEC-FX12: C# fixture", () => {
  it("symbols include public class AuthController (exported=true) and method Login", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse(
      "AuthController.cs",
      controllerSource,
      ctx,
    );
    expect(
      result.symbols.some(
        (s) =>
          s.name === "AuthController" &&
          s.kind === "class" &&
          s.exported,
      ),
    ).toBe(true);
    expect(
      result.symbols.some((s) => s.name === "Login" && s.kind === "method"),
    ).toBe(true);
  });

  it("imports include a using specifier (System)", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse(
      "AuthController.cs",
      controllerSource,
      ctx,
    );
    expect(result.imports.length).toBeGreaterThan(0);
    expect(
      result.imports.some((i) => i.specifier === "System"),
    ).toBe(true);
  });

  it("calls include the service invocation (_authService.Login)", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse(
      "AuthController.cs",
      controllerSource,
      ctx,
    );
    expect(
      result.calls.some((c) =>
        c.callee.includes("_authService.Login"),
      ),
    ).toBe(true);
  });

  it("AuthService extracted from its file", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse("AuthService.cs", serviceSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthService" && s.kind === "class",
      ),
    ).toBe(true);
  });

  it("determinism: two parses of AuthController.cs are deep-equal", () => {
    const adapter = new CSharpAdapter();
    const r1 = adapter.parse(
      "AuthController.cs",
      controllerSource,
      ctx,
    );
    const r2 = adapter.parse(
      "AuthController.cs",
      controllerSource,
      ctx,
    );
    expect(r1).toEqual(r2);
  });
});
