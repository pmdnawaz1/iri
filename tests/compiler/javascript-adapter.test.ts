import { describe, it, expect } from "vitest";
import { JavaScriptAdapter } from "@rir/code-compiler";
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

const fixture = `class AuthService { login(email) { return this.repo.find(email); } }
function someFunc() { return doSomething(); }
console.log("hello");
router.post("/login", (req, res) => res.json({}));`;

describe("JavaScriptAdapter", () => {
  it("is assignable to LanguageAdapter", () => {
    const adapter: LanguageAdapter = new JavaScriptAdapter();
    expect(adapter).toBeDefined();
  });

  it("supports .js and .jsx, not .ts", () => {
    const adapter = new JavaScriptAdapter();
    expect(adapter.supports("a.js")).toBe(true);
    expect(adapter.supports("a.jsx")).toBe(true);
    expect(adapter.supports("a.mjs")).toBe(true);
    expect(adapter.supports("a.cjs")).toBe(true);
    expect(adapter.supports("a.ts")).toBe(false);
  });

  it("yields class AuthService + method login", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("test.js", fixture, ctx);
    expect(result.symbols.some((s) => s.name === "AuthService" && s.kind === "class")).toBe(true);
    expect(result.symbols.some((s) => s.name === "login" && s.kind === "method")).toBe(true);
  });

  it("yields one route POST /login", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("test.js", fixture, ctx);
    expect(result.routes.length).toBe(1);
    expect(result.routes[0]).toEqual(expect.objectContaining({ method: "POST", path: "/login" }));
  });

  it("calls inside class method report enclosing class", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("test.js", fixture, ctx);
    const call = result.calls.find((c) => c.callee.includes("this.repo.find"));
    expect(call).toBeDefined();
    expect(call?.enclosing).toBe("AuthService");
  });

  it("calls inside top-level function report enclosing function", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("test.js", fixture, ctx);
    const call = result.calls.find((c) => c.callee.includes("doSomething"));
    expect(call).toBeDefined();
    expect(call?.enclosing).toBe("someFunc");
  });

  it("module-top-level call reports undefined enclosing", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("test.js", fixture, ctx);
    const call = result.calls.find((c) => c.callee.includes("console.log"));
    expect(call).toBeDefined();
    expect(call?.enclosing).toBeUndefined();
  });

  it("determinism: two parses deep-equal", () => {
    const adapter = new JavaScriptAdapter();
    const r1 = adapter.parse("test.js", fixture, ctx);
    const r2 = adapter.parse("test.js", fixture, ctx);
    expect(r1).toEqual(r2);
  });

  it("empty source yields empty arrays + valid artifact", () => {
    const adapter = new JavaScriptAdapter();
    const result = adapter.parse("empty.js", "", ctx);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.artifact).toBeDefined();
    expect(result.artifact.hash).toBeTruthy();
  });
});
