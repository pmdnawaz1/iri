import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JavaAdapter } from "@rir/code-compiler";
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

const fixtureDir = join(import.meta.dirname, "../../fixtures/java");

const controllerSource = readFileSync(
  join(fixtureDir, "AuthController.java"),
  "utf-8",
);
const serviceSource = readFileSync(
  join(fixtureDir, "AuthService.java"),
  "utf-8",
);
const repositorySource = readFileSync(
  join(fixtureDir, "UserRepository.java"),
  "utf-8",
);

describe("TSPEC-FX06: Java fixture", () => {
  it("symbols include public class AuthController (exported=true) and method login", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("AuthController.java", controllerSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthController" && s.kind === "class" && s.exported,
      ),
    ).toBe(true);
    expect(
      result.symbols.some((s) => s.name === "login" && s.kind === "method"),
    ).toBe(true);
  });

  it("imports include the package import(s)", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("AuthController.java", controllerSource, ctx);
    expect(result.imports.length).toBeGreaterThan(0);
    expect(
      result.imports.some((i) =>
        i.specifier.includes("com.example.auth.AuthService"),
      ),
    ).toBe(true);
  });

  it("calls include the service invocation (authService.login)", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("AuthController.java", controllerSource, ctx);
    expect(
      result.calls.some((c) => c.callee.includes("authService.login")),
    ).toBe(true);
  });

  it("AuthService extracted from its file", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("AuthService.java", serviceSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthService" && s.kind === "class",
      ),
    ).toBe(true);
  });

  it("determinism: two parses of AuthController.java are deep-equal", () => {
    const adapter = new JavaAdapter();
    const r1 = adapter.parse("AuthController.java", controllerSource, ctx);
    const r2 = adapter.parse("AuthController.java", controllerSource, ctx);
    expect(r1).toEqual(r2);
  });

  it("UserRepository extracted from its file", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse(
      "UserRepository.java",
      repositorySource,
      ctx,
    );
    expect(
      result.symbols.some(
        (s) => s.name === "UserRepository" && s.kind === "class",
      ),
    ).toBe(true);
  });
});
