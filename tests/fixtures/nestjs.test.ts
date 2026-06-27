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

const fixtureDir = join(import.meta.dirname, "../../fixtures/nestjs");

const controllerSource = readFileSync(
  join(fixtureDir, "auth.controller.ts"),
  "utf-8",
);
const serviceSource = readFileSync(
  join(fixtureDir, "auth.service.ts"),
  "utf-8",
);

describe("TSPEC-FX02: NestJS fixture", () => {
  it("TypeScriptAdapter extracts class AuthController from auth.controller.ts", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("auth.controller.ts", controllerSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthController" && s.kind === "class",
      ),
    ).toBe(true);
  });

  it("extracts the login method from auth.controller.ts", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("auth.controller.ts", controllerSource, ctx);
    expect(
      result.symbols.some((s) => s.name === "login" && s.kind === "method"),
    ).toBe(true);
  });

  it("calls from the controller include this.authService.login", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("auth.controller.ts", controllerSource, ctx);
    expect(
      result.calls.some((c) => c.callee.includes("this.authService.login")),
    ).toBe(true);
  });

  it("AuthService is extracted from auth.service.ts and its call to the repository appears", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("auth.service.ts", serviceSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthService" && s.kind === "class",
      ),
    ).toBe(true);
    expect(
      result.calls.some((c) =>
        c.callee.includes("this.userRepository.findByEmail"),
      ),
    ).toBe(true);
  });

  it("determinism: two parses of auth.controller.ts are deep-equal", () => {
    const adapter = new TypeScriptAdapter();
    const r1 = adapter.parse("auth.controller.ts", controllerSource, ctx);
    const r2 = adapter.parse("auth.controller.ts", controllerSource, ctx);
    expect(r1).toEqual(r2);
  });
});
