import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RustAdapter } from "@rir/code-compiler";
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

const fixtureDir = join(import.meta.dirname, "../../fixtures/rust");

const repositorySource = readFileSync(join(fixtureDir, "repository.rs"), "utf-8");
const serviceSource = readFileSync(join(fixtureDir, "service.rs"), "utf-8");

describe("TSPEC-FX11: Rust fixture", () => {
  it("symbols include pub struct UserRepository (kind class) and an impl method (kind method)", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("repository.rs", repositorySource, ctx);
    expect(result.symbols.some((s) => s.name === "UserRepository" && s.kind === "class")).toBe(true);
    expect(result.symbols.some((s) => s.kind === "method")).toBe(true);
  });

  it("imports include a use specifier (std::collections::HashMap)", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("repository.rs", repositorySource, ctx);
    expect(result.imports.length).toBeGreaterThan(0);
    expect(result.imports.some((i) => i.specifier.includes("std::collections::HashMap"))).toBe(true);
  });

  it("calls include a call_expression callee", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("repository.rs", repositorySource, ctx);
    expect(result.calls.length).toBeGreaterThan(0);
  });

  it("AuthService extracted from its file", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("service.rs", serviceSource, ctx);
    expect(result.symbols.some((s) => s.name === "AuthService" && s.kind === "class")).toBe(true);
  });

  it("determinism: two parses of repository.rs are deep-equal", () => {
    const adapter = new RustAdapter();
    const r1 = adapter.parse("repository.rs", repositorySource, ctx);
    const r2 = adapter.parse("repository.rs", repositorySource, ctx);
    expect(r1).toEqual(r2);
  });
});
