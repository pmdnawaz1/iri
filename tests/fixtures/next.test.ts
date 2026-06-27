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

const fixtureDir = join(import.meta.dirname, "../../fixtures/next");

const loginPageSource = readFileSync(
  join(fixtureDir, "login-page.tsx"),
  "utf-8",
);
const apiLoginSource = readFileSync(
  join(fixtureDir, "api-login.ts"),
  "utf-8",
);

describe("TSPEC-FX04: Next.js fixture", () => {
  it("symbols from login-page.tsx include the page component", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("login-page.tsx", loginPageSource, ctx);
    expect(
      result.symbols.some(
        (s) =>
          s.name === "LoginPage" &&
          (s.kind === "function" || s.kind === "variable"),
      ),
    ).toBe(true);
  });

  it("exports from api-login.ts include the POST handler", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("api-login.ts", apiLoginSource, ctx);
    expect(result.exports.includes("POST") || result.symbols.some((s) => s.name === "POST" && s.exported)).toBe(true);
  });

  it("calls include the service/api call from login-page.tsx", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("login-page.tsx", loginPageSource, ctx);
    expect(
      result.calls.some((c) =>
        c.callee.includes("loginUser") || c.callee.includes("login"),
      ),
    ).toBe(true);
  });

  it("imports from login-page.tsx are extracted", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("login-page.tsx", loginPageSource, ctx);
    expect(
      result.imports.some((i) => i.specifier.includes("api-login")),
    ).toBe(true);
  });

  it("determinism: two parses of login-page.tsx are deep-equal", () => {
    const adapter = new TypeScriptAdapter();
    const r1 = adapter.parse("login-page.tsx", loginPageSource, ctx);
    const r2 = adapter.parse("login-page.tsx", loginPageSource, ctx);
    expect(r1).toEqual(r2);
  });
});
