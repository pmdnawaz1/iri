import { describe, it, expect } from "vitest";
import { PythonAdapter } from "@rir/code-compiler";
import type { LanguageAdapter } from "@rir/code-compiler";
import type { CompilationContext } from "@rir/core";

const ctx: CompilationContext = { repositoryRoot: ".", artifacts: [], logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } } };

const fixture = `import os
from app.db import UserRepository

class AuthService:
    def login(self, email):
        return self.repo.find(email)`;

describe("PythonAdapter", () => {
  it("is assignable to LanguageAdapter", () => {
    const adapter: LanguageAdapter = new PythonAdapter();
    expect(adapter).toBeDefined();
  });

  it("supports .py", () => {
    const adapter = new PythonAdapter();
    expect(adapter.supports("a.py")).toBe(true);
    expect(adapter.supports("a.ts")).toBe(false);
  });

  it("yields class AuthService + method login", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse("test.py", fixture, ctx);
    expect(result.symbols.some(s => s.name === "AuthService" && s.kind === "class")).toBe(true);
    expect(result.symbols.some(s => s.name === "login" && s.kind === "method")).toBe(true);
  });

  it("imports include os and app.db", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse("test.py", fixture, ctx);
    expect(result.imports.some(i => i.specifier === "os")).toBe(true);
    expect(result.imports.some(i => i.specifier === "app.db")).toBe(true);
  });

  it("calls include self.repo.find", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse("test.py", fixture, ctx);
    expect(result.calls.some(c => c.callee.includes("self.repo.find"))).toBe(true);
  });

  it("determinism: two parses deep-equal", () => {
    const adapter = new PythonAdapter();
    const r1 = adapter.parse("test.py", fixture, ctx);
    const r2 = adapter.parse("test.py", fixture, ctx);
    expect(r1).toEqual(r2);
  });

  it("empty source yields empty arrays + valid artifact", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse("empty.py", "", ctx);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.artifact).toBeDefined();
    expect(result.artifact.hash).toBeTruthy();
  });
});
