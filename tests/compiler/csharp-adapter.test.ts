import { describe, it, expect } from "vitest";
import { CSharpAdapter } from "@rir/code-compiler";
import type { LanguageAdapter } from "@rir/code-compiler";
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
const fixture = `using System;public class AuthService{    private UserRepository repo;    public void Login(string email)    {        repo.FindByEmail(email);    }}`;
describe("CSharpAdapter", () => {
  it("is assignable to LanguageAdapter", () => {
    const adapter: LanguageAdapter = new CSharpAdapter();
    expect(adapter).toBeDefined();
  });
  it("supports .cs, not .ts", () => {
    const adapter = new CSharpAdapter();
    expect(adapter.supports("a.cs")).toBe(true);
    expect(adapter.supports("a.ts")).toBe(false);
  });
  it("yields public class AuthService + method Login", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse("test.cs", fixture, ctx);
    expect(result.symbols.some((s) => s.name === "AuthService" && s.kind === "class")).toBe(true);
    expect(result.symbols.some((s) => s.name === "Login" && s.kind === "method")).toBe(true);
  });
  it("imports include System", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse("test.cs", fixture, ctx);
    expect(result.imports.some((i) => i.specifier === "System")).toBe(true);
  });
  it("calls include repo.FindByEmail", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse("test.cs", fixture, ctx);
    expect(result.calls.some((c) => c.callee.includes("repo.FindByEmail"))).toBe(true);
  });
  it("determinism: two parses deep-equal", () => {
    const adapter = new CSharpAdapter();
    const r1 = adapter.parse("test.cs", fixture, ctx);
    const r2 = adapter.parse("test.cs", fixture, ctx);
    expect(r1).toEqual(r2);
  });
  it("empty source yields empty arrays + valid artifact", () => {
    const adapter = new CSharpAdapter();
    const result = adapter.parse("empty.cs", "", ctx);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.artifact).toBeDefined();
    expect(result.artifact.hash).toBeTruthy();
  });
});
