import { describe, it, expect } from "vitest";
import { JavaAdapter } from "@rir/code-compiler";
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
const fixture = `import com.app.UserRepository;public class AuthService {    private UserRepository repo;    public void login(String email) {        repo.findByEmail(email);    }}`;
const fixtureNoClass = `System.out.println("hello");`;
describe("JavaAdapter", () => {
  it("is assignable to LanguageAdapter", () => {
    const adapter: LanguageAdapter = new JavaAdapter();
    expect(adapter).toBeDefined();
  });
  it("supports .java, not .ts", () => {
    const adapter = new JavaAdapter();
    expect(adapter.supports("a.java")).toBe(true);
    expect(adapter.supports("a.ts")).toBe(false);
  });
  it("yields public class AuthService + method login", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("test.java", fixture, ctx);
    expect(result.symbols.some((s) => s.name === "AuthService" && s.kind === "class")).toBe(true);
    expect(result.symbols.some((s) => s.name === "login" && s.kind === "method")).toBe(true);
  });
  it("imports include com.app.UserRepository", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("test.java", fixture, ctx);
    expect(result.imports.some((i) => i.specifier.includes("com.app.UserRepository"))).toBe(true);
  });
  it("calls include repo.findByEmail and have enclosing class", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("test.java", fixture, ctx);
    const call = result.calls.find((c) => c.callee.includes("repo.findByEmail"));
    expect(call).toBeDefined();
    expect(call?.enclosing).toBe("AuthService");
  });
  it("call not inside class reports undefined enclosing", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("test.java", fixtureNoClass, ctx);
    const call = result.calls.find((c) => c.callee.includes("System.out.println"));
    expect(call).toBeDefined();
    expect(call?.enclosing).toBeUndefined();
  });
  it("determinism: two parses deep-equal", () => {
    const adapter = new JavaAdapter();
    const r1 = adapter.parse("test.java", fixture, ctx);
    const r2 = adapter.parse("test.java", fixture, ctx);
    expect(r1).toEqual(r2);
  });
  it("empty source yields empty arrays + valid artifact", () => {
    const adapter = new JavaAdapter();
    const result = adapter.parse("empty.java", "", ctx);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.artifact).toBeDefined();
    expect(result.artifact.hash).toBeTruthy();
  });
});
