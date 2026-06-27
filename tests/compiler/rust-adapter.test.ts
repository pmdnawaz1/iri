import { describe, it, expect } from "vitest";
import { RustAdapter } from "@rir/code-compiler";
import type { LanguageAdapter } from "@rir/code-compiler";
import type { CompilationContext } from "@rir/core";

const ctx: CompilationContext = { repositoryRoot: ".", artifacts: [], logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } } };

const fixture = `use std::collections::HashMap;

pub struct UserRepository {
    db: Database,
}

impl UserRepository {
    pub fn find_by_email(&self, email: &str) -> User {
        self.db.query(email)
    }
}

fn main() {
    println!("hello");
}`;

describe("RustAdapter", () => {
  it("is assignable to LanguageAdapter", () => {
    const adapter: LanguageAdapter = new RustAdapter();
    expect(adapter).toBeDefined();
  });

  it("supports .rs, not .ts", () => {
    const adapter = new RustAdapter();
    expect(adapter.supports("a.rs")).toBe(true);
    expect(adapter.supports("a.ts")).toBe(false);
  });

  it("yields pub struct UserRepository + method find_by_email", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("test.rs", fixture, ctx);
    expect(result.symbols.some(s => s.name === "UserRepository" && s.kind === "class")).toBe(true);
    expect(result.symbols.some(s => s.name === "find_by_email" && s.kind === "method")).toBe(true);
  });

  it("imports include std::collections::HashMap", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("test.rs", fixture, ctx);
    expect(result.imports.some(i => i.specifier.includes("std::collections::HashMap"))).toBe(true);
  });

  it("calls include println!", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("test.rs", fixture, ctx);
    expect(result.calls.some(c => c.callee.includes("println"))).toBe(true);
  });

  it("determinism: two parses deep-equal", () => {
    const adapter = new RustAdapter();
    const r1 = adapter.parse("test.rs", fixture, ctx);
    const r2 = adapter.parse("test.rs", fixture, ctx);
    expect(r1).toEqual(r2);
  });

  it("empty source yields empty arrays + valid artifact", () => {
    const adapter = new RustAdapter();
    const result = adapter.parse("empty.rs", "", ctx);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.artifact).toBeDefined();
    expect(result.artifact.hash).toBeTruthy();
  });
});
