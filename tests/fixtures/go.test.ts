import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GoAdapter } from "@rir/code-compiler";
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

const fixtureDir = join(import.meta.dirname, "../../fixtures/go");

const repositorySource = readFileSync(
  join(fixtureDir, "repository.go"),
  "utf-8",
);
const serviceSource = readFileSync(join(fixtureDir, "service.go"), "utf-8");

describe("TSPEC-FX07: Go fixture", () => {
  it("symbols include struct UserRepository (kind class) and a method (kind method)", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("repository.go", repositorySource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "UserRepository" && s.kind === "class",
      ),
    ).toBe(true);
    expect(result.symbols.some((s) => s.kind === "method")).toBe(true);
  });

  it("imports include at least one import specifier (e.g. fmt)", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("repository.go", repositorySource, ctx);
    expect(result.imports.length).toBeGreaterThan(0);
    expect(result.imports.some((i) => i.specifier === "fmt")).toBe(true);
  });

  it("calls include a call_expression callee", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("repository.go", repositorySource, ctx);
    expect(result.calls.length).toBeGreaterThan(0);
  });

  it("AuthService extracted from its file", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("service.go", serviceSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthService" && s.kind === "class",
      ),
    ).toBe(true);
  });

  it("determinism: two parses of repository.go are deep-equal", () => {
    const adapter = new GoAdapter();
    const r1 = adapter.parse("repository.go", repositorySource, ctx);
    const r2 = adapter.parse("repository.go", repositorySource, ctx);
    expect(r1).toEqual(r2);
  });
});
