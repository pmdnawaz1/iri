import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TypeScriptAdapter } from "@rir/code-compiler";
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

const fixtureDir = join(
  import.meta.dirname,
  "../../fixtures/broken-repository",
);

const routesSource = readFileSync(join(fixtureDir, "routes.ts"), "utf-8");
const authServiceSource = readFileSync(
  join(fixtureDir, "auth.service.ts"),
  "utf-8",
);

describe("TSPEC-FX09: broken-repository fixture", () => {
  it("routes from routes.ts include POST /login", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("routes.ts", routesSource, ctx);
    expect(
      result.routes.some(
        (r) => r.method === "POST" && r.path === "/login",
      ),
    ).toBe(true);
  });

  it("the handler's calls do NOT include any AuthService method (chain is broken)", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("routes.ts", routesSource, ctx);
    // The broken route never calls authService.login or any AuthService method
    expect(
      result.calls.some((c) =>
        c.callee.toLowerCase().includes("authservice"),
      ),
    ).toBe(false);
  });

  it("AuthService is still extracted as a symbol from auth.service.ts", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("auth.service.ts", authServiceSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthService" && s.kind === "class",
      ),
    ).toBe(true);
  });

  it("determinism: two parses of routes.ts are deep-equal", () => {
    const adapter = new TypeScriptAdapter();
    const r1 = adapter.parse("routes.ts", routesSource, ctx);
    const r2 = adapter.parse("routes.ts", routesSource, ctx);
    expect(r1).toEqual(r2);
  });
});
