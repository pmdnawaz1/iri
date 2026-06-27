import { describe, it, expect } from "vitest";
import { GoAdapter } from "@rir/code-compiler";
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
const fixture = `package main

import "fmt"

type UserRepository struct {
	db *Database
}

func (r *UserRepository) FindByEmail(email string) *User {
	return r.db.Query(email)
}

func main() {
	fmt.Println("hello")
}
`;
describe("GoAdapter", () => {
  it("is assignable to LanguageAdapter", () => {
    const adapter: LanguageAdapter = new GoAdapter();
    expect(adapter).toBeDefined();
  });
  it("supports .go, not .ts", () => {
    const adapter = new GoAdapter();
    expect(adapter.supports("a.go")).toBe(true);
    expect(adapter.supports("a.ts")).toBe(false);
  });
  it("yields struct UserRepository + method FindByEmail", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("test.go", fixture, ctx);
    expect(result.symbols.some((s) => s.name === "UserRepository" && s.kind === "class")).toBe(true);
    expect(result.symbols.some((s) => s.name === "FindByEmail" && s.kind === "method")).toBe(true);
  });
  it("imports include fmt", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("test.go", fixture, ctx);
    expect(result.imports.some((i) => i.specifier === "fmt")).toBe(true);
  });
  it("calls include fmt.Println", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("test.go", fixture, ctx);
    expect(result.calls.some((c) => c.callee.includes("fmt.Println"))).toBe(true);
  });
  it("determinism: two parses deep-equal", () => {
    const adapter = new GoAdapter();
    const r1 = adapter.parse("test.go", fixture, ctx);
    const r2 = adapter.parse("test.go", fixture, ctx);
    expect(r1).toEqual(r2);
  });
  it("empty source yields empty arrays + valid artifact", () => {
    const adapter = new GoAdapter();
    const result = adapter.parse("empty.go", "", ctx);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.artifact).toBeDefined();
    expect(result.artifact.hash).toBeTruthy();
  });
});
