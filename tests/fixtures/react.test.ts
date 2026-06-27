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

const fixtureDir = join(import.meta.dirname, "../../fixtures/react");

const loginFormSource = readFileSync(join(fixtureDir, "LoginForm.tsx"), "utf-8");
const apiSource = readFileSync(join(fixtureDir, "api.ts"), "utf-8");

describe("TSPEC-FX03: React fixture", () => {
  it("symbols from LoginForm.tsx include a function/variable named LoginForm", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("LoginForm.tsx", loginFormSource, ctx);
    expect(
      result.symbols.some((s) => s.name === "LoginForm" && (s.kind === "function" || s.kind === "variable")),
    ).toBe(true);
  });

  it("imports include the ./api specifier with login imported", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("LoginForm.tsx", loginFormSource, ctx);
    expect(result.imports.some((i) => i.specifier === "./api" && i.imported.includes("login"))).toBe(true);
  });

  it("calls include the login call or fetch", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("LoginForm.tsx", loginFormSource, ctx);
    expect(result.calls.some((c) => c.callee.includes("login") || c.callee.includes("fetch"))).toBe(true);
  });

  it("api.ts login function is extracted", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("api.ts", apiSource, ctx);
    expect(result.symbols.some((s) => s.name === "login" && s.kind === "function")).toBe(true);
  });

  it("determinism: two parses of LoginForm.tsx are deep-equal", () => {
    const adapter = new TypeScriptAdapter();
    const r1 = adapter.parse("LoginForm.tsx", loginFormSource, ctx);
    const r2 = adapter.parse("LoginForm.tsx", loginFormSource, ctx);
    expect(r1).toEqual(r2);
  });
});
