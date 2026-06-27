import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JavaScriptAdapter } from "@rir/code-compiler";
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

const fixtureDir = join(import.meta.dirname, "../../fixtures/vue");

const useAuthSource = readFileSync(join(fixtureDir, "useAuth.js"), "utf-8");
const apiSource = readFileSync(join(fixtureDir, "api.js"), "utf-8");

describe("TSPEC-FX05: Vue fixture", () => {
  it("symbols from useAuth.js include the useAuth function", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("useAuth.js", useAuthSource, ctx);
    expect(
      result.symbols.some((s) => s.name === "useAuth" && (s.kind === "function" || s.kind === "variable")),
    ).toBe(true);
  });

  it("imports from useAuth.js include the ./api specifier with login imported", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("useAuth.js", useAuthSource, ctx);
    expect(
      result.imports.some(
        (i) => (i.specifier === "./api" || i.specifier === "./api.js") && i.imported.includes("login"),
      ),
    ).toBe(true);
  });

  it("calls from useAuth.js include the login call or fetch", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("useAuth.js", useAuthSource, ctx);
    expect(result.calls.some((c) => c.callee.includes("login") || c.callee.includes("fetch"))).toBe(true);
  });

  it("api.js login function is extracted", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("api.js", apiSource, ctx);
    expect(
      result.symbols.some((s) => s.name === "login" && (s.kind === "function" || s.kind === "variable")),
    ).toBe(true);
  });

  it("determinism: two parses of useAuth.js are deep-equal", () => {
    const adapter = new JavaScriptAdapter();
    const r1 = adapter.parse("useAuth.js", useAuthSource, ctx);
    const r2 = adapter.parse("useAuth.js", useAuthSource, ctx);
    expect(r1).toEqual(r2);
  });
});
